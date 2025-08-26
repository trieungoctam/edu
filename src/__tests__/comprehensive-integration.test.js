/**
 * Comprehensive Integration Tests
 * Tests complete end-to-end workflows and system integration
 */

const request = require('supertest');
const app = require('../server');
const Session = require('../models/Session');
const Lead = require('../models/Lead');
const GeminiChatService = require('../services/GeminiChatService');
const SessionManager = require('../services/SessionManager');
const ConversationFlow = require('../services/ConversationFlow');

// Mock database connection
jest.mock('../config/database', () => ({
  connectDB: jest.fn()
}));

// Mock models
jest.mock('../models/Session');
jest.mock('../models/Lead');

// Mock services
jest.mock('../services/GeminiChatService');
jest.mock('../services/SessionManager');
jest.mock('../services/ConversationFlow');

describe('Comprehensive Integration Tests', () => {
  let mockSessionManager;
  let mockGeminiService;
  let mockConversationFlow;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SessionManager
    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      addMessage: jest.fn(),
      completeSession: jest.fn(),
      startNudgeTimer: jest.fn(),
      resetNudgeTimer: jest.fn(),
      clearNudgeTimer: jest.fn()
    };

    // Mock GeminiChatService
    mockGeminiService = {
      processMessage: jest.fn(),
      testConnection: jest.fn()
    };

    // Mock ConversationFlow
    mockConversationFlow = {
      processInput: jest.fn(),
      generateMessage: jest.fn(),
      getQuickReplies: jest.fn(),
      isConversationComplete: jest.fn()
    };

    SessionManager.mockImplementation(() => mockSessionManager);
    GeminiChatService.mockImplementation(() => mockGeminiService);
    ConversationFlow.mockImplementation(() => mockConversationFlow);
  });

  describe('Complete Conversation Flow Integration', () => {
    test('should handle complete conversation from start to lead creation', async () => {
      const sessionId = 'integration-test-session';
      const userData = {
        firstName: 'Nguyễn Văn A',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Tối (19–21h)'
      };

      // Step 1: Create session
      const mockSession = {
        sessionId,
        userId: 'user-123',
        firstName: userData.firstName,
        currentState: 'welcome',
        userData: {},
        conversationHistory: [],
        isCompleted: false,
        save: jest.fn().mockResolvedValue({
          sessionId,
          firstName: userData.firstName,
          currentState: 'welcome'
        })
      };

      Session.mockImplementation(() => mockSession);
      mockSessionManager.createSession.mockResolvedValue(mockSession);
      mockConversationFlow.generateMessage.mockReturnValue(`Chào ${userData.firstName}! Chào mừng bạn đến với Đại học Hoa Sen!`);
      mockConversationFlow.getQuickReplies.mockReturnValue(['Có, mình quan tâm', 'Xem ngành đào tạo']);

      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({ firstName: userData.firstName });

      expect(sessionResponse.status).toBe(201);
      expect(sessionResponse.body.success).toBe(true);
      expect(sessionResponse.body.data.sessionId).toBe(sessionId);

      // Step 2: Progress through conversation states
      const conversationSteps = [
        {
          state: 'welcome',
          input: 'Có, mình quan tâm',
          nextState: 'major',
          response: 'Bạn đang quan tâm ngành nào của HSU?',
          quickReplies: ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế']
        },
        {
          state: 'major',
          input: 'CNTT',
          nextState: 'phone',
          response: 'Để gửi brochure + học phí, mình xin số điện thoại của bạn được không?',
          quickReplies: []
        },
        {
          state: 'phone',
          input: '0901234567',
          nextState: 'channel',
          response: 'Cảm ơn bạn! Bạn muốn tư vấn qua Gọi hay Zalo?',
          quickReplies: ['Gọi điện', 'Zalo', 'Email']
        },
        {
          state: 'channel',
          input: 'Zalo',
          nextState: 'timeslot',
          response: 'Bạn muốn được liên hệ lúc nào thuận tiện nhất?',
          quickReplies: ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần']
        },
        {
          state: 'timeslot',
          input: 'Tối (19–21h)',
          nextState: 'complete',
          response: 'Tuyệt vời! Mình đã xếp lịch cho bạn.',
          quickReplies: []
        }
      ];

      for (const step of conversationSteps) {
        // Mock session state
        const currentSession = {
          sessionId,
          currentState: step.state,
          userData: { ...userData },
          conversationHistory: []
        };

        mockSessionManager.getSession.mockResolvedValue(currentSession);
        mockConversationFlow.processInput.mockReturnValue({
          success: true,
          nextState: step.nextState,
          userData: { ...userData }
        });
        mockConversationFlow.generateMessage.mockReturnValue(step.response);
        mockConversationFlow.getQuickReplies.mockReturnValue(step.quickReplies);
        mockConversationFlow.isConversationComplete.mockReturnValue(step.nextState === 'complete');
        mockSessionManager.addMessage.mockResolvedValue(currentSession);
        mockSessionManager.updateSession.mockResolvedValue({
          ...currentSession,
          currentState: step.nextState
        });

        if (step.nextState === 'complete') {
          mockSessionManager.completeSession.mockResolvedValue({
            ...currentSession,
            currentState: 'complete',
            isCompleted: true
          });
        }

        const messageResponse = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId,
            message: step.input
          });

        expect(messageResponse.status).toBe(200);
        expect(messageResponse.body.success).toBe(true);
        expect(messageResponse.body.data.currentState).toBe(step.nextState);
      }

      // Step 3: Verify lead creation for completed conversation
      if (mockConversationFlow.isConversationComplete()) {
        const mockLead = {
          leadId: 'LEAD_123',
          sessionId,
          firstName: userData.firstName,
          major: userData.major,
          phone: userData.phone,
          phoneStandardized: userData.phoneStandardized,
          channel: userData.channel,
          timeslot: userData.timeslot,
          status: 'new',
          save: jest.fn().mockResolvedValue({
            leadId: 'LEAD_123',
            firstName: userData.firstName
          })
        };

        Lead.mockImplementation(() => mockLead);

        const leadResponse = await request(app)
          .post('/api/leads')
          .send({
            sessionId,
            firstName: userData.firstName,
            major: userData.major,
            phone: userData.phone,
            phoneStandardized: userData.phoneStandardized,
            channel: userData.channel,
            timeslot: userData.timeslot
          });

        expect(leadResponse.status).toBe(201);
        expect(leadResponse.body.success).toBe(true);
        expect(leadResponse.body.data.leadId).toBe('LEAD_123');
      }
    });

    test('should handle conversation with validation errors and retries', async () => {
      const sessionId = 'validation-test-session';
      
      const mockSession = {
        sessionId,
        currentState: 'phone',
        userData: { firstName: 'Test User', major: 'CNTT' },
        conversationHistory: []
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);

      // Test invalid phone number
      mockConversationFlow.processInput.mockReturnValue({
        success: false,
        error: 'Số điện thoại không đúng định dạng',
        nextState: 'phone',
        retryCount: 1
      });

      const invalidPhoneResponse = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId,
          message: '123456'
        });

      expect(invalidPhoneResponse.status).toBe(200);
      expect(invalidPhoneResponse.body.success).toBe(false);
      expect(invalidPhoneResponse.body.error).toContain('điện thoại');

      // Test valid phone number after retry
      mockConversationFlow.processInput.mockReturnValue({
        success: true,
        nextState: 'channel',
        userData: { phone: '0901234567', phoneStandardized: '0901234567' }
      });

      const validPhoneResponse = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId,
          message: '0901234567'
        });

      expect(validPhoneResponse.status).toBe(200);
      expect(validPhoneResponse.body.success).toBe(true);
      expect(validPhoneResponse.body.data.currentState).toBe('channel');
    });

    test('should handle AI service failures with fallback responses', async () => {
      const sessionId = 'ai-failure-test-session';
      
      const mockSession = {
        sessionId,
        currentState: 'welcome',
        userData: { firstName: 'Test User' },
        conversationHistory: []
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockGeminiService.processMessage.mockResolvedValue({
        success: false,
        error: 'apiError',
        reply: 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.',
        fallback: true
      });

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId,
          message: 'Chào bạn'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('hệ thống đang bận');
      expect(response.body.data.fallback).toBe(true);
    });
  });

  describe('Admin Integration Tests', () => {
    test('should retrieve comprehensive lead statistics', async () => {
      const mockStats = {
        totalLeads: 150,
        statusBreakdown: {
          new: 100,
          contacted: 35,
          converted: 15
        },
        popularMajors: [
          { major: 'CNTT', count: 45 },
          { major: 'Quản trị Kinh doanh', count: 38 },
          { major: 'Thiết kế', count: 25 }
        ],
        channelPreferences: [
          { channel: 'Zalo', count: 85 },
          { channel: 'Gọi điện', count: 45 },
          { channel: 'Email', count: 20 }
        ],
        recentActivity: {
          today: 12,
          thisWeek: 45,
          thisMonth: 150
        }
      };

      Lead.countDocuments = jest.fn().mockResolvedValue(150);
      Lead.aggregate = jest.fn().mockImplementation((pipeline) => {
        if (pipeline[0].$group._id === '$status') {
          return Promise.resolve([
            { _id: 'new', count: 100 },
            { _id: 'contacted', count: 35 },
            { _id: 'converted', count: 15 }
          ]);
        }
        if (pipeline[0].$group._id === '$major') {
          return Promise.resolve([
            { _id: 'CNTT', count: 45 },
            { _id: 'Quản trị Kinh doanh', count: 38 },
            { _id: 'Thiết kế', count: 25 }
          ]);
        }
        if (pipeline[0].$group._id === '$channel') {
          return Promise.resolve([
            { _id: 'Zalo', count: 85 },
            { _id: 'Gọi điện', count: 45 },
            { _id: 'Email', count: 20 }
          ]);
        }
        return Promise.resolve([]);
      });

      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLeads).toBe(150);
      expect(response.body.data.statusBreakdown).toEqual(mockStats.statusBreakdown);
      expect(response.body.data.popularMajors).toHaveLength(3);
      expect(response.body.data.channelPreferences).toHaveLength(3);
    });

    test('should filter leads by date range and status', async () => {
      const mockLeads = [
        {
          leadId: 'LEAD_001',
          firstName: 'Nguyễn Văn A',
          major: 'CNTT',
          status: 'new',
          createdAt: new Date('2024-01-15')
        },
        {
          leadId: 'LEAD_002',
          firstName: 'Trần Thị B',
          major: 'Quản trị Kinh doanh',
          status: 'contacted',
          createdAt: new Date('2024-01-16')
        }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLeads)
      };

      Lead.find = jest.fn().mockReturnValue(mockQuery);
      Lead.countDocuments = jest.fn().mockResolvedValue(2);

      const response = await request(app)
        .get('/api/admin/leads')
        .query({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          status: 'new',
          limit: 50,
          page: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(Lead.find).toHaveBeenCalledWith(expect.objectContaining({
        status: 'new',
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        })
      }));
    });

    test('should update lead status successfully', async () => {
      const leadId = 'LEAD_UPDATE_TEST';
      const updatedLead = {
        leadId,
        firstName: 'Test User',
        status: 'contacted',
        updatedAt: new Date()
      };

      Lead.findOneAndUpdate = jest.fn().mockResolvedValue(updatedLead);

      const response = await request(app)
        .put(`/api/admin/leads/${leadId}/status`)
        .send({ status: 'contacted' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('contacted');
      expect(Lead.findOneAndUpdate).toHaveBeenCalledWith(
        { leadId },
        { status: 'contacted' },
        { new: true, runValidators: true }
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database connection errors gracefully', async () => {
      Session.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/chat/session/test-session-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_CONNECTION_ERROR');
    });

    test('should handle validation errors with proper error codes', async () => {
      const response = await request(app)
        .post('/api/chat/session')
        .send({ firstName: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.field).toBe('firstName');
    });

    test('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const promises = Array.from({ length: 65 }, () =>
        request(app)
          .post('/api/chat/session')
          .send({ firstName: 'Test User' })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Session Management Integration', () => {
    test('should handle session expiry and cleanup', async () => {
      const expiredSessionId = 'expired-session-123';
      
      // Mock expired session
      mockSessionManager.getSession.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/chat/session/${expiredSessionId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    test('should handle concurrent session access', async () => {
      const sessionId = 'concurrent-test-session';
      const mockSession = {
        sessionId,
        currentState: 'major',
        userData: { firstName: 'Test User' },
        conversationHistory: []
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.processInput.mockReturnValue({
        success: true,
        nextState: 'phone',
        userData: { major: 'CNTT' }
      });

      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/chat/message')
          .send({
            sessionId,
            message: 'CNTT'
          })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Performance Integration Tests', () => {
    test('should handle multiple simultaneous sessions', async () => {
      const sessionCount = 10;
      const promises = [];

      for (let i = 0; i < sessionCount; i++) {
        const mockSession = {
          sessionId: `perf-test-session-${i}`,
          firstName: `User ${i}`,
          currentState: 'welcome',
          save: jest.fn().mockResolvedValue({
            sessionId: `perf-test-session-${i}`,
            firstName: `User ${i}`
          })
        };

        Session.mockImplementation(() => mockSession);
        
        promises.push(
          request(app)
            .post('/api/chat/session')
            .send({ firstName: `User ${i}` })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All sessions should be created successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe(`perf-test-session-${index}`);
      });

      // Performance check - should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle large conversation history efficiently', async () => {
      const sessionId = 'large-history-session';
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const mockSession = {
        sessionId,
        currentState: 'major',
        userData: { firstName: 'Test User' },
        conversationHistory: largeHistory
      };

      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockConversationFlow.processInput.mockReturnValue({
        success: true,
        nextState: 'phone',
        userData: { major: 'CNTT' }
      });

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId,
          message: 'CNTT'
        });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should handle large history efficiently
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // 3 seconds max
    });
  });
});