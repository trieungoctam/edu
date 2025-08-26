/**
 * Lead Routes Integration Tests
 * Tests for lead management API endpoints
 */

const request = require('supertest');
const app = require('../server');
const database = require('../config/database');
const Lead = require('../models/Lead');

describe('Lead Routes', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await database.disconnect();
  });

  describe('POST /api/leads', () => {
    test('should create a new lead with valid data', async () => {
      const leadData = {
        sessionId: 'test-session-123',
        firstName: 'Nguyễn Văn A',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leadId).toMatch(/^LEAD_\d+_[a-f0-9]{8}$/);
      expect(response.body.data.lead.firstName).toBe('Nguyễn Văn A');
      expect(response.body.data.lead.major).toBe('CNTT');
      expect(response.body.data.lead.status).toBe('new');
    });

    test('should reject lead with invalid phone number', async () => {
      const leadData = {
        sessionId: 'test-session-456',
        firstName: 'Test User',
        major: 'CNTT',
        phone: '123456', // Invalid phone
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject lead with missing required fields', async () => {
      const leadData = {
        sessionId: 'test-session-789',
        firstName: 'Test User'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should sanitize input data', async () => {
      const leadData = {
        sessionId: 'test-session-sanitize',
        firstName: '<script>alert("xss")</script>Nguyễn Văn B',
        major: 'CNTT',
        phone: '0987654321',
        phoneStandardized: '0987654321',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(leadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.firstName).not.toContain('<script>');
      expect(response.body.data.lead.firstName).toContain('Nguyễn Văn B');
    });
  });

  describe('GET /api/leads', () => {
    test('should get all leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.leads)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/leads?status=new')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.leads)).toBe(true);
      
      // All returned leads should have status 'new'
      response.body.data.leads.forEach(lead => {
        expect(lead.status).toBe('new');
      });
    });

    test('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/leads?limit=5&page=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.page).toBe(1);
    });

    test('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/leads?status=invalid-status')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/leads/:leadId', () => {
    let testLeadId;

    beforeAll(async () => {
      // Create a test lead first
      const leadData = {
        sessionId: 'test-get-lead',
        firstName: 'Test Get User',
        major: 'CNTT',
        phone: '0901111111',
        phoneStandardized: '0901111111',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createResponse = await request(app)
        .post('/api/leads')
        .send(leadData);

      testLeadId = createResponse.body.data.leadId;
    });

    test('should get lead by ID', async () => {
      const response = await request(app)
        .get(`/api/leads/${testLeadId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leadId).toBe(testLeadId);
      expect(response.body.data.firstName).toBe('Test Get User');
    });

    test('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/leads/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should reject invalid lead ID format', async () => {
      const response = await request(app)
        .get('/api/leads/')
        .expect(404); // Should hit 404 route handler
    });
  });

  describe('PUT /api/leads/:leadId', () => {
    let testLeadId;

    beforeAll(async () => {
      // Create a test lead first
      const leadData = {
        sessionId: 'test-update-lead',
        firstName: 'Test Update User',
        major: 'CNTT',
        phone: '0902222222',
        phoneStandardized: '0902222222',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createResponse = await request(app)
        .post('/api/leads')
        .send(leadData);

      testLeadId = createResponse.body.data.leadId;
    });

    test('should update lead status', async () => {
      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .send({ status: 'contacted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('contacted');
      expect(response.body.message).toContain('cập nhật thành công');
    });

    test('should update lead notes', async () => {
      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .send({ notes: 'Đã liên hệ qua Zalo' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Đã liên hệ qua Zalo');
    });

    test('should reject invalid status', async () => {
      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject unauthorized field updates', async () => {
      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .send({ phone: '0999999999' }) // Not allowed to update phone
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .put('/api/leads/non-existent-id')
        .send({ status: 'contacted' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should sanitize notes input', async () => {
      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .send({ notes: '<script>alert("xss")</script>Ghi chú hợp lệ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).not.toContain('<script>');
      expect(response.body.data.notes).toContain('Ghi chú hợp lệ');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to lead endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 65; i++) { // Exceed the 60 request limit
        promises.push(
          request(app)
            .get('/api/leads')
            .expect(res => {
              // Should either succeed (200) or be rate limited (429)
              expect([200, 429]).toContain(res.status);
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle oversized requests', async () => {
      const largeData = {
        sessionId: 'test-large',
        firstName: 'A'.repeat(10000), // Very long name
        major: 'CNTT',
        phone: '0901234567',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(largeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});