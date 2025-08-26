/**
 * API Endpoints Coverage Tests
 * Comprehensive tests for all API endpoints to ensure complete coverage
 */

const request = require('supertest');
const app = require('../server');
const Session = require('../models/Session');
const Lead = require('../models/Lead');

// Mock database connection
jest.mock('../config/database', () => ({
  connectDB: jest.fn()
}));

// Mock models
jest.mock('../models/Session');
jest.mock('../models/Lead');

describe('API Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health and System Endpoints', () => {
    test('GET /health - should return system health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('HSU Chatbot API is running');
      expect(response.body.environment).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /api/health - should return detailed health check', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('services');
    });
  });

  describe('Chat API Endpoints', () => {
    describe('POST /api/chat/session', () => {
      test('should create session with valid firstName', async () => {
        const mockSession = {
          sessionId: 'test-session-123',
          firstName: 'Nguyễn Văn A',
          currentState: 'welcome',
          save: jest.fn().mockResolvedValue({
            sessionId: 'test-session-123',
            firstName: 'Nguyễn Văn A'
          })
        };

        Session.mockImplementation(() => mockSession);

        const response = await request(app)
          .post('/api/chat/session')
          .send({ firstName: 'Nguyễn Văn A' });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe('test-session-123');
        expect(response.body.data.firstName).toBe('Nguyễn Văn A');
      });

      test('should reject empty firstName', async () => {
        const response = await request(app)
          .post('/api/chat/session')
          .send({ firstName: '' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should reject missing firstName', async () => {
        const response = await request(app)
          .post('/api/chat/session')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should sanitize firstName input', async () => {
        const mockSession = {
          sessionId: 'test-session-123',
          firstName: 'Clean Name',
          save: jest.fn().mockResolvedValue({
            sessionId: 'test-session-123',
            firstName: 'Clean Name'
          })
        };

        Session.mockImplementation(() => mockSession);

        const response = await request(app)
          .post('/api/chat/session')
          .send({ firstName: '<script>alert("xss")</script>Clean Name' });

        expect(response.status).toBe(201);
        expect(response.body.data.firstName).not.toContain('<script>');
      });
    });

    describe('POST /api/chat/message', () => {
      test('should process message with valid session and message', async () => {
        const mockSession = {
          sessionId: 'test-session-123',
          currentState: 'welcome',
          userData: { firstName: 'Test User' },
          conversationHistory: []
        };

        Session.findOne = jest.fn().mockResolvedValue(mockSession);
        Session.findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);

        const response = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId: 'test-session-123',
            message: 'Có, mình quan tâm'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBeDefined();
      });

      test('should reject missing sessionId', async () => {
        const response = await request(app)
          .post('/api/chat/message')
          .send({ message: 'Hello' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should reject empty message', async () => {
        const response = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId: 'test-session-123',
            message: ''
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should handle non-existent session', async () => {
        Session.findOne = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId: 'non-existent-session',
            message: 'Hello'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
      });

      test('should sanitize message input', async () => {
        const mockSession = {
          sessionId: 'test-session-123',
          currentState: 'welcome',
          userData: { firstName: 'Test User' },
          conversationHistory: []
        };

        Session.findOne = jest.fn().mockResolvedValue(mockSession);
        Session.findOneAndUpdate = jest.fn().mockResolvedValue(mockSession);

        const response = await request(app)
          .post('/api/chat/message')
          .send({
            sessionId: 'test-session-123',
            message: '<script>alert("xss")</script>Hello'
          });

        expect(response.status).toBe(200);
        // Message should be sanitized in processing
      });
    });

    describe('GET /api/chat/session/:id', () => {
      test('should retrieve existing session', async () => {
        const mockSession = {
          sessionId: 'test-session-123',
          firstName: 'Test User',
          currentState: 'welcome',
          conversationHistory: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        Session.findOne = jest.fn().mockResolvedValue(mockSession);

        const response = await request(app)
          .get('/api/chat/session/test-session-123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe('test-session-123');
      });

      test('should return 404 for non-existent session', async () => {
        Session.findOne = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/chat/session/non-existent-session');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
      });

      test('should handle invalid session ID format', async () => {
        const response = await request(app)
          .get('/api/chat/session/invalid@session#id');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Lead Management Endpoints', () => {
    describe('POST /api/leads', () => {
      test('should create lead with complete data', async () => {
        const leadData = {
          sessionId: 'test-session-123',
          firstName: 'Nguyễn Văn A',
          major: 'CNTT',
          phone: '0901234567',
          phoneStandardized: '0901234567',
          channel: 'Zalo',
          timeslot: 'Tối (19–21h)'
        };

        const mockLead = {
          leadId: 'LEAD_123',
          ...leadData,
          status: 'new',
          save: jest.fn().mockResolvedValue({
            leadId: 'LEAD_123',
            ...leadData
          })
        };

        Lead.mockImplementation(() => mockLead);

        const response = await request(app)
          .post('/api/leads')
          .send(leadData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.leadId).toBe('LEAD_123');
      });

      test('should reject incomplete lead data', async () => {
        const incompleteData = {
          firstName: 'Test User',
          major: 'CNTT'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/leads')
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should validate phone number format', async () => {
        const invalidPhoneData = {
          sessionId: 'test-session-123',
          firstName: 'Test User',
          major: 'CNTT',
          phone: '123456', // Invalid phone
          phoneStandardized: '123456',
          channel: 'Zalo',
          timeslot: 'Tối (19–21h)'
        };

        const response = await request(app)
          .post('/api/leads')
          .send(invalidPhoneData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/leads/:id', () => {
      test('should retrieve existing lead', async () => {
        const mockLead = {
          leadId: 'LEAD_123',
          firstName: 'Test User',
          major: 'CNTT',
          status: 'new',
          createdAt: new Date()
        };

        Lead.findOne = jest.fn().mockResolvedValue(mockLead);

        const response = await request(app)
          .get('/api/leads/LEAD_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.leadId).toBe('LEAD_123');
      });

      test('should return 404 for non-existent lead', async () => {
        Lead.findOne = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/leads/NON_EXISTENT_LEAD');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
      });
    });

    describe('PUT /api/leads/:id/status', () => {
      test('should update lead status', async () => {
        const updatedLead = {
          leadId: 'LEAD_123',
          status: 'contacted',
          updatedAt: new Date()
        };

        Lead.findOneAndUpdate = jest.fn().mockResolvedValue(updatedLead);

        const response = await request(app)
          .put('/api/leads/LEAD_123/status')
          .send({ status: 'contacted' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('contacted');
      });

      test('should reject invalid status', async () => {
        const response = await request(app)
          .put('/api/leads/LEAD_123/status')
          .send({ status: 'invalid_status' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should handle non-existent lead', async () => {
        Lead.findOneAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put('/api/leads/NON_EXISTENT_LEAD/status')
          .send({ status: 'contacted' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
      });
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /api/admin/stats', () => {
      test('should return comprehensive statistics', async () => {
        Lead.countDocuments = jest.fn().mockResolvedValue(100);
        Lead.aggregate = jest.fn().mockImplementation((pipeline) => {
          if (pipeline[0].$group._id === '$status') {
            return Promise.resolve([
              { _id: 'new', count: 70 },
              { _id: 'contacted', count: 25 },
              { _id: 'converted', count: 5 }
            ]);
          }
          return Promise.resolve([]);
        });

        Session.countDocuments = jest.fn().mockResolvedValue(150);

        const response = await request(app)
          .get('/api/admin/stats');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalLeads).toBe(100);
        expect(response.body.data.totalSessions).toBe(150);
        expect(response.body.data.statusBreakdown).toBeDefined();
      });
    });

    describe('GET /api/admin/leads', () => {
      test('should return paginated leads list', async () => {
        const mockLeads = [
          { leadId: 'LEAD_001', firstName: 'User 1', status: 'new' },
          { leadId: 'LEAD_002', firstName: 'User 2', status: 'contacted' }
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
          .query({ limit: 10, page: 1 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.leads).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
      });

      test('should filter leads by status', async () => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([])
        };

        Lead.find = jest.fn().mockReturnValue(mockQuery);
        Lead.countDocuments = jest.fn().mockResolvedValue(0);

        const response = await request(app)
          .get('/api/admin/leads')
          .query({ status: 'new' });

        expect(response.status).toBe(200);
        expect(Lead.find).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'new' })
        );
      });

      test('should filter leads by date range', async () => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([])
        };

        Lead.find = jest.fn().mockReturnValue(mockQuery);
        Lead.countDocuments = jest.fn().mockResolvedValue(0);

        const response = await request(app)
          .get('/api/admin/leads')
          .query({
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
          });

        expect(response.status).toBe(200);
        expect(Lead.find).toHaveBeenCalledWith(
          expect.objectContaining({
            createdAt: expect.objectContaining({
              $gte: expect.any(Date),
              $lte: expect.any(Date)
            })
          })
        );
      });

      test('should validate pagination parameters', async () => {
        const response = await request(app)
          .get('/api/admin/leads')
          .query({ limit: 200, page: 0 }); // Invalid values

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/admin/sessions', () => {
      test('should return session statistics', async () => {
        Session.countDocuments = jest.fn()
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(25)  // active
          .mockResolvedValueOnce(75); // completed

        const response = await request(app)
          .get('/api/admin/sessions');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(100);
        expect(response.body.data.active).toBe(25);
        expect(response.body.data.completed).toBe(75);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/chat/session');

      expect(response.status).toBe(405);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/chat/session')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    test('should handle large request bodies', async () => {
      const largeData = {
        firstName: 'A'.repeat(10000), // Very long name
        message: 'B'.repeat(10000)    // Very long message
      };

      const response = await request(app)
        .post('/api/chat/session')
        .send(largeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Security Tests', () => {
    test('should sanitize XSS attempts in all inputs', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/chat/session')
        .send({ firstName: xssPayload });

      // Should either reject or sanitize the input
      if (response.status === 201) {
        expect(response.body.data.firstName).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    test('should handle SQL injection attempts', async () => {
      const sqlPayload = "'; DROP TABLE sessions; --";
      
      const response = await request(app)
        .post('/api/chat/session')
        .send({ firstName: sqlPayload });

      // Should handle gracefully without exposing database errors
      expect(response.status).not.toBe(500);
    });

    test('should enforce CORS headers', async () => {
      const response = await request(app)
        .options('/api/chat/session')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});