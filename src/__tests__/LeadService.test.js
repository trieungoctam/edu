/**
 * LeadService Tests
 * Tests for lead management functionality
 */

const LeadService = require('../services/LeadService');
const Lead = require('../models/Lead');
const database = require('../config/database');

describe('LeadService', () => {
  let leadService;

  beforeAll(async () => {
    await database.connect();
    leadService = new LeadService();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up leads before each test
    await Lead.deleteMany({});
  });

  describe('createLead', () => {
    test('should create a lead from session data format', async () => {
      const sessionData = {
        sessionId: 'test-session-123',
        firstName: 'Nguyễn Văn A',
        userData: {
          major: 'CNTT',
          phone: '0901234567',
          phoneStandardized: '0901234567',
          channel: 'Zalo',
          timeslot: 'Trong hôm nay'
        }
      };

      const lead = await leadService.createLead(sessionData);

      expect(lead).toBeDefined();
      expect(lead.leadId).toMatch(/^LEAD_\d+_[a-f0-9]{8}$/);
      expect(lead.sessionId).toBe('test-session-123');
      expect(lead.firstName).toBe('Nguyễn Văn A');
      expect(lead.major).toBe('CNTT');
      expect(lead.channel).toBe('Zalo');
      expect(lead.timeslot).toBe('Trong hôm nay');
      expect(lead.status).toBe('new');
    });

    test('should create a lead from direct data format', async () => {
      const leadData = {
        sessionId: 'test-session-456',
        firstName: 'Trần Thị B',
        major: 'Thiết kế',
        phone: '0987654321',
        phoneStandardized: '0987654321',
        channel: 'Gọi điện',
        timeslot: 'Tối (19–21h)'
      };

      const lead = await leadService.createLead(leadData);

      expect(lead).toBeDefined();
      expect(lead.leadId).toMatch(/^LEAD_\d+_[a-f0-9]{8}$/);
      expect(lead.sessionId).toBe('test-session-456');
      expect(lead.firstName).toBe('Trần Thị B');
      expect(lead.major).toBe('Thiết kế');
      expect(lead.channel).toBe('Gọi điện');
      expect(lead.timeslot).toBe('Tối (19–21h)');
      expect(lead.status).toBe('new');
    });

    test('should handle phone number encryption', async () => {
      const leadData = {
        sessionId: 'test-session-789',
        firstName: 'Lê Văn C',
        major: 'Quản trị Kinh doanh',
        phone: '0912345678',
        phoneStandardized: '0912345678',
        channel: 'Email',
        timeslot: 'Cuối tuần'
      };

      const lead = await leadService.createLead(leadData);

      // Phone numbers should be encrypted in database
      const savedLead = await Lead.findOne({ leadId: lead.leadId });
      expect(savedLead.phoneEncrypted).toBeDefined();
      expect(savedLead.phoneStandardizedEncrypted).toBeDefined();
      
      // But accessible through methods
      const decryptedPhones = savedLead.getDecryptedPhones();
      expect(decryptedPhones.phone).toBe('0912345678');
      expect(decryptedPhones.phoneStandardized).toBe('0912345678');
    });
  });

  describe('getLeadById', () => {
    test('should retrieve lead by ID', async () => {
      const leadData = {
        sessionId: 'test-session-get',
        firstName: 'Test User',
        major: 'CNTT',
        phone: '0901111111',
        phoneStandardized: '0901111111',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createdLead = await leadService.createLead(leadData);
      const retrievedLead = await leadService.getLeadById(createdLead.leadId);

      expect(retrievedLead).toBeDefined();
      expect(retrievedLead.leadId).toBe(createdLead.leadId);
      expect(retrievedLead.firstName).toBe('Test User');
    });

    test('should return null for non-existent lead', async () => {
      const lead = await leadService.getLeadById('non-existent-id');
      expect(lead).toBeNull();
    });
  });

  describe('updateLead', () => {
    test('should update lead status', async () => {
      const leadData = {
        sessionId: 'test-session-update',
        firstName: 'Update Test',
        major: 'CNTT',
        phone: '0902222222',
        phoneStandardized: '0902222222',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createdLead = await leadService.createLead(leadData);
      const updatedLead = await leadService.updateLead(createdLead.leadId, {
        status: 'contacted'
      });

      expect(updatedLead).toBeDefined();
      expect(updatedLead.status).toBe('contacted');
      expect(updatedLead.updatedAt).toBeDefined();
    });

    test('should update lead notes', async () => {
      const leadData = {
        sessionId: 'test-session-notes',
        firstName: 'Notes Test',
        major: 'CNTT',
        phone: '0903333333',
        phoneStandardized: '0903333333',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createdLead = await leadService.createLead(leadData);
      const updatedLead = await leadService.updateLead(createdLead.leadId, {
        notes: 'Đã liên hệ qua Zalo'
      });

      expect(updatedLead).toBeDefined();
      expect(updatedLead.notes).toBe('Đã liên hệ qua Zalo');
    });

    test('should return null for non-existent lead', async () => {
      const result = await leadService.updateLead('non-existent-id', {
        status: 'contacted'
      });
      expect(result).toBeNull();
    });
  });

  describe('getLeads', () => {
    beforeEach(async () => {
      // Create test leads
      const testLeads = [
        {
          sessionId: 'session-1',
          firstName: 'User 1',
          major: 'CNTT',
          phone: '0901111111',
          phoneStandardized: '0901111111',
          channel: 'Zalo',
          timeslot: 'Trong hôm nay',
          status: 'new'
        },
        {
          sessionId: 'session-2',
          firstName: 'User 2',
          major: 'Thiết kế',
          phone: '0902222222',
          phoneStandardized: '0902222222',
          channel: 'Gọi điện',
          timeslot: 'Tối (19–21h)',
          status: 'contacted'
        }
      ];

      for (const leadData of testLeads) {
        await leadService.createLead(leadData);
      }
    });

    test('should get all leads', async () => {
      const leads = await leadService.getLeads();
      expect(leads).toHaveLength(2);
    });

    test('should filter leads by status', async () => {
      const newLeads = await leadService.getLeads({ status: 'new' });
      const contactedLeads = await leadService.getLeads({ status: 'contacted' });

      expect(newLeads).toHaveLength(1);
      expect(contactedLeads).toHaveLength(1);
      expect(newLeads[0].status).toBe('new');
      expect(contactedLeads[0].status).toBe('contacted');
    });

    test('should apply pagination', async () => {
      const leads = await leadService.getLeads({}, { limit: 1 });
      expect(leads).toHaveLength(1);
    });
  });

  describe('getLeadStats', () => {
    beforeEach(async () => {
      // Create test leads with different statuses and majors
      const testLeads = [
        {
          sessionId: 'stats-1',
          firstName: 'Stats User 1',
          major: 'CNTT',
          phone: '0901111111',
          phoneStandardized: '0901111111',
          channel: 'Zalo',
          timeslot: 'Trong hôm nay',
          status: 'new'
        },
        {
          sessionId: 'stats-2',
          firstName: 'Stats User 2',
          major: 'CNTT',
          phone: '0902222222',
          phoneStandardized: '0902222222',
          channel: 'Gọi điện',
          timeslot: 'Tối (19–21h)',
          status: 'contacted'
        },
        {
          sessionId: 'stats-3',
          firstName: 'Stats User 3',
          major: 'Thiết kế',
          phone: '0903333333',
          phoneStandardized: '0903333333',
          channel: 'Email',
          timeslot: 'Cuối tuần',
          status: 'converted'
        }
      ];

      for (const leadData of testLeads) {
        await leadService.createLead(leadData);
      }
    });

    test('should return comprehensive statistics', async () => {
      const stats = await leadService.getLeadStats();

      expect(stats.totalLeads).toBe(3);
      expect(stats.leadsToday).toBeGreaterThanOrEqual(3);
      expect(stats.leadsThisWeek).toBeGreaterThanOrEqual(3);
      
      expect(stats.statusBreakdown).toEqual({
        new: 1,
        contacted: 1,
        converted: 1
      });

      expect(stats.popularMajors).toHaveLength(2);
      expect(stats.popularMajors[0]._id).toBe('CNTT');
      expect(stats.popularMajors[0].count).toBe(2);

      expect(stats.channelPreferences).toEqual({
        'Zalo': 1,
        'Gọi điện': 1,
        'Email': 1
      });
    });
  });

  describe('updateLeadStatus', () => {
    test('should update lead status with validation', async () => {
      const leadData = {
        sessionId: 'status-test',
        firstName: 'Status Test',
        major: 'CNTT',
        phone: '0904444444',
        phoneStandardized: '0904444444',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createdLead = await leadService.createLead(leadData);
      const updatedLead = await leadService.updateLeadStatus(createdLead.leadId, 'contacted');

      expect(updatedLead).toBeDefined();
      expect(updatedLead.status).toBe('contacted');
    });

    test('should reject invalid status', async () => {
      const leadData = {
        sessionId: 'invalid-status-test',
        firstName: 'Invalid Status Test',
        major: 'CNTT',
        phone: '0905555555',
        phoneStandardized: '0905555555',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      };

      const createdLead = await leadService.createLead(leadData);
      
      await expect(
        leadService.updateLeadStatus(createdLead.leadId, 'invalid-status')
      ).rejects.toThrow('Invalid status');
    });
  });
});