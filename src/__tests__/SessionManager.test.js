const SessionManager = require('../services/SessionManager');
const Session = require('../models/Session');
const mongoose = require('mongoose');

// Mock the Session model
jest.mock('../models/Session');

describe('SessionManager', () => {
  let sessionManager;
  let mockSession;

  beforeEach(() => {
    sessionManager = new SessionManager();
    
    // Mock session data
    mockSession = {
      sessionId: 'test-session-id',
      userId: 'test-user-id',
      firstName: 'John',
      currentState: 'welcome',
      userData: {},
      conversationHistory: [],
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop cleanup interval to prevent interference
    if (sessionManager.cleanupInterval) {
      sessionManager.stopCleanupInterval();
    }
  });

  describe('createSession', () => {
    test('should create a new session successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockSession);
      Session.mockImplementation(() => ({
        save: mockSave
      }));

      const result = await sessionManager.createSession('test-user-id', 'John');

      expect(result).toEqual(mockSession);
      expect(mockSave).toHaveBeenCalled();
    });

    test('should throw error when session creation fails', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      Session.mockImplementation(() => ({
        save: mockSave
      }));

      await expect(sessionManager.createSession('test-user-id', 'John'))
        .rejects.toThrow('Failed to create session: Database error');
    });
  });

  describe('getSession', () => {
    test('should retrieve session successfully', async () => {
      Session.findOne = jest.fn().mockResolvedValue(mockSession);

      const result = await sessionManager.getSession('test-session-id');

      expect(result).toEqual(mockSession);
      expect(Session.findOne).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
    });

    test('should return null when session not found', async () => {
      Session.findOne = jest.fn().mockResolvedValue(null);

      const result = await sessionManager.getSession('non-existent-id');

      expect(result).toBeNull();
    });

    test('should delete expired session and return null', async () => {
      const expiredSession = {
        ...mockSession,
        updatedAt: new Date(Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
      };
      
      Session.findOne = jest.fn().mockResolvedValue(expiredSession);
      Session.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await sessionManager.getSession('expired-session-id');

      expect(result).toBeNull();
      expect(Session.deleteOne).toHaveBeenCalledWith({ sessionId: 'expired-session-id' });
    });

    test('should throw error when retrieval fails', async () => {
      Session.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(sessionManager.getSession('test-session-id'))
        .rejects.toThrow('Failed to retrieve session: Database error');
    });
  });

  describe('updateSession', () => {
    test('should update session successfully', async () => {
      const updates = { currentState: 'major' };
      const updatedSession = { ...mockSession, ...updates };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);

      const result = await sessionManager.updateSession('test-session-id', updates);

      expect(result).toEqual(updatedSession);
      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'test-session-id' },
        expect.objectContaining(updates),
        { new: true, runValidators: true }
      );
    });

    test('should return null when session not found for update', async () => {
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await sessionManager.updateSession('non-existent-id', {});

      expect(result).toBeNull();
    });

    test('should throw error when update fails', async () => {
      Session.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(sessionManager.updateSession('test-session-id', {}))
        .rejects.toThrow('Failed to update session: Database error');
    });
  });

  describe('addMessage', () => {
    test('should add message to conversation history', async () => {
      const updatedSession = {
        ...mockSession,
        conversationHistory: [{
          role: 'user',
          content: 'Hello',
          timestamp: expect.any(Date),
          quickReplies: []
        }]
      };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);

      const result = await sessionManager.addMessage('test-session-id', 'user', 'Hello');

      expect(result).toEqual(updatedSession);
      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'test-session-id' },
        expect.objectContaining({
          $push: {
            conversationHistory: expect.objectContaining({
              role: 'user',
              content: 'Hello',
              timestamp: expect.any(Date),
              quickReplies: []
            })
          }
        }),
        { new: true, runValidators: true }
      );
    });

    test('should add message with quick replies', async () => {
      const quickReplies = ['Option 1', 'Option 2'];
      const updatedSession = {
        ...mockSession,
        conversationHistory: [{
          role: 'assistant',
          content: 'Choose an option',
          timestamp: expect.any(Date),
          quickReplies
        }]
      };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);

      const result = await sessionManager.addMessage('test-session-id', 'assistant', 'Choose an option', quickReplies);

      expect(result).toEqual(updatedSession);
    });

    test('should return null when session not found for message addition', async () => {
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await sessionManager.addMessage('non-existent-id', 'user', 'Hello');

      expect(result).toBeNull();
    });
  });

  describe('updateUserData', () => {
    test('should update user data successfully', async () => {
      const userData = { major: 'CNTT', phone: '0901234567' };
      const updatedSession = { ...mockSession, userData };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);

      const result = await sessionManager.updateUserData('test-session-id', userData);

      expect(result).toEqual(updatedSession);
      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'test-session-id' },
        expect.objectContaining({
          $set: {
            userData: userData,
            updatedAt: expect.any(Date)
          }
        }),
        { new: true, runValidators: true }
      );
    });
  });

  describe('updateSessionState', () => {
    test('should update session state successfully', async () => {
      const newState = 'major';
      const updatedSession = { ...mockSession, currentState: newState };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);

      const result = await sessionManager.updateSessionState('test-session-id', newState);

      expect(result).toEqual(updatedSession);
      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'test-session-id' },
        expect.objectContaining({
          currentState: newState,
          updatedAt: expect.any(Date)
        }),
        { new: true, runValidators: true }
      );
    });
  });

  describe('completeSession', () => {
    test('should mark session as completed', async () => {
      const completedSession = {
        ...mockSession,
        isCompleted: true,
        currentState: 'complete'
      };
      
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(completedSession);

      const result = await sessionManager.completeSession('test-session-id');

      expect(result).toEqual(completedSession);
      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { sessionId: 'test-session-id' },
        expect.objectContaining({
          isCompleted: true,
          currentState: 'complete',
          updatedAt: expect.any(Date)
        }),
        { new: true, runValidators: true }
      );
    });
  });

  describe('deleteSession', () => {
    test('should delete session successfully', async () => {
      Session.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await sessionManager.deleteSession('test-session-id');

      expect(result).toBe(true);
      expect(Session.deleteOne).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
    });

    test('should return false when session not found for deletion', async () => {
      Session.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      const result = await sessionManager.deleteSession('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('cleanupInactiveSessions', () => {
    test('should cleanup inactive sessions older than 24 hours', async () => {
      Session.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

      const result = await sessionManager.cleanupInactiveSessions();

      expect(result).toBe(5);
      expect(Session.deleteMany).toHaveBeenCalledWith({
        updatedAt: { $lt: expect.any(Date) },
        isCompleted: false
      });
    });

    test('should cleanup sessions with custom hours', async () => {
      Session.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });

      const result = await sessionManager.cleanupInactiveSessions(48);

      expect(result).toBe(3);
    });

    test('should throw error when cleanup fails', async () => {
      Session.deleteMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(sessionManager.cleanupInactiveSessions())
        .rejects.toThrow('Failed to cleanup sessions: Database error');
    });
  });

  describe('getSessionsByUser', () => {
    test('should retrieve sessions by user ID', async () => {
      const userSessions = [mockSession];
      const mockSort = jest.fn().mockResolvedValue(userSessions);
      Session.find = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await sessionManager.getSessionsByUser('test-user-id');

      expect(result).toEqual(userSessions);
      expect(Session.find).toHaveBeenCalledWith({ userId: 'test-user-id' });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getActiveSessionsCount', () => {
    test('should return count of active sessions', async () => {
      Session.countDocuments = jest.fn().mockResolvedValue(10);

      const result = await sessionManager.getActiveSessionsCount();

      expect(result).toBe(10);
      expect(Session.countDocuments).toHaveBeenCalledWith({ isCompleted: false });
    });
  });

  describe('generateUniqueSessionId', () => {
    test('should generate unique session ID', () => {
      const sessionId1 = sessionManager.generateUniqueSessionId();
      const sessionId2 = sessionManager.generateUniqueSessionId();

      expect(typeof sessionId1).toBe('string');
      expect(typeof sessionId2).toBe('string');
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('isSessionExpired', () => {
    test('should return true for expired session', () => {
      const expiredSession = {
        updatedAt: new Date(Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
      };

      const result = sessionManager.isSessionExpired(expiredSession);

      expect(result).toBe(true);
    });

    test('should return false for active session', () => {
      const activeSession = {
        updatedAt: new Date(Date.now() - (1 * 60 * 60 * 1000)) // 1 hour ago
      };

      const result = sessionManager.isSessionExpired(activeSession);

      expect(result).toBe(false);
    });
  });

  describe('getSessionStats', () => {
    test('should return session statistics', async () => {
      Session.countDocuments = jest.fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // active
        .mockResolvedValueOnce(80)  // completed
        .mockResolvedValueOnce(15); // recent 24h

      const result = await sessionManager.getSessionStats();

      expect(result).toEqual({
        total: 100,
        active: 20,
        completed: 80,
        recent24h: 15
      });
    });
  });

  describe('cleanup interval', () => {
    test('should start and stop cleanup interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // SessionManager starts interval in constructor
      expect(sessionManager.cleanupInterval).toBeDefined();

      sessionManager.stopCleanupInterval();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(sessionManager.cleanupInterval).toBeNull();
    });
  });
});