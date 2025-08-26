const SessionManager = require('./SessionManager');
const ConversationFlow = require('./ConversationFlow');
const GeminiChatService = require('./GeminiChatService');

/**
 * NudgeService - Handles nudge functionality for inactive users
 * Manages nudge timers, triggers, and responses
 */
class NudgeService {
  constructor() {
    this.sessionManager = new SessionManager();
    this.conversationFlow = new ConversationFlow();
    this.geminiChatService = new GeminiChatService();
  }

  /**
   * Start nudge timer for a session
   * @param {string} sessionId - Session identifier
   */
  async startNudgeTimer(sessionId) {
    try {
      // Create nudge callback function
      const nudgeCallback = async (sessionId) => {
        await this.triggerNudge(sessionId);
      };

      // Start the timer using SessionManager
      this.sessionManager.startNudgeTimer(sessionId, nudgeCallback);
      
      console.log(`Nudge timer started for session: ${sessionId}`);
    } catch (error) {
      console.error('Error starting nudge timer:', error);
      throw new Error(`Failed to start nudge timer: ${error.message}`);
    }
  }

  /**
   * Reset nudge timer when user is active
   * @param {string} sessionId - Session identifier
   */
  async resetNudgeTimer(sessionId) {
    try {
      // Check if session exists and is not completed
      const session = await this.sessionManager.getSession(sessionId);
      if (!session || session.isCompleted || session.currentState === 'complete') {
        return;
      }

      // Create nudge callback function
      const nudgeCallback = async (sessionId) => {
        await this.triggerNudge(sessionId);
      };

      // Reset the timer using SessionManager
      this.sessionManager.resetNudgeTimer(sessionId, nudgeCallback);
      
      console.log(`Nudge timer reset for session: ${sessionId}`);
    } catch (error) {
      console.error('Error resetting nudge timer:', error);
    }
  }

  /**
   * Clear nudge timer for a session
   * @param {string} sessionId - Session identifier
   */
  clearNudgeTimer(sessionId) {
    try {
      this.sessionManager.clearNudgeTimer(sessionId);
      console.log(`Nudge timer cleared for session: ${sessionId}`);
    } catch (error) {
      console.error('Error clearing nudge timer:', error);
    }
  }

  /**
   * Trigger nudge message for inactive user
   * @param {string} sessionId - Session identifier
   */
  async triggerNudge(sessionId) {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        console.warn(`Session not found for nudge: ${sessionId}`);
        return;
      }

      // Don't nudge if conversation is already complete
      if (session.isCompleted || session.currentState === 'complete') {
        console.log(`Session already complete, skipping nudge: ${sessionId}`);
        return;
      }

      // Generate nudge message using conversation flow
      const nudgeMessage = this.conversationFlow.generateMessage('nudge', session.userData);
      const quickReplies = this.conversationFlow.getQuickReplies('nudge');

      // Add nudge message to conversation history
      await this.sessionManager.addMessage(sessionId, 'assistant', nudgeMessage, quickReplies);

      console.log(`Nudge message sent for session: ${sessionId}`);

      // Return nudge data for potential API response
      return {
        sessionId,
        message: nudgeMessage,
        quickReplies,
        state: 'nudge'
      };
    } catch (error) {
      console.error('Error triggering nudge:', error);
      throw new Error(`Failed to trigger nudge: ${error.message}`);
    }
  }

  /**
   * Handle user response to nudge message
   * @param {string} sessionId - Session identifier
   * @param {string} userResponse - User's response to nudge
   * @returns {Promise<Object>} Response data
   */
  async handleNudgeResponse(sessionId, userResponse) {
    try {
      // Process the nudge response using conversation flow
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Validate nudge response
      const flowResult = this.conversationFlow.processInput('nudge', userResponse, session.userData);
      
      if (!flowResult.success) {
        return {
          success: false,
          message: flowResult.message || flowResult.error,
          quickReplies: this.conversationFlow.getQuickReplies('nudge'),
          state: 'nudge'
        };
      }

      // Handle the response using SessionManager
      const updatedSession = await this.sessionManager.handleNudgeResponse(sessionId, userResponse);
      
      if (!updatedSession) {
        throw new Error('Failed to update session after nudge response');
      }

      // Add user message to conversation history
      await this.sessionManager.addMessage(sessionId, 'user', userResponse);

      // Determine response based on user's choice
      const wantsToContinue = userResponse.toLowerCase().includes('có') || 
                             userResponse === 'Có, giữ giúp mình';

      if (wantsToContinue) {
        // User wants to continue - generate appropriate response
        const nextMessage = this.generateContinuationMessage(updatedSession);
        const quickReplies = this.conversationFlow.getQuickReplies(updatedSession.currentState);

        // Add assistant response
        await this.sessionManager.addMessage(sessionId, 'assistant', nextMessage, quickReplies);

        // Restart nudge timer for continued conversation
        await this.startNudgeTimer(sessionId);

        return {
          success: true,
          message: nextMessage,
          quickReplies,
          state: updatedSession.currentState,
          continued: true
        };
      } else {
        // User doesn't want to continue - send completion message
        const completionMessage = this.generateCompletionMessage(updatedSession);
        
        // Add completion message
        await this.sessionManager.addMessage(sessionId, 'assistant', completionMessage);

        return {
          success: true,
          message: completionMessage,
          quickReplies: [],
          state: 'complete',
          continued: false
        };
      }
    } catch (error) {
      console.error('Error handling nudge response:', error);
      throw new Error(`Failed to handle nudge response: ${error.message}`);
    }
  }

  /**
   * Generate continuation message when user wants to resume
   * @param {Object} session - Session object
   * @returns {string} Continuation message
   */
  generateContinuationMessage(session) {
    const userData = session.userData || {};
    
    switch (session.currentState) {
      case 'major':
        return "Tuyệt vời! Bạn đang quan tâm ngành nào của HSU?";
      case 'phone':
        return "Để gửi brochure + học phí + suất học bổng phù hợp, mình xin số điện thoại của bạn được không? 📱";
      case 'channel':
        return `Cảm ơn bạn! Bạn muốn tư vấn qua Gọi hay Zalo?`;
      case 'timeslot':
        return "Bạn muốn được liên hệ lúc nào thuận tiện nhất?";
      case 'custom_time':
        return "Bạn gõ khung giờ thuận tiện giúp mình nhé (ví dụ: Sáng mai 9h, Chiều thứ 3...)";
      default:
        return "Chúng ta tiếp tục nhé! Bạn cần hỗ trợ gì thêm?";
    }
  }

  /**
   * Generate completion message when user doesn't want to continue
   * @param {Object} session - Session object
   * @returns {string} Completion message
   */
  generateCompletionMessage(session) {
    const userData = session.userData || {};
    const firstName = session.firstName || 'bạn';
    
    return `Cảm ơn ${firstName} đã quan tâm đến Đại học Hoa Sen! Nếu bạn thay đổi ý định, hãy liên hệ với chúng tôi qua hotline 1900 6929. Chúc bạn một ngày tốt lành! 🎓`;
  }

  /**
   * Check if session should have nudge timer
   * @param {Object} session - Session object
   * @returns {boolean} True if session should have nudge timer
   */
  shouldHaveNudgeTimer(session) {
    if (!session || session.isCompleted) {
      return false;
    }

    // Don't set nudge timer for complete or nudge states
    const excludedStates = ['complete', 'nudge'];
    return !excludedStates.includes(session.currentState);
  }

  /**
   * Get nudge statistics
   * @returns {Object} Nudge statistics
   */
  getNudgeStats() {
    return {
      activeNudgeTimers: this.sessionManager.getActiveNudgeTimersCount(),
      nudgeTimeout: this.sessionManager.nudgeTimeout / 1000 // in seconds
    };
  }

  /**
   * Handle user activity (reset nudge timer)
   * @param {string} sessionId - Session identifier
   */
  async onUserActivity(sessionId) {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      // Only reset timer if session should have one
      if (this.shouldHaveNudgeTimer(session)) {
        await this.resetNudgeTimer(sessionId);
      } else {
        // Clear timer if session shouldn't have one
        this.clearNudgeTimer(sessionId);
      }
    } catch (error) {
      console.error('Error handling user activity:', error);
    }
  }

  /**
   * Handle session completion (clear nudge timer)
   * @param {string} sessionId - Session identifier
   */
  onSessionComplete(sessionId) {
    this.clearNudgeTimer(sessionId);
  }
}

module.exports = NudgeService;