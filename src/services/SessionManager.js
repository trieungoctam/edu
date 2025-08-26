const Session = process.env.IN_MEMORY_STORAGE === 'true' ? null : require('../models/Session');
const { v4: uuidv4 } = require('uuid');

/**
 * SessionManager class for handling user sessions
 * Manages session lifecycle, conversation history, and cleanup operations
 */
class SessionManager {
  constructor() {
    // Start cleanup interval for inactive sessions (runs every hour)
    this.startCleanupInterval();
    
    // Store nudge timers for active sessions
    this.nudgeTimers = new Map();
    
    // Nudge timeout duration (2 minutes in milliseconds)
    this.nudgeTimeout = 2 * 60 * 1000;

    // In-memory storage toggle
    this.useMemory = process.env.IN_MEMORY_STORAGE === 'true';
    if (this.useMemory) {
      this.memoryStore = new Map();
    }
  }

  /**
   * Create a new session
   * @param {string} userId - User identifier
   * @param {string} firstName - User's first name
   * @returns {Promise<Object>} Created session
   */
  async createSession(userId, firstName) {
    try {
      const sessionId = this.generateUniqueSessionId();
      
      const baseSession = {
        sessionId,
        userId,
        firstName,
        currentState: 'welcome',
        userData: {},
        conversationHistory: [],
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let savedSession;
      if (this.useMemory) {
        this.memoryStore.set(sessionId, baseSession);
        savedSession = this.memoryStore.get(sessionId);
      } else {
        const session = new Session(baseSession);
        savedSession = await session.save();
      }
      console.log(`Created new session: ${sessionId} for user: ${userId}`);
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
      const session = this.useMemory
        ? (this.memoryStore.get(sessionId) || null)
        : await Session.findOne({ sessionId });
      
      if (!session) {
        console.warn(`Session not found: ${sessionId}`);
        return null;
      }

      // Check if session is expired (24 hours)
      if (this.isSessionExpired(session)) {
        console.log(`Session expired, cleaning up: ${sessionId}`);
        await this.deleteSession(sessionId);
        return null;
      }

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
      let session;
      if (this.useMemory) {
        const existing = this.memoryStore.get(sessionId);
        if (!existing) return null;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.memoryStore.set(sessionId, updated);
        session = updated;
      } else {
        session = await Session.findOneAndUpdate(
          { sessionId },
          { ...updates, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      }

      if (!session) {
        console.warn(`Session not found for update: ${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Add message to conversation history with timestamp and role
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

      let session;
      if (this.useMemory) {
        const existing = this.memoryStore.get(sessionId);
        if (!existing) return null;
        const updated = {
          ...existing,
          conversationHistory: [...(existing.conversationHistory || []), message],
          updatedAt: new Date()
        };
        this.memoryStore.set(sessionId, updated);
        session = updated;
      } else {
        session = await Session.findOneAndUpdate(
          { sessionId },
          { 
            $push: { conversationHistory: message },
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
      }

      if (!session) {
        console.warn(`Session not found for message addition: ${sessionId}`);
        return null;
      }

      console.log(`Added ${role} message to session: ${sessionId}`);
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
      let session;
      if (this.useMemory) {
        const existing = this.memoryStore.get(sessionId);
        if (!existing) return null;
        const updated = { ...existing, userData: { ...userData }, updatedAt: new Date() };
        this.memoryStore.set(sessionId, updated);
        session = updated;
      } else {
        session = await Session.findOneAndUpdate(
          { sessionId },
          { 
            $set: { 
              'userData': { ...userData },
              updatedAt: new Date()
            }
          },
          { new: true, runValidators: true }
        );
      }

      if (!session) {
        console.warn(`Session not found for user data update: ${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new Error(`Failed to update user data: ${error.message}`);
    }
  }

  /**
   * Update session state
   * @param {string} sessionId - Session identifier
   * @param {string} newState - New conversation state
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async updateSessionState(sessionId, newState) {
    try {
      let session;
      if (this.useMemory) {
        const existing = this.memoryStore.get(sessionId);
        if (!existing) return null;
        const updated = { ...existing, currentState: newState, updatedAt: new Date() };
        this.memoryStore.set(sessionId, updated);
        session = updated;
      } else {
        session = await Session.findOneAndUpdate(
          { sessionId },
          { 
            currentState: newState,
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
      }

      if (!session) {
        console.warn(`Session not found for state update: ${sessionId}`);
        return null;
      }

      console.log(`Updated session state to ${newState}: ${sessionId}`);
      return session;
    } catch (error) {
      console.error('Error updating session state:', error);
      throw new Error(`Failed to update session state: ${error.message}`);
    }
  }

  /**
   * Mark session as completed
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async completeSession(sessionId) {
    try {
      let session;
      if (this.useMemory) {
        const existing = this.memoryStore.get(sessionId);
        if (!existing) return null;
        const updated = { ...existing, isCompleted: true, currentState: 'complete', updatedAt: new Date() };
        this.memoryStore.set(sessionId, updated);
        session = updated;
      } else {
        session = await Session.findOneAndUpdate(
          { sessionId },
          { 
            isCompleted: true,
            currentState: 'complete',
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
      }

      if (!session) {
        console.warn(`Session not found for completion: ${sessionId}`);
        return null;
      }

      console.log(`Completed session: ${sessionId}`);
      return session;
    } catch (error) {
      console.error('Error completing session:', error);
      throw new Error(`Failed to complete session: ${error.message}`);
    }
  }

  /**
   * Delete a specific session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteSession(sessionId) {
    try {
      // Clear nudge timer before deleting session
      this.clearNudgeTimer(sessionId);
      
      if (this.useMemory) {
        const existed = this.memoryStore.delete(sessionId);
        if (existed) {
          console.log(`Deleted session: ${sessionId}`);
          return true;
        }
        return false;
      } else {
        const result = await Session.deleteOne({ sessionId });
        if (result.deletedCount > 0) {
          console.log(`Deleted session: ${sessionId}`);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Clean up inactive sessions (24-hour expiry by default)
   * @param {number} hoursOld - Delete sessions older than this many hours
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupInactiveSessions(hoursOld = 24) {
    try {
      const cutoffDate = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
      
      if (this.useMemory) {
        let deleted = 0;
        for (const [id, sess] of this.memoryStore.entries()) {
          if (!sess.isCompleted && new Date(sess.updatedAt) < cutoffDate) {
            this.memoryStore.delete(id);
            deleted++;
          }
        }
        if (deleted > 0) {
          console.log(`Cleaned up ${deleted} inactive sessions older than ${hoursOld} hours`);
        }
        return deleted;
      } else {
        const result = await Session.deleteMany({
          updatedAt: { $lt: cutoffDate },
          isCompleted: false
        });
        if (result.deletedCount > 0) {
          console.log(`Cleaned up ${result.deletedCount} inactive sessions older than ${hoursOld} hours`);
        }
        return result.deletedCount;
      }
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
      if (this.useMemory) {
        return Array.from(this.memoryStore.values())
          .filter(s => s.userId === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else {
        const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
        return sessions;
      }
    } catch (error) {
      console.error('Error retrieving user sessions:', error);
      throw new Error(`Failed to retrieve user sessions: ${error.message}`);
    }
  }

  /**
   * Get active sessions count
   * @returns {Promise<number>} Number of active sessions
   */
  async getActiveSessionsCount() {
    try {
      if (this.useMemory) {
        return Array.from(this.memoryStore.values()).filter(s => !s.isCompleted).length;
      } else {
        const count = await Session.countDocuments({ isCompleted: false });
        return count;
      }
    } catch (error) {
      console.error('Error getting active sessions count:', error);
      throw new Error(`Failed to get active sessions count: ${error.message}`);
    }
  }

  /**
   * Generate unique session ID using UUID v4
   * @returns {string} Unique session identifier
   */
  generateUniqueSessionId() {
    return uuidv4();
  }

  /**
   * Check if session is expired (24 hours)
   * @param {Object} session - Session object
   * @returns {boolean} True if session is expired
   */
  isSessionExpired(session) {
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const sessionAge = Date.now() - new Date(session.updatedAt).getTime();
    return sessionAge > expiryTime;
  }

  /**
   * Start automatic cleanup interval for inactive sessions
   * Runs every hour to clean up expired sessions
   */
  startCleanupInterval() {
    // Run cleanup every hour (3600000 ms)
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupInactiveSessions();
      } catch (error) {
        console.error('Error in automatic session cleanup:', error);
      }
    }, 3600000);

    console.log('Started automatic session cleanup interval (runs every hour)');
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Stopped automatic session cleanup interval');
    }
    
    // Also clear all nudge timers
    this.clearAllNudgeTimers();
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStats() {
    try {
      let totalSessions, activeSessions, completedSessions, recentSessions;
      if (this.useMemory) {
        const values = Array.from(this.memoryStore.values());
        totalSessions = values.length;
        activeSessions = values.filter(s => !s.isCompleted).length;
        completedSessions = values.filter(s => s.isCompleted).length;
        const last24Hours = new Date(Date.now() - (24 * 60 * 60 * 1000));
        recentSessions = values.filter(s => new Date(s.createdAt) >= last24Hours).length;
      } else {
        totalSessions = await Session.countDocuments();
        activeSessions = await Session.countDocuments({ isCompleted: false });
        completedSessions = await Session.countDocuments({ isCompleted: true });
        const last24Hours = new Date(Date.now() - (24 * 60 * 60 * 1000));
        recentSessions = await Session.countDocuments({ createdAt: { $gte: last24Hours } });
      }

      return {
        total: totalSessions,
        active: activeSessions,
        completed: completedSessions,
        recent24h: recentSessions
      };
    } catch (error) {
      console.error('Error getting session statistics:', error);
      throw new Error(`Failed to get session statistics: ${error.message}`);
    }
  }

  /**
   * Start nudge timer for a session
   * @param {string} sessionId - Session identifier
   * @param {Function} nudgeCallback - Callback function to execute when nudge triggers
   */
  startNudgeTimer(sessionId, nudgeCallback) {
    try {
      // Clear existing timer if any
      this.clearNudgeTimer(sessionId);
      
      // Set new timer
      const timer = setTimeout(async () => {
        try {
          console.log(`Nudge timer triggered for session: ${sessionId}`);
          
          // Check if session still exists and is not completed
          const session = await this.getSession(sessionId);
          if (session && !session.isCompleted && session.currentState !== 'complete') {
            // Store previous state before nudging
            await this.updateSession(sessionId, { 
              previousState: session.currentState,
              currentState: 'nudge'
            });
            
            // Execute nudge callback
            if (nudgeCallback && typeof nudgeCallback === 'function') {
              await nudgeCallback(sessionId);
            }
          }
          
          // Remove timer from map
          this.nudgeTimers.delete(sessionId);
        } catch (error) {
          console.error(`Error executing nudge for session ${sessionId}:`, error);
        }
      }, this.nudgeTimeout);
      
      // Store timer reference
      this.nudgeTimers.set(sessionId, timer);
      console.log(`Started nudge timer for session: ${sessionId} (${this.nudgeTimeout / 1000}s)`);
    } catch (error) {
      console.error('Error starting nudge timer:', error);
    }
  }

  /**
   * Clear nudge timer for a session
   * @param {string} sessionId - Session identifier
   */
  clearNudgeTimer(sessionId) {
    try {
      const timer = this.nudgeTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.nudgeTimers.delete(sessionId);
        console.log(`Cleared nudge timer for session: ${sessionId}`);
      }
    } catch (error) {
      console.error('Error clearing nudge timer:', error);
    }
  }

  /**
   * Reset nudge timer for a session (clear and restart)
   * @param {string} sessionId - Session identifier
   * @param {Function} nudgeCallback - Callback function to execute when nudge triggers
   */
  resetNudgeTimer(sessionId, nudgeCallback) {
    this.clearNudgeTimer(sessionId);
    this.startNudgeTimer(sessionId, nudgeCallback);
  }

  /**
   * Handle nudge response and resume conversation
   * @param {string} sessionId - Session identifier
   * @param {string} userResponse - User's response to nudge
   * @returns {Promise<Object|null>} Updated session or null if not found
   */
  async handleNudgeResponse(sessionId, userResponse) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Clear nudge timer since user responded
      this.clearNudgeTimer(sessionId);

      // Check if user wants to continue
      const wantsToContinue = userResponse.toLowerCase().includes('có') || 
                             userResponse === 'Có, giữ giúp mình';

      if (wantsToContinue) {
        // Resume from previous state if available, otherwise continue to next logical state
        const resumeState = session.previousState || this.determineResumeState(session);
        
        const updatedSession = await this.updateSession(sessionId, {
          currentState: resumeState,
          previousState: null
        });
        
        console.log(`Resumed conversation for session: ${sessionId} at state: ${resumeState}`);
        return updatedSession;
      } else {
        // User doesn't want to continue, complete the session
        const completedSession = await this.completeSession(sessionId);
        console.log(`Completed session after nudge decline: ${sessionId}`);
        return completedSession;
      }
    } catch (error) {
      console.error('Error handling nudge response:', error);
      throw new Error(`Failed to handle nudge response: ${error.message}`);
    }
  }

