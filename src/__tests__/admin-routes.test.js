const LeadService = require('../services/LeadService');
const Lead = require('../models/Lead');
const Session = require('../models/Session');

// Mock the models
jest.mock('../models/Lead');
jest.mock('../models/Session');

// Mock database connection
jest.mock('../config/database', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  getConnectionStatus: jest.fn().mockReturnValue({ isConnected: true })
}));

describe('Admin Routes - LeadService', () => {
  let leadService;

  beforeEach(() => {
    leadService = new LeadService();
    jest.clearAllMocks();
  });

  describe('getLeadStats', () => {
    it('should return comprehensive lead statistics', async () => {
      // Mock Lead model methods
      Lead.countDocuments.mockResolvedValue(5);
      Lead.aggregate.mockImplementation((pipeline) => {
        if (pipeline[0].$group._id === '$status') {
          return Promise.resolve([
            { _id: 'new', count: 3 },
            { _id: 'contacted', count: 2 }
          ]);
        }
        if (pipeline[0].$group._id === '$major') {
          return Promise.resolve([
            { _id: 'CNTT', count: 3 },
            { _id: 'Quản trị Kinh doanh', count: 2 }
          ]);
        }
        if (pipeline[0].$group._id === '$channel') {
          return Promise.resolve([
            { _id: 'Zalo', count: 3 },
            { _id: 'Gọi điện', count: 2 }
          ]);
        }
      });

      const stats = await leadService.getLeadStats();

      expect(stats).toHaveProperty('totalLeads', 5);
      expect(stats).toHaveProperty('statusBreakdown');
      expect(stats).toHaveProperty('popularMajors');
      expect(stats).toHaveProperty('channelPreferences');
      expect(stats.statusBreakdown).toEqual({ new: 3, contacted: 2 });
    });
  });

  describe('getLeads', () => {
    it('should return filtered leads', async () => {
      const mockLeads = [
        {
          leadId: 'LEAD_TEST_1',
          firstName: 'Nguyen Van A',
          major: 'CNTT',
          status: 'new',
          createdAt: new Date('2024-01-15')
        },
        {
          leadId: 'LEAD_TEST_2',
          firstName: 'Tran Thi B',
          major: 'Quản trị Kinh doanh',
          status: 'contacted',
          createdAt: new Date('2024-01-16')
        }
      ];

      // Mock Lead.find to return a query object with chaining methods
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLeads)
      };

      Lead.find.mockReturnValue(mockQuery);

      const leads = await leadService.getLeads();

      expect(Lead.find).toHaveBeenCalled();
      expect(leads).toEqual(mockLeads);
      expect(leads).toHaveLength(2);
    });

    it('should apply status filter', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      Lead.find.mockReturnValue(mockQuery);

      await leadService.getLeads({ status: 'new' });

      expect(Lead.find).toHaveBeenCalledWith({ status: 'new' });
    });
  });

  describe('updateLeadStatus', () => {
    it('should update lead status successfully', async () => {
      const mockUpdatedLead = {
        leadId: 'LEAD_TEST_UPDATE',
        status: 'contacted',
        firstName: 'Test User'
      };

      Lead.findOneAndUpdate.mockResolvedValue(mockUpdatedLead);

      const result = await leadService.updateLeadStatus('LEAD_TEST_UPDATE', 'contacted');

      expect(Lead.findOneAndUpdate).toHaveBeenCalledWith(
        { leadId: 'LEAD_TEST_UPDATE' },
        { status: 'contacted' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedLead);
    });

    it('should return null for non-existent lead', async () => {
      Lead.findOneAndUpdate.mockResolvedValue(null);

      const result = await leadService.updateLeadStatus('NON_EXISTENT', 'contacted');

      expect(result).toBeNull();
    });

    it('should throw error for invalid status', async () => {
      await expect(leadService.updateLeadStatus('LEAD_TEST', 'invalid_status'))
        .rejects.toThrow('Invalid status: invalid_status');
    });
  });

  describe('createLead', () => {
    it('should create a new lead successfully', async () => {
      const sessionData = {
        sessionId: 'test-session',
        firstName: 'Test User',
        userData: {
          major: 'CNTT',
          phone: '0901234567',
          phoneStandardized: '0901234567',
          channel: 'Zalo',
          timeslot: 'Trong hôm nay'
        }
      };

      const mockSavedLead = {
        leadId: 'LEAD_123',
        ...sessionData,
        status: 'new'
      };

      // Mock the Lead constructor and save method
      const mockSave = jest.fn().mockResolvedValue(mockSavedLead);
      Lead.mockImplementation(() => ({
        save: mockSave
      }));

      const result = await leadService.createLead(sessionData);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockSavedLead);
    });
  });
});