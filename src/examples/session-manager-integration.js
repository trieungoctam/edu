/**
 * SessionManager Integration Example
 * Shows how SessionManager would be used in the actual chatbot application
 */

const SessionManager = require('../services/SessionManager');

/**
 * Example of how SessionManager would be integrated into chat API endpoints
 */
class ChatController {
  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * Handle new chat session creation
   * POST /api/chat/session
   */
  async createChatSession(req, res) {
    try {
      const { userId, firstName } = req.body;

      if (!userId || !firstName) {
        return res.status(400).json({
          success: false,
          error: 'userId and firstName are required'
        });
      }

      const session = await this.sessionManager.createSession(userId, firstName);

      // Add welcome message
      await this.sessionManager.addMessage(
        session.sessionId,
        'assistant',
        `Chào ${firstName}! Chào mừng bạn đến với Đại học Hoa Sen! Bạn muốn nhận lộ trình học – học phí – học bổng cho ngành mình quan tâm chứ?`,
        ['Có, mình quan tâm', 'Xem ngành đào tạo', 'Nói chuyện với người thật']
      );

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          currentState: session.currentState,
          message: session.conversationHistory[session.conversationHistory.length - 1]
        }
      });

    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create chat session'
      });
    }
  }

  /**
   * Handle incoming chat messages
   * POST /api/chat/message
   */
  async processChatMessage(req, res) {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and message are required'
        });
      }

      // Get existing session
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or expired'
        });
      }

      // Add user message to conversation
      await this.sessionManager.addMessage(sessionId, 'user', message);

      // Process message based on current state
      let response;
      let nextState = session.currentState;
      let quickReplies = [];

      switch (session.currentState) {
        case 'welcome':
          if (message.toLowerCase().includes('quan tâm')) {
            response = 'Bạn đang quan tâm ngành nào của HSU?';
            nextState = 'major';
            quickReplies = ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'];
          } else {
            response = 'Tuyệt vời! Hãy cho mình biết bạn quan tâm ngành nào nhé?';
            nextState = 'major';
            quickReplies = ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'];
          }
          break;

        case 'major':
          // Update user data with selected major
          await this.sessionManager.updateUserData(sessionId, {
            ...session.userData,
            major: message
          });
          
          response = 'Để gửi brochure + học phí + suất học bổng phù hợp và sắp lịch tư vấn 1-1, mình xin số điện thoại của bạn được không? 📱\n\nHSU chỉ dùng số này để tư vấn tuyển sinh, không spam.';
          nextState = 'phone';
          break;

        case 'phone':
          // Validate phone number (simplified)
          const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|(\+84)[3|5|7|8|9][0-9]{8})$/;
          if (phoneRegex.test(message.replace(/\s/g, ''))) {
            const standardizedPhone = message.startsWith('+84') 
              ? '0' + message.substring(3) 
              : message;
            
            await this.sessionManager.updateUserData(sessionId, {
              ...session.userData,
              phone: message,
              phoneStandardized: standardizedPhone
            });
            
            response = `Cảm ơn bạn! Mình đã ghi nhận số ${standardizedPhone}. Bạn muốn tư vấn qua Gọi hay Zalo?`;
            nextState = 'channel';
            quickReplies = ['Gọi điện', 'Zalo', 'Email'];
          } else {
            response = 'Hình như số chưa đúng 😅. Bạn nhập theo dạng 0xxxxxxxxx hoặc +84xxxxxxxxx giúp mình nhé.';
            // Stay in phone state
          }
          break;

        case 'channel':
          await this.sessionManager.updateUserData(sessionId, {
            ...session.userData,
            channel: message
          });
          
          response = 'Bạn muốn được liên hệ lúc nào thuận tiện nhất?';
          nextState = 'timeslot';
          quickReplies = ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'];
          break;

        case 'timeslot':
          await this.sessionManager.updateUserData(sessionId, {
            ...session.userData,
            timeslot: message
          });
          
          if (message === 'Chọn giờ khác') {
            response = 'Bạn gõ khung giờ thuận tiện giúp mình nhé (ví dụ: Sáng mai 9h, Chiều thứ 3...)';
            nextState = 'custom_time';
          } else {
            response = `Tuyệt vời! Mình đã xếp lịch ${message} cho bạn qua ${session.userData.channel}. Tư vấn viên của HSU sẽ liên hệ để gửi brochure, học phí & thông tin học bổng ngành ${session.userData.major}.\n\nCảm ơn ${session.firstName} đã tin tưởng HSU! 🎓`;
            nextState = 'complete';
            
            // Mark session as completed
            await this.sessionManager.completeSession(sessionId);
          }
          break;

        case 'custom_time':
          await this.sessionManager.updateUserData(sessionId, {
            ...session.userData,
            timeslot: message
          });
          
          response = `Tuyệt vời! Mình đã xếp lịch ${message} cho bạn qua ${session.userData.channel}. Tư vấn viên của HSU sẽ liên hệ để gửi brochure, học phí & thông tin học bổng ngành ${session.userData.major}.\n\nCảm ơn ${session.firstName} đã tin tưởng HSU! 🎓`;
          nextState = 'complete';
          
          // Mark session as completed
          await this.sessionManager.completeSession(sessionId);
          break;

        default:
          response = 'Cảm ơn bạn đã quan tâm đến Đại học Hoa Sen!';
      }

      // Update session state
      if (nextState !== session.currentState) {
        await this.sessionManager.updateSessionState(sessionId, nextState);
      }

      // Add assistant response
      await this.sessionManager.addMessage(sessionId, 'assistant', response, quickReplies);

      res.json({
        success: true,
        data: {
          sessionId,
          currentState: nextState,
          message: {
            role: 'assistant',
            content: response,
            quickReplies,
            timestamp: new Date()
          },
          isCompleted: nextState === 'complete'
        }
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }

  /**
   * Get session data
   * GET /api/chat/session/:id
   */
  async getChatSession(req, res) {
    try {
      const { id } = req.params;

      const session = await this.sessionManager.getSession(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or expired'
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          userId: session.userId,
          firstName: session.firstName,
          currentState: session.currentState,
          userData: session.userData,
          conversationHistory: session.conversationHistory,
          isCompleted: session.isCompleted,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      });

    } catch (error) {
      console.error('Error getting chat session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session'
      });
    }
  }

  /**
   * Get session statistics (for admin)
   * GET /api/admin/sessions/stats
   */
  async getSessionStats(req, res) {
    try {
      const stats = await this.sessionManager.getSessionStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session statistics'
      });
    }
  }

  /**
   * Cleanup old sessions (for admin)
   * POST /api/admin/sessions/cleanup
   */
  async cleanupSessions(req, res) {
    try {
      const { hours = 24 } = req.body;
      
      const cleanedCount = await this.sessionManager.cleanupInactiveSessions(hours);
      
      res.json({
        success: true,
        data: {
          cleanedCount,
          message: `Cleaned up ${cleanedCount} inactive sessions older than ${hours} hours`
        }
      });

    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup sessions'
      });
    }
  }

  /**
   * Cleanup method to stop intervals when shutting down
   */
  cleanup() {
    this.sessionManager.stopCleanupInterval();
  }
}

module.exports = ChatController;

// Example usage:
if (require.main === module) {
  console.log('SessionManager Integration Example');
  console.log('This shows how SessionManager would be used in the actual application.');
  console.log('');
  console.log('Key integration points:');
  console.log('1. Create sessions for new users');
  console.log('2. Add messages to conversation history');
  console.log('3. Update session state based on conversation flow');
  console.log('4. Update user data as information is collected');
  console.log('5. Mark sessions as completed when conversation ends');
  console.log('6. Automatic cleanup of expired sessions');
  console.log('7. Session statistics for admin dashboard');
}