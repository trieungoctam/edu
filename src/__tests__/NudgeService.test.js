const NudgeService = require('../services/NudgeService');
const SessionManager = require('../services/SessionManager');
const ConversationFlow = require('../services/ConversationFlow');
const Session = require('../models/Session');

// Mock dependencies
jest.mock('../services/SessionManager');
jest.mock('../services/ConversationFlow');
jest.mock('../services/GeminiChatService');
jest.mock('../models/Session');

describe('NudgeService', () => {
  let nudgeService;
  let mockSessionManager;
  let mockConversationFlow;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockSessionManager = {
      getSession: jest.fn(),
      startNudgeTimer: jest.fn(),
      resetNudgeTimer: jest.fn(),
      clearNudgeTimer: jest.fn(),
      addMessage: jest.fn(),
      handleNudgeResponse: jest.fn(),
      getActiveNudgeTimersCount: jest.fn(),
      nudgeTimeout: 120000 // 2 minutes
    };

    mockConversationFlow = {
      generateMessage: jest.fn(),
      getQuickReplies: jest.fn(),
      processInput: jest.fn()
    };

    // Mock the constructors
    SessionManager.mockImplementation(() => mockSessionManager);
    ConversationFlow.mockImplementation(() => mockConversationFlow);

    nudgeService = new NudgeService();
  });

  describe('startNudgeTimer', () => {
    it('should start nudge timer for a session', async () => {
      const sessionId = 'test-session-123';

      await nudgeService.startNudgeTimer(sessionId);

      expect(mockSessionManager.startNudgeTimer).toHaveBeenCalledWith(
        sessionId,
        expect.any(Function)
      );
    });

    it('should handle errors when starting nudge timer', async () => {
      const sessionId = 'test-session-123';
      mockSessionManager.startNudgeTimer.mockImplementation(() => {
        throw new Error('Timer error');
      });

      await expect(nudgeService.startNudgeTimer(sessionId)).rejects.toThrow('Failed to start nudge timer: Timer error');
    });
  });

  describe('resetNudgeTimer', () => {
    it('should reset nudge timer for active session', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        sessionId,
        isCompleted: false,
        currentState: 'major'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);

      await nudgeService.resetNudgeTimer(sessionId);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockSessionManager.resetNudgeTimer).toHaveBeenCalledWith(
        sessionId,
        expect.any(Function)
      );
    });

    it('should not reset timer for completed session', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        sessionId,
        isCompleted: true,
        currentState: 'complete'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);

      await nudgeService.resetNudgeTimer(sessionId);

      expect(mockSessionManager.resetNudgeTimer).not.toHaveBeenCalled();
    });

    it('should not reset timer for non-existent session', async () => {
      const sessionId = 'test-session-123';
      mockSessionManager.getSession.mockResolvedValue(null);

      await nudgeService.resetNudgeTimer(sessionId);

      expect(mockSessionManager.resetNudgeTimer).not.toHaveBeenCalled();
    });
  });

  describe('clearNudgeTimer', () => {
    it('should clear nudge timer for a session', () => {
      const sessionId = 'test-session-123';

      nudgeService.clearNudgeTimer(sessionId);

      expect(mockSessionManager.clearNudgeTimer).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('triggerNudge', () => {
    it('should trigger nudge message for active session', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        sessionId,
        isCompleted: false,
        currentState: 'major',
        userData: { major: 'CNTT' }
      };

      const nudgeMessage = 'Bạn còn muốn nhận brochure + học bổng ngành CNTT không?';
      const quickReplies = ['Có, giữ giúp mình', 'Để sau'];

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.generateMessage.mockReturnValue(nudgeMessage);
      mockConversationFlow.getQuickReplies.mockReturnValue(quickReplies);
      mockSessionManager.addMessage.mockResolvedValue(mockSession);

      const result = await nudgeService.triggerNudge(sessionId);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockConversationFlow.generateMessage).toHaveBeenCalledWith('nudge', mockSession.userData);
      expect(mockConversationFlow.getQuickReplies).toHaveBeenCalledWith('nudge');
      expect(mockSessionManager.addMessage).toHaveBeenCalledWith(
        sessionId,
        'assistant',
        nudgeMessage,
        quickReplies
      );

      expect(result).toEqual({
        sessionId,
        message: nudgeMessage,
        quickReplies,
        state: 'nudge'
      });
    });

    it('should not trigger nudge for completed session', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        sessionId,
        isCompleted: true,
        currentState: 'complete'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);

      const result = await nudgeService.triggerNudge(sessionId);

      expect(result).toBeUndefined();
      expect(mockConversationFlow.generateMessage).not.toHaveBeenCalled();
      expect(mockSessionManager.addMessage).not.toHaveBeenCalled();
    });

    it('should handle non-existent session', async () => {
      const sessionId = 'test-session-123';
      mockSessionManager.getSession.mockResolvedValue(null);

      const result = await nudgeService.triggerNudge(sessionId);

      expect(result).toBeUndefined();
    });
  });

  describe('handleNudgeResponse', () => {
    it('should handle positive nudge response (continue conversation)', async () => {
      const sessionId = 'test-session-123';
      const userResponse = 'Có, giữ giúp mình';
      const mockSession = {
        sessionId,
        currentState: 'nudge',
        userData: { major: 'CNTT' }
      };
      const updatedSession = {
        ...mockSession,
        currentState: 'phone'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.processInput.mockReturnValue({
        success: true,
        nextState: 'phone'
      });
      mockSessionManager.handleNudgeResponse.mockResolvedValue(updatedSession);
      mockSessionManager.addMessage.mockResolvedValue(updatedSession);
      mockConversationFlow.getQuickReplies.mockReturnValue([]);

      // Mock startNudgeTimer to avoid actual timer
      jest.spyOn(nudgeService, 'startNudgeTimer').mockResolvedValue();

      const result = await nudgeService.handleNudgeResponse(sessionId, userResponse);

      expect(mockConversationFlow.processInput).toHaveBeenCalledWith('nudge', userResponse, mockSession.userData);
      expect(mockSessionManager.handleNudgeResponse).toHaveBeenCalledWith(sessionId, userResponse);
      expect(mockSessionManager.addMessage).toHaveBeenCalledWith(sessionId, 'user', userResponse);
      expect(nudgeService.startNudgeTimer).toHaveBeenCalledWith(sessionId);

      expect(result.success).toBe(true);
      expect(result.continued).toBe(true);
      expect(result.state).toBe('phone');
    });

    it('should handle negative nudge response (end conversation)', async () => {
      const sessionId = 'test-session-123';
      const userResponse = 'Để sau';
      const mockSession = {
        sessionId,
        currentState: 'nudge',
        userData: { major: 'CNTT' }
      };
      const updatedSession = {
        ...mockSession,
        currentState: 'complete',
        isCompleted: true
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.processInput.mockReturnValue({
        success: true,
        nextState: 'complete'
      });
      mockSessionManager.handleNudgeResponse.mockResolvedValue(updatedSession);
      mockSessionManager.addMessage.mockResolvedValue(updatedSession);

      const result = await nudgeService.handleNudgeResponse(sessionId, userResponse);

      expect(result.success).toBe(true);
      expect(result.continued).toBe(false);
      expect(result.state).toBe('complete');
    });

    it('should handle invalid nudge response', async () => {
      const sessionId = 'test-session-123';
      const userResponse = 'invalid response';
      const mockSession = {
        sessionId,
        currentState: 'nudge',
        userData: {}
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.processInput.mockReturnValue({
        success: false,
        error: 'Invalid response'
      });
      mockConversationFlow.getQuickReplies.mockReturnValue(['Có, giữ giúp mình', 'Để sau']);

      const result = await nudgeService.handleNudgeResponse(sessionId, userResponse);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid response');
      expect(result.state).toBe('nudge');
    });
  });

  describe('shouldHaveNudgeTimer', () => {
    it('should return true for active sessions in valid states', () => {
      const session = {
        isCompleted: false,
        currentState: 'major'
      };

      const result = nudgeService.shouldHaveNudgeTimer(session);
      expect(result).toBe(true);
    });

    it('should return false for completed sessions', () => {
      const session = {
        isCompleted: true,
        currentState: 'complete'
      };

      const result = nudgeService.shouldHaveNudgeTimer(session);
      expect(result).toBe(false);
    });

    it('should return false for sessions in complete state', () => {
      const session = {
        isCompleted: false,
        currentState: 'complete'
      };

      const result = nudgeService.shouldHaveNudgeTimer(session);
      expect(result).toBe(false);
    });

    it('should return false for sessions in nudge state', () => {
      const session = {
        isCompleted: false,
        currentState: 'nudge'
      };

      const result = nudgeService.shouldHaveNudgeTimer(session);
      expect(result).toBe(false);
    });

    it('should return false for null session', () => {
      const result = nudgeService.shouldHaveNudgeTimer(null);
      expect(result).toBe(false);
    });
  });

  describe('generateContinuationMessage', () => {
    it('should generate appropriate message for major state', () => {
      const session = { currentState: 'major', userData: {} };
      const message = nudgeService.generateContinuationMessage(session);
      expect(message).toContain('ngành nào của HSU');
    });

    it('should generate appropriate message for phone state', () => {
      const session = { currentState: 'phone', userData: {} };
      const message = nudgeService.generateContinuationMessage(session);
      expect(message).toContain('số điện thoại');
    });

    it('should generate appropriate message for channel state', () => {
      const session = { currentState: 'channel', userData: {} };
      const message = nudgeService.generateContinuationMessage(session);
      expect(message).toContain('Gọi hay Zalo');
    });

    it('should generate default message for unknown state', () => {
      const session = { currentState: 'unknown', userData: {} };
      const message = nudgeService.generateContinuationMessage(session);
      expect(message).toContain('Chúng ta tiếp tục nhé');
    });
  });

  describe('generateCompletionMessage', () => {
    it('should generate completion message with first name', () => {
      const session = { 
        firstName: 'Minh',
        userData: {} 
      };
      const message = nudgeService.generateCompletionMessage(session);
      expect(message).toContain('Cảm ơn Minh');
      expect(message).toContain('1900 6929');
    });

    it('should generate completion message with default name', () => {
      const session = { userData: {} };
      const message = nudgeService.generateCompletionMessage(session);
      expect(message).toContain('Cảm ơn bạn');
    });
  });

  describe('onUserActivity', () => {
    it('should reset timer for sessions that should have nudge timer', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        isCompleted: false,
        currentState: 'major'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      jest.spyOn(nudgeService, 'resetNudgeTimer').mockResolvedValue();

      await nudgeService.onUserActivity(sessionId);

      expect(nudgeService.resetNudgeTimer).toHaveBeenCalledWith(sessionId);
    });

    it('should clear timer for sessions that should not have nudge timer', async () => {
      const sessionId = 'test-session-123';
      const mockSession = {
        isCompleted: true,
        currentState: 'complete'
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      jest.spyOn(nudgeService, 'clearNudgeTimer').mockImplementation();

      await nudgeService.onUserActivity(sessionId);

      expect(nudgeService.clearNudgeTimer).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('onSessionComplete', () => {
    it('should clear nudge timer when session completes', () => {
      const sessionId = 'test-session-123';
      jest.spyOn(nudgeService, 'clearNudgeTimer').mockImplementation();

      nudgeService.onSessionComplete(sessionId);

      expect(nudgeService.clearNudgeTimer).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('getNudgeStats', () => {
    it('should return nudge statistics', () => {
      mockSessionManager.getActiveNudgeTimersCount.mockReturnValue(5);

      const stats = nudgeService.getNudgeStats();

      expect(stats).toEqual({
        activeNudgeTimers: 5,
        nudgeTimeout: 120 // 2 minutes in seconds
      });
    });
  });
});