/**
 * Admin Integration Tests
 * 
 * These tests require a running MongoDB instance
 * Run with: npm run test:integration
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Lead = require('../models/Lead');
const Session = require('../models/Session');
const database = require('../config/database');

// Skip these tests if MongoDB is not available
const MONGODB_AVAILABLE = process.env.MONGODB_URI || process.env.MONGODB_TEST_URI;

describe('Admin Integration Tests', () => {
  let server;

  beforeAll(async () => {
    if (!MONGODB_AVAILABLE) {
      console.log('Skipping integration tests - MongoDB not available');
      return;
    }

    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hsu-chatbot-test';
    await mongoose.connect(mongoUri);
    
    // Start server
    server = app.listen(0); // Use random port
  }, 30000);

  afterAll(async () => {
    if (!MONGODB_AVAILABLE) return;

    // Clean up
    await Lead.deleteMany({});
    await Session.deleteMany({});
    await mongoose.connection.close();
    
    if (server) {
      server.close();
    }
  }, 30000);

  beforeEach(async () => {
    if (!MONGODB_AVAILABLE) return;

    // Clear test data
    await Lead.deleteMany({});
    await Session.deleteMany({});
  });

  describe('GET /api/admin/stats', () => {
    beforeEach(async () => {
      if (!MONGODB_AVAILABLE) return;

      // Create test data
      const testSessions = [
        {
          sessionId: 'integration-session-1',
          userId: 'user1',
          firstName: 'Test User 1',
          currentState: 'complete',
          isCompleted: true,
          userData: {
            major: 'CNTT',
            phone: '0901234567',
            phoneStandardized: '0901234567',
            channel: 'Zalo',
            timeslot: 'Trong hôm nay'
          },
          createdAt: new Date()
        },
        {
          sessionId: 'integration-session-2',
          userId: 'user2',
          firstName: 'Test User 2',
          currentState: 'phone',
          isCompleted: false,
          userData: {
            major: 'Quản trị Kinh doanh'
          },
          createdAt: new Date()
        }
      ];

      await Session.insertMany(testSessions);

      const testLead = {
        leadId: 'INTEGRATION_LEAD_1',
        sessionId: 'integration-session-1',
        firstName: 'Test User 1',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay',
        status: 'new',
        createdAt: new Date()
      };

      await Lead.create(testLead);
    });

    it('should return comprehensive statistics with real data', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('conversations');
      expect(response.body.data).toHaveProperty('leads');
      expect(response.body.data).toHaveProperty('popularMajors');
      expect(response.body.data).toHaveProperty('channelPreferences');

      // Check conversation stats
      expect(response.body.data.conversations.total).toBe(2);
      expect(response.body.data.conversations.completed).toBe(1);
      expect(response.body.data.conversations.completionRate).toBe(50);

      // Check lead stats
      expect(response.body.data.leads.total).toBe(1);
      expect(response.body.data.popularMajors).toHaveLength(1);
      expect(response.body.data.popularMajors[0]._id).toBe('CNTT');
    });
  });

  describe('GET /api/admin/leads', () => {
    beforeEach(async () => {
      if (!MONGODB_AVAILABLE) return;

      // Create test leads with different dates and statuses
      const testLeads = [
        {
          leadId: 'INTEGRATION_LEAD_1',
          sessionId: 'session-1',
          firstName: 'Nguyen Van A',
          major: 'CNTT',
          phone: '0901234567',
          phoneStandardized: '0901234567',
          channel: 'Zalo',
          timeslot: 'Trong hôm nay',
          status: 'new',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          leadId: 'INTEGRATION_LEAD_2',
          sessionId: 'session-2',
          firstName: 'Tran Thi B',
          major: 'Quản trị Kinh doanh',
          phone: '0987654321',
          phoneStandardized: '0987654321',
          channel: 'Gọi điện',
          timeslot: 'Tối (19–21h)',
          status: 'contacted',
          createdAt: new Date('2024-01-16T14:00:00Z')
        },
        {
          leadId: 'INTEGRATION_LEAD_3',
          sessionId: 'session-3',
          firstName: 'Le Van C',
          major: 'Thiết kế',
          phone: '0912345678',
          phoneStandardized: '0912345678',
          channel: 'Email',
          timeslot: 'Cuối tuần',
          status: 'converted',
          createdAt: new Date('2024-01-17T09:00:00Z')
        }
      ];

      await Lead.insertMany(testLeads);
    });

    it('should return paginated leads list', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/leads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('leads');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.leads).toHaveLength(3);
      
      // Should be sorted by creation date (newest first)
      expect(response.body.data.leads[0].firstName).toBe('Le Van C');
      expect(response.body.data.leads[2].firstName).toBe('Nguyen Van A');
    });

    it('should filter leads by status', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/leads?status=contacted')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].status).toBe('contacted');
      expect(response.body.data.leads[0].firstName).toBe('Tran Thi B');
    });

    it('should filter leads by date range', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/leads?dateFrom=2024-01-16&dateTo=2024-01-16')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].firstName).toBe('Tran Thi B');
    });

    it('should export leads as JSON', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/leads?export=json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(response.body).toHaveProperty('exportDate');
      expect(response.body).toHaveProperty('totalLeads', 3);
      expect(response.body).toHaveProperty('leads');
      expect(response.body.leads).toHaveLength(3);
    });

    it('should handle pagination correctly', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/leads?limit=2&page=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.totalLeads).toBe(3);
    });
  });

  describe('PUT /api/admin/leads/:leadId/status', () => {
    let testLead;

    beforeEach(async () => {
      if (!MONGODB_AVAILABLE) return;

      testLead = await Lead.create({
        leadId: 'INTEGRATION_UPDATE_LEAD',
        sessionId: 'session-update',
        firstName: 'Update Test User',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay',
        status: 'new'
      });
    });

    it('should update lead status successfully', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .put('/api/admin/leads/INTEGRATION_UPDATE_LEAD/status')
        .send({ status: 'contacted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('contacted');

      // Verify in database
      const updatedLead = await Lead.findOne({ leadId: 'INTEGRATION_UPDATE_LEAD' });
      expect(updatedLead.status).toBe('contacted');
    });

    it('should return 400 for missing status', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .put('/api/admin/leads/INTEGRATION_UPDATE_LEAD/status')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent lead', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const response = await request(app)
        .put('/api/admin/leads/NON_EXISTENT_LEAD/status')
        .send({ status: 'contacted' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      if (!MONGODB_AVAILABLE) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      // Temporarily close the connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATS_ERROR');

      // Reconnect for cleanup
      const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hsu-chatbot-test';
      await mongoose.connect(mongoUri);
    });
  });
});