  /**
   * Determine appropriate state to resume conversation after nudge
   * @param {Object} session - Session object
   * @returns {string} State to resume at
   */
  determineResumeState(session) {
    const userData = session.userData || {};
    
    // Determine next logical state based on collected data
    if (!userData.major) {
      return 'major';
    } else if (!userData.phone) {
      return 'phone';
    } else if (!userData.channel) {
      return 'channel';
    } else if (!userData.timeslot) {
      return 'timeslot';
    } else {
      return 'complete';
    }
  }

  /**
   * Check if session is in nudge state
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} True if session is in nudge state
   */
  async isInNudgeState(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      return session && session.currentState === 'nudge';
    } catch (error) {
      console.error('Error checking nudge state:', error);
      return false;
    }
  }

  /**
   * Get active nudge timers count
   * @returns {number} Number of active nudge timers
   */
  getActiveNudgeTimersCount() {
    return this.nudgeTimers.size;
  }

  /**
   * Clear all nudge timers (useful for cleanup)
   */
  clearAllNudgeTimers() {
    try {
      for (const [sessionId, timer] of this.nudgeTimers) {
        clearTimeout(timer);
        console.log(`Cleared nudge timer for session: ${sessionId}`);
      }
      this.nudgeTimers.clear();
      console.log('Cleared all nudge timers');
    } catch (error) {
      console.error('Error clearing all nudge timers:', error);
    }
  }
}

module.exports = SessionManager;