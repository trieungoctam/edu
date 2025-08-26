/**
 * Integration tests for the nudge system
 * Tests the complete nudge workflow with actual timers
 */

const NudgeService = require('../services/NudgeService');
const SessionManager = require('../services/SessionManager');

// Mock the database models to avoid actual database operations
jest.mock('../models/Session');
jest.mock('../services/GeminiChatService');

describe('Nudge System Integration', () => {
  let nudgeService;
  let sessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create real instances for integration testing
    sessionManager = new SessionManager();
    nudgeService = new NudgeService();
    
    // Mock database operations
    const mockSession = {
      sessionId: 'integration-test-session',
      userId: 'test-user',
      firstName: 'Test',
      currentState: 'major',
      userData: { major: 'CNTT' },
      isCompleted: false,
      save: jest.fn().mockResolvedValue(true),
      conversationHistory: []
    };

    // Mock Session model methods
    require('../models/Session').mockImplementation(() => mockSession);
    require('../models/Session').findOne = jest.fn().mockResolvedValue(mockSession);
    require('../models/Session').findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);
    require('../models/Session').deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
  });

  afterEach(() => {
    // Clean up any timers
    if (nudgeService && nudgeService.sessionManager) {
      nudgeService.sessionManager.clearAllNudgeTimers();
      nudgeService.sessionManager.stopCleanupInterval();
    }
    if (sessionManager) {
      sessionManager.clearAllNudgeTimers();
      sessionManager.stopCleanupInterval();
    }
  });

  describe('Timer Integration', () => {
    it('should start and clear nudge timer properly', async () => {
      const sessionId = 'integration-test-session';
      
      // Start nudge timer
      await nudgeService.startNudgeTimer(sessionId);
      
      // Verify timer is active
      const stats = nudgeService.getNudgeStats();
      expect(stats.activeNudgeTimers).toBe(1);
      
      // Clear timer
      nudgeService.clearNudgeTimer(sessionId);
      
      // Verify timer is cleared
      const statsAfter = nudgeService.getNudgeStats();
      expect(statsAfter.activeNudgeTimers).toBe(0);
    });

    it('should reset timer on user activity', async () => {
      const sessionId = 'integration-test-session';
      
      // Start initial timer
      await nudgeService.startNudgeTimer(sessionId);
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(1);
      
      // Simulate user activity
      await nudgeService.onUserActivity(sessionId);
      
      // Timer should still be active (reset, not cleared)
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(1);
    });

    it('should clear timer when session completes', () => {
      const sessionId = 'integration-test-session';
      
      // Start timer
      nudgeService.startNudgeTimer(sessionId);
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(1);
      
      // Complete session
      nudgeService.onSessionComplete(sessionId);
      
      // Timer should be cleared
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(0);
    });
  });

  describe('Nudge Workflow Integration', () => {
    it('should handle complete nudge workflow', async () => {
      const sessionId = 'integration-test-session';
      
      // 1. Start nudge timer
      await nudgeService.startNudgeTimer(sessionId);
      
      // 2. Trigger nudge (simulating timeout)
      const nudgeResult = await nudgeService.triggerNudge(sessionId);
      expect(nudgeResult).toBeDefined();
      expect(nudgeResult.state).toBe('nudge');
      expect(nudgeResult.message).toContain('brochure');
      
      // 3. Handle positive response
      const response = await nudgeService.handleNudgeResponse(sessionId, 'Có, giữ giúp mình');
      expect(response.success).toBe(true);
      expect(response.continued).toBe(true);
      
      // 4. Verify new timer is started after positive response
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(1);
    });

    it('should handle nudge decline workflow', async () => {
      const sessionId = 'integration-test-session';
      
      // Mock completed session for decline scenario
      const completedSession = {
        sessionId,
        currentState: 'complete',
        isCompleted: true,
        userData: { major: 'CNTT' }
      };
      
      require('../models/Session').findOne.mockResolvedValue(completedSession);
      require('../models/Session').findOneAndUpdate.mockResolvedValue(completedSession);
      
      // 1. Trigger nudge
      const nudgeResult = await nudgeService.triggerNudge(sessionId);
      
      // Should not trigger for completed session
      expect(nudgeResult).toBeUndefined();
    });
  });

  describe('Timer Conditions', () => {
    it('should not start timer for completed sessions', async () => {
      const completedSession = {
        sessionId: 'completed-session',
        isCompleted: true,
        currentState: 'complete'
      };
      
      require('../models/Session').findOne.mockResolvedValue(completedSession);
      
      await nudgeService.onUserActivity('completed-session');
      
      // No timer should be active
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(0);
    });

    it('should not start timer for sessions in nudge state', async () => {
      const nudgeSession = {
        sessionId: 'nudge-session',
        isCompleted: false,
        currentState: 'nudge'
      };
      
      require('../models/Session').findOne.mockResolvedValue(nudgeSession);
      
      await nudgeService.onUserActivity('nudge-session');
      
      // No timer should be active
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(0);
    });

    it('should start timer for active sessions in valid states', async () => {
      const activeSession = {
        sessionId: 'active-session',
        isCompleted: false,
        currentState: 'phone'
      };
      
      require('../models/Session').findOne.mockResolvedValue(activeSession);
      
      await nudgeService.onUserActivity('active-session');
      
      // Timer should be active
      expect(nudgeService.getNudgeStats().activeNudgeTimers).toBe(1);
    });
  });

  describe('Message Generation Integration', () => {
    it('should generate contextual continuation messages', () => {
      const testCases = [
        { state: 'major', expectedContent: 'ngành nào' },
        { state: 'phone', expectedContent: 'số điện thoại' },
        { state: 'channel', expectedContent: 'Gọi hay Zalo' },
        { state: 'timeslot', expectedContent: 'thuận tiện' }
      ];

      testCases.forEach(({ state, expectedContent }) => {
        const session = { currentState: state, userData: {} };
        const message = nudgeService.generateContinuationMessage(session);
        expect(message.toLowerCase()).toContain(expectedContent.toLowerCase());
      });
    });

    it('should generate personalized completion messages', () => {
      const session = { 
        firstName: 'Minh',
        userData: { major: 'CNTT' }
      };
      
      const message = nudgeService.generateCompletionMessage(session);
      expect(message).toContain('Minh');
      expect(message).toContain('1900 6929');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle session not found gracefully', async () => {
      require('../models/Session').findOne.mockResolvedValue(null);
      
      const result = await nudgeService.triggerNudge('non-existent-session');
      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      require('../models/Session').findOne.mockRejectedValue(new Error('Database error'));
      
      await expect(nudgeService.triggerNudge('error-session')).rejects.toThrow('Failed to trigger nudge');
    });
  });
});