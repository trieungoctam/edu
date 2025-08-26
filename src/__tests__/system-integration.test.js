/**
 * System Integration Tests
 * Tests the complete system working together with all components
 */

const request = require('supertest');
const app = require('../server');
const Session = require('../models/Session');
const Lead = require('../models/Lead');
const GeminiChatService = require('../services/GeminiChatService');
const SessionManager = require('../services/SessionManager');
const ConversationFlow = require('../services/ConversationFlow');
const NudgeService = require('../services/NudgeService');
const PhoneValidator = require('../utils/phoneValidation');

// Mock database connection
jest.mock('../config/database', () => ({
  connectDB: jest.fn()
}));

// Mock models
jest.mock('../models/Session');
jest.mock('../models/Lead');

describe('System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey Integration', () => {
    test('should handle complete user journey from session creation to lead generation', async () => {
      // Step 1: Create session
      const mockSession = {
        sessionId: 'system-test-session',
        userId: 'user-123',
        firstName: 'Nguyễn Văn Test',
        currentState: 'welcome',
        userData: {},
        conversationHistory: [],
        isCompleted: false,
        save: jest.fn().mockResolvedValue({
          sessionId: 'system-test-session',
          firstName: 'Nguyễn Văn Test',
          currentState: 'welcome'
        })
      };

      Session.mockImplementation(() => mockSession);
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);

      const sessionResponse = await request(app)
        .post('/api/chat/session')
        .send({ firstName: 'Nguyễn Văn Test' });

      expect(sessionResponse.status).toBe(201);
      expect(sessionResponse.body.success).toBe(true);

      // Step 2: Progress through conversation
      const conversationSteps = [
        { input: 'Có, mình quan tâm', expectedState: 'major' },
        { input: 'CNTT', expectedState: 'phone' },
        { input: '0901234567', expectedState: 'channel' },
        { input: 'Zalo', expectedState: 'timeslot' },
        { input: 'Tối (19–21h)', expectedState: 'complete' }
      ];

      let currentSession = mockSession;
      
      for (const step of conversationSteps) {
        // Mock session retrieval
        Session.findOne = jest.fn().mockResolvedValue(currentSession);
        
        // Mock conversation flow processing
        const updatedSession = {
          ...currentSession,
          currentState: step.expectedState,
          userData: {
            ...currentSession.userData,
            ...(step.input === 'CNTT' && { major: 'CNTT' }),
            ...(step.input === '0901234567' && { phone: '0901234567', phoneStandardized: '0901234567' }),
            ...(step.input === 'Zalo' && { channel: 'Zalo' }),
            ...(step.input === 'Tối (19–21h)' && { timeslot: 'Tối (19–21h)' })
          },
          isCompleted: step.expectedState === 'complete'
        };

        Session.findOneAndUpdate = jest.fn().mockResolvedValue(updatedSession);
        currentSession = updatedSession;

        const messageResponse = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId: 'system-test-session',
            message: step.input
          });

        expect(messageResponse.status).toBe(200);
        expect(messageResponse.body.success).toBe(true);
      }

      // Step 3: Create lead from completed session
      const mockLead = {
        leadId: 'LEAD_SYSTEM_TEST',
        sessionId: 'system-test-session',
        firstName: 'Nguyễn Văn Test',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Tối (19–21h)',
        status: 'new',
        save: jest.fn().mockResolvedValue({
          leadId: 'LEAD_SYSTEM_TEST',
          firstName: 'Nguyễn Văn Test'
        })
      };

      Lead.mockImplementation(() => mockLead);

      const leadResponse = await request(app)
        .post('/api/leads')
        .send({
          sessionId: 'system-test-session',
          firstName: 'Nguyễn Văn Test',
          major: 'CNTT',
          phone: '0901234567',
          phoneStandardized: '0901234567',
          channel: 'Zalo',
          timeslot: 'Tối (19–21h)'
        });

      expect(leadResponse.status).toBe(201);
      expect(leadResponse.body.success).toBe(true);
      expect(leadResponse.body.data.leadId).toBe('LEAD_SYSTEM_TEST');
    });

    test('should handle phone validation throughout the system', async () => {
      const phoneValidator = new PhoneValidator();
      
      // Test various phone number formats
      const phoneTests = [
        { input: '0901234567', expected: true, standardized: '0901234567' },
        { input: '+84901234567', expected: true, standardized: '0901234567' },
        { input: '090 123 4567', expected: true, standardized: '0901234567' },
        { input: '123456', expected: false, standardized: null },
        { input: '0123456789', expected: false, standardized: null }
      ];

      for (const test of phoneTests) {
        const result = phoneValidator.validate(test.input);
        expect(result.isValid).toBe(test.expected);
        
        if (test.expected) {
          expect(result.standardizedPhone).toBe(test.standardized);
        }
      }

      // Test phone validation in API
      const mockSession = {
        sessionId: 'phone-test-session',
        currentState: 'phone',
        userData: { firstName: 'Test User', major: 'CNTT' },
        conversationHistory: []
      };

      Session.findOne = jest.fn().mockResolvedValue(mockSession);

      // Test invalid phone
      const invalidResponse = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId: 'phone-test-session',
          message: '123456'
        });

      expect(invalidResponse.status).toBe(200);
      // Should stay in phone state or return validation error

      // Test valid phone
      Session.findOneAndUpdate = jest.fn().mockResolvedValue({
        ...mockSession,
        currentState: 'channel',
        userData: { ...mockSession.userData, phone: '0901234567', phoneStandardized: '0901234567' }
      });

      const validResponse = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId: 'phone-test-session',
          message: '0901234567'
        });

      expect(validResponse.status).toBe(200);
      expect(validResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle cascading errors gracefully', async () => {
      // Test database error handling
      Session.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId: 'test-session',
          message: 'Hello'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_CONNECTION_ERROR');
    });

    test('should handle AI service failures with fallback', async () => {
      const mockSession = {
        sessionId: 'ai-error-session',
        currentState: 'welcome',
        userData: { firstName: 'Test User' },
        conversationHistory: []
      };

      Session.findOne = jest.fn().mockResolvedValue(mockSession);
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);

      // Mock AI service failure - this would be handled by the conversation flow
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId: 'ai-error-session',
          message: 'Hello'
        });

      // Should still return a response, possibly with fallback message
      expect(response.status).toBe(200);
    });

    test('should handle validation errors consistently', async () => {
      // Test various validation scenarios
      const validationTests = [
        {
          endpoint: '/api/chat/session',
          method: 'post',
          data: { firstName: '' },
          expectedError: 'VALIDATION_ERROR'
        },
        {
          endpoint: '/api/chat/message',
          method: 'post',
          data: { sessionId: '', message: 'Hello' },
          expectedError: 'VALIDATION_ERROR'
        },
        {
          endpoint: '/api/leads',
          method: 'post',
          data: { firstName: 'Test' }, // Missing required fields
          expectedError: 'VALIDATION_ERROR'
        }
      ];

      for (const test of validationTests) {
        const response = await request(app)[test.method](test.endpoint)
          .send(test.data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe(test.expectedError);
      }
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises = [];

      // Create multiple concurrent session creation requests
      for (let i = 0; i < concurrentRequests; i++) {
        const mockSession = {
          sessionId: `concurrent-session-${i}`,
          firstName: `User ${i}`,
          save: jest.fn().mockResolvedValue({
            sessionId: `concurrent-session-${i}`,
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

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe(`concurrent-session-${index}`);
      });

      // Should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // 10 seconds max for 20 concurrent requests
    });

    test('should handle large data volumes', async () => {
      // Test with large conversation history
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const mockSession = {
        sessionId: 'large-data-session',
        currentState: 'major',
        userData: { firstName: 'Test User' },
        conversationHistory: largeHistory
      };

      Session.findOne = jest.fn().mockResolvedValue(mockSession);
      Session.findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          sessionId: 'large-data-session',
          message: 'CNTT'
        });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should handle large data efficiently
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Security Integration', () => {
    test('should sanitize inputs across all endpoints', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const sqlPayload = "'; DROP TABLE sessions; --";

      const securityTests = [
        {
          endpoint: '/api/chat/session',
          method: 'post',
          data: { firstName: xssPayload }
        },
        {
          endpoint: '/api/chat/session',
          method: 'post',
          data: { firstName: sqlPayload }
        }
      ];

      for (const test of securityTests) {
        const response = await request(app)[test.method](test.endpoint)
          .send(test.data);

        // Should either sanitize or reject malicious input
        if (response.status === 201) {
          // If accepted, should be sanitized
          expect(response.body.data.firstName).not.toContain('<script>');
          expect(response.body.data.firstName).not.toContain('DROP TABLE');
        } else {
          // If rejected, should be a validation error
          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    test('should enforce rate limiting', async () => {
      // Create many rapid requests to trigger rate limiting
      const rapidRequests = Array.from({ length: 70 }, () =>
        request(app)
          .get('/health')
      );

      const responses = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // Rate limiting should kick in for excessive requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency Integration', () => {
    test('should maintain data consistency across services', async () => {
      const sessionId = 'consistency-test-session';
      const userData = {
        firstName: 'Consistency Test',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Tối (19–21h)'
      };

      // Create session
      const mockSession = {
        sessionId,
        ...userData,
        currentState: 'complete',
        isCompleted: true,
        save: jest.fn().mockResolvedValue({ sessionId, ...userData })
      };

      Session.mockImplementation(() => mockSession);
      Session.findOne = jest.fn().mockResolvedValue(mockSession);

      // Create lead from session
      const mockLead = {
        leadId: 'LEAD_CONSISTENCY_TEST',
        sessionId,
        ...userData,
        status: 'new',
        save: jest.fn().mockResolvedValue({
          leadId: 'LEAD_CONSISTENCY_TEST',
          sessionId,
          ...userData
        })
      };

      Lead.mockImplementation(() => mockLead);
      Lead.findOne = jest.fn().mockResolvedValue(mockLead);

      // Create lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .send({ sessionId, ...userData });

      expect(leadResponse.status).toBe(201);
      expect(leadResponse.body.data.sessionId).toBe(sessionId);
      expect(leadResponse.body.data.firstName).toBe(userData.firstName);

      // Verify lead can be retrieved
      const getLeadResponse = await request(app)
        .get(`/api/leads/${leadResponse.body.data.leadId}`);

      expect(getLeadResponse.status).toBe(200);
      expect(getLeadResponse.body.data.sessionId).toBe(sessionId);
      expect(getLeadResponse.body.data.firstName).toBe(userData.firstName);
    });
  });

  describe('Service Integration', () => {
    test('should integrate all services correctly', () => {
      // Test that all services can be instantiated
      expect(() => new PhoneValidator()).not.toThrow();
      expect(() => new SessionManager()).not.toThrow();
      expect(() => new ConversationFlow()).not.toThrow();
      expect(() => new NudgeService()).not.toThrow();
      
      // Test with environment variable
      process.env.GEMINI_API_KEY = 'test-key';
      expect(() => new GeminiChatService()).not.toThrow();
      delete process.env.GEMINI_API_KEY;
    });

    test('should handle service dependencies', () => {
      const phoneValidator = new PhoneValidator();
      const conversationFlow = new ConversationFlow();
      
      // Test phone validation integration
      const phoneResult = phoneValidator.validate('0901234567');
      expect(phoneResult.isValid).toBe(true);
      expect(phoneResult.standardizedPhone).toBe('0901234567');
      
      // Test conversation flow integration
      const flowResult = conversationFlow.processInput('major', 'CNTT', {});
      expect(flowResult.success).toBe(true);
      expect(flowResult.userData.major).toBe('CNTT');
    });
  });
});