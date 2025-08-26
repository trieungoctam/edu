const express = require('express');
const router = express.Router();
const SessionManager = require('../services/SessionManager');
const GeminiChatService = require('../services/GeminiChatService');
const ConversationFlow = require('../services/ConversationFlow');
const LeadService = require('../services/LeadService');
const ErrorHandler = require('../middleware/errorHandler');
const ValidationMiddleware = require('../middleware/validation');

// Initialize services
const sessionManager = new SessionManager();
const geminiService = new GeminiChatService();
const conversationFlow = new ConversationFlow();
const leadService = new LeadService();
const validator = new ValidationMiddleware();

// Helper: prioritize LLM for conversational states; keep strict prompts for input/validation states
const shouldUseAIForNext = (nextState) => {
  const aiPriorityStates = ['welcome', 'major', 'major_other', 'custom_time', 'nudge'];
  return aiPriorityStates.includes(nextState);
};

// Use validation middleware from the ValidationMiddleware class

// Middleware: auto-create session if missing sessionId
const ensureSessionId = ErrorHandler.asyncHandler(async (req, res, next) => {
  if (!req.body || !req.body.sessionId) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const firstName = (req.body && req.body.firstName) ? req.body.firstName : 'Bạn';
    const session = await sessionManager.createSession(userId, firstName);
    req.body = req.body || {};
    req.body.sessionId = session.sessionId;
  }
  next();
});

// POST /api/chat/message - Process user messages
router.post('/message', ensureSessionId, validator.validateMessageRequest, ErrorHandler.asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
    
    // Get current session
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found'
        }
      });
    }
    
    // Add user message to conversation history
    await sessionManager.addMessage(sessionId, 'user', message);
    
    // Process message through conversation flow
    const flowResult = conversationFlow.processInput(
      session.currentState, 
      message, 
      { ...session.userData }
    );
    
    let botResponse;
    let quickReplies = [];
    let replies = [];
    let nextState = session.currentState;
    
    if (!flowResult.success) {
      // Validation failed, use error message
      botResponse = flowResult.message || flowResult.error;
      quickReplies = conversationFlow.getQuickReplies(session.currentState);
      nextState = flowResult.nextState || session.currentState;
    } else {
      // Process successful, determine if we need AI or predefined response
      nextState = flowResult.nextState;
      
      // Update user data if provided
      if (flowResult.userData) {
        await sessionManager.updateUserData(sessionId, flowResult.userData);
      }
      
      // Prefer AI for conversational states; enforce scripted prompts only where user must input structured data
      const useAI = shouldUseAIForNext(nextState);
      
      if (useAI) {
        // Use Gemini AI for response with graceful fallback
        try {
          const aiResponse = await geminiService.processMessage(
            sessionId,
            message,
            {
              currentStep: session.currentState,
              userData: flowResult.userData || session.userData,
              conversationHistory: session.conversationHistory
            }
          );
          botResponse = aiResponse.reply;
          // Always drive next step choices from flow
          quickReplies = conversationFlow.getQuickReplies(nextState);
        } catch (error) {
          // Graceful fallback: use predefined flow message instead of erroring
          botResponse = conversationFlow.generateMessage(nextState, flowResult.userData || session.userData);
          quickReplies = conversationFlow.getQuickReplies(nextState);
        }
      } else {
        // Use predefined flow response and enrich with major info where relevant
        botResponse = conversationFlow.generateMessage(nextState, flowResult.userData || session.userData);
        if (nextState === 'phone') {
          const majorInfo = conversationFlow.getMajorInfo((flowResult.userData || session.userData).major);
          botResponse = `${majorInfo}\n\n${botResponse}`;
        }
        quickReplies = conversationFlow.getQuickReplies(nextState);
      }

      // Split long response into two consecutive messages when advising about majors or when text is long
      const splitByParagraph = (text) => {
        const parts = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return [parts[0], parts.slice(1).join('\n\n')];
        }
        return [text];
      };

      const MAX_LEN = 300;
      const ensureTwoParts = (text) => {
        const parts = splitByParagraph(text);
        if (parts.length === 1 && text.length > MAX_LEN) {
          return [text.slice(0, MAX_LEN).trim(), text.slice(MAX_LEN).trim()];
        }
        return parts;
      };

      const parts = ensureTwoParts(botResponse).slice(0, 2);
      replies = parts;
    }
    
    // Update session state if it changed
    if (nextState !== session.currentState) {
      await sessionManager.updateSessionState(sessionId, nextState);
    }
    
    // Add bot response(s) to conversation history
    if (replies.length > 1) {
      // First part without quick replies
      await sessionManager.addMessage(sessionId, 'assistant', replies[0], []);
      // Second part carries quick replies (if any)
      await sessionManager.addMessage(sessionId, 'assistant', replies[1], quickReplies);
    } else {
      await sessionManager.addMessage(sessionId, 'assistant', (replies[0] || botResponse), quickReplies);
    }
    
    // Check if conversation is complete
    const isComplete = conversationFlow.isConversationComplete(nextState);
    if (isComplete) {
      await sessionManager.completeSession(sessionId);
      sessionManager.clearNudgeTimer(sessionId);
    } else {
      // Schedule nudge (B7) after inactivity ~2 minutes
      sessionManager.resetNudgeTimer(sessionId, async (sid) => {
        try {
          const sess = await sessionManager.getSession(sid);
          if (!sess) return;
          const nudgeMsg = conversationFlow.generateMessage('nudge', { 
            major: sess.userData?.major || ''
          });
          const nudgeQuick = conversationFlow.getQuickReplies('nudge');
          await sessionManager.addMessage(sid, 'assistant', nudgeMsg, nudgeQuick);
        } catch (e) {
          console.error('Failed to send nudge:', e);
        }
      });
    }
    
    // Auto-create lead on completion (B6)
    if (isComplete) {
      try {
        await leadService.createLead({
          sessionId: session.sessionId,
          firstName: session.firstName,
          userData: session.userData,
          status: 'new'
        });
      } catch (e) {
        console.error('Failed to create lead on completion:', e);
      }
    }

    // Frontend expects flat response
    res.json({
      reply: (replies[replies.length - 1] || botResponse),
      replies: replies,
      nextState: nextState,
      quickReplies
    });
}));

// POST /api/chat/session - Create new conversation session
router.post('/session', validator.validateSessionRequest, ErrorHandler.asyncHandler(async (req, res) => {
  const { firstName } = req.body;
    
    // Generate a simple user ID (could be enhanced later)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new session
    const session = await sessionManager.createSession(userId, firstName);
    
    // Get welcome message from conversation flow
    const welcomeMessage = conversationFlow.generateMessage('welcome', { first_name: firstName });
    const quickReplies = conversationFlow.getQuickReplies('welcome');
    
    // Add welcome message to conversation history
    await sessionManager.addMessage(
      session.sessionId, 
      'assistant', 
      welcomeMessage, 
      quickReplies
    );
    
    // Frontend expects flat fields
    res.status(201).json({
      sessionId: session.sessionId,
      welcomeMessage,
      quickReplies,
      currentState: session.currentState
    });
}));

// GET /api/chat/session/:id - Retrieve session data
router.get('/session/:id', ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate session ID parameter
  const sessionValidation = validator.validateSessionId(id);
  if (!sessionValidation.isValid) {
    return res.status(400).json(
      ErrorHandler.handleValidationError('sessionId', id, sessionValidation.error)
    );
  }
    
  const session = await sessionManager.getSession(sessionValidation.sanitized);
  
  if (!session) {
    return res.status(404).json(
      ErrorHandler.formatError('SESSION_NOT_FOUND', 'Không tìm thấy phiên trò chuyện')
    );
  }
    
  // Return session data without sensitive information
  res.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      firstName: session.firstName,
      currentState: session.currentState,
      conversationHistory: session.conversationHistory,
      isCompleted: session.isCompleted,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }
  });
}));

module.exports = router;