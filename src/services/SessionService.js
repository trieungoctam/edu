const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  /**
   * Create a new session
   * @param {string} userId - User identifier
   * @param {string} firstName - User's first name
   * @returns {Promise<Object>} Created session
   */
  async createSession(userId, firstName) {
    try {
      const sessionId = uuidv4();
      
      const session = new Session({
        sessionId,
        userId,
        firstName,
        currentState: 'welcome',
        userData: {},
        conversationHistory: [],
        isCompleted: false
      });

      const savedSession = await session.save();
      return savedSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Get session by session ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Session data or null if not found
   */
  async getSession(sessionId) {
    try {
      const session = await Session.findOne({ sessionId });
      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      throw new Error(`Failed to retrieve session: ${error.message}`);
    }
  }

  /**
   * Update session data
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async updateSession(sessionId, updates) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId - Session identifier
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} content - Message content
   * @param {Array} quickReplies - Optional quick reply buttons
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async addMessage(sessionId, role, content, quickReplies = []) {
    try {
      const message = {
        role,
        content,
        timestamp: new Date(),
        quickReplies
      };

      const session = await Session.findOneAndUpdate(
        { sessionId },
        { 
          $push: { conversationHistory: message },
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      return session;
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  /**
   * Update user data in session
   * @param {string} sessionId - Session identifier
   * @param {Object} userData - User data to update
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async updateUserData(sessionId, userData) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { 
          $set: { 
            'userData': { ...userData },
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );

      return session;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new Error(`Failed to update user data: ${error.message}`);
    }
  }

  /**
   * Mark session as completed
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async completeSession(sessionId) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { 
          isCompleted: true,
          currentState: 'complete',
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      return session;
    } catch (error) {
      console.error('Error completing session:', error);
      throw new Error(`Failed to complete session: ${error.message}`);
    }
  }

  /**
   * Delete old inactive sessions (cleanup)
   * @param {number} hoursOld - Delete sessions older than this many hours
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupOldSessions(hoursOld = 24) {
    try {
      const cutoffDate = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
      
      const result = await Session.deleteMany({
        updatedAt: { $lt: cutoffDate },
        isCompleted: false
      });

      console.log(`Cleaned up ${result.deletedCount} old sessions`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw new Error(`Failed to cleanup sessions: ${error.message}`);
    }
  }

  /**
   * Get sessions by user ID
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Array of sessions
   */
  async getSessionsByUser(userId) {
    try {
      const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
      return sessions;
    } catch (error) {
      console.error('Error retrieving user sessions:', error);
      throw new Error(`Failed to retrieve user sessions: ${error.message}`);
    }
  }
}

module.exports = SessionService;