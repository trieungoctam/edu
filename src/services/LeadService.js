const Lead = process.env.IN_MEMORY_STORAGE === 'true' ? null : require('../models/Lead');
const { v4: uuidv4 } = require('uuid');

class LeadService {
  constructor() {
    this.useMemory = process.env.IN_MEMORY_STORAGE === 'true';
    if (this.useMemory) {
      this.memoryLeads = new Map(); // leadId -> lead
    }
  }
  /**
   * Create a new lead from completed session or direct data
   * @param {Object} leadData - Lead data (can be session data or direct lead data)
   * @returns {Promise<Object>} Created lead
   */
  async createLead(leadData) {
    try {
      const leadId = `LEAD_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Handle both session data format and direct lead data format
      const leadInfo = {
        leadId,
        sessionId: leadData.sessionId,
        firstName: leadData.firstName,
        major: leadData.userData ? leadData.userData.major : leadData.major,
        phone: leadData.userData ? leadData.userData.phone : leadData.phone,
        phoneStandardized: leadData.userData ? leadData.userData.phoneStandardized : leadData.phoneStandardized,
        channel: leadData.userData ? leadData.userData.channel : leadData.channel,
        timeslot: leadData.userData ? leadData.userData.timeslot : leadData.timeslot,
        status: leadData.status || 'new'
      };

      let savedLead;
      if (this.useMemory) {
        const toSave = {
          ...leadInfo,
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.memoryLeads.set(leadId, toSave);
        savedLead = this.memoryLeads.get(leadId);
      } else {
        const lead = new Lead(leadInfo);
        savedLead = await lead.save();
      }
      console.log(`Lead created: ${leadId}`);
      return savedLead;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  /**
   * Get lead by lead ID
   * @param {string} leadId - Lead identifier
   * @returns {Promise<Object|null>} Lead data or null if not found
   */
  async getLead(leadId) {
    try {
      if (this.useMemory) {
        return this.memoryLeads.get(leadId) || null;
      } else {
        const lead = await Lead.findOne({ leadId });
        return lead;
      }
    } catch (error) {
      console.error('Error retrieving lead:', error);
      throw new Error(`Failed to retrieve lead: ${error.message}`);
    }
  }

  /**
   * Get lead by lead ID (alias for getLead)
   * @param {string} leadId - Lead identifier
   * @returns {Promise<Object|null>} Lead data or null if not found
   */
  async getLeadById(leadId) {
    return this.getLead(leadId);
  }

  /**
   * Get all leads with optional filtering
   * @param {Object} filters - Optional filters (status, dateFrom, dateTo)
   * @param {Object} options - Optional pagination and sorting
   * @returns {Promise<Array>} Array of leads
   */
  async getLeads(filters = {}, options = {}) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.createdAt.$lte = new Date(filters.dateTo);
        }
      }

      // Set up query with options
      if (this.useMemory) {
        let leads = Array.from(this.memoryLeads.values());
        // Filtering
        if (query.status) {
          leads = leads.filter(l => l.status === query.status);
        }
        if (query.createdAt) {
          if (query.createdAt.$gte) {
            const from = new Date(query.createdAt.$gte);
            leads = leads.filter(l => new Date(l.createdAt) >= from);
          }
          if (query.createdAt.$lte) {
            const to = new Date(query.createdAt.$lte);
            leads = leads.filter(l => new Date(l.createdAt) <= to);
          }
        }
        // Sorting
        leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Pagination
        const start = options.skip ? parseInt(options.skip) : 0;
        const end = options.limit ? start + parseInt(options.limit) : undefined;
        return leads.slice(start, end);
      } else {
        let leadQuery = Lead.find(query);
        const sortBy = options.sortBy || { createdAt: -1 };
        leadQuery = leadQuery.sort(sortBy);
        if (options.limit) {
          leadQuery = leadQuery.limit(parseInt(options.limit));
        }
        if (options.skip) {
          leadQuery = leadQuery.skip(parseInt(options.skip));
        }
        const leads = await leadQuery.exec();
        return leads;
      }
    } catch (error) {
      console.error('Error retrieving leads:', error);
      throw new Error(`Failed to retrieve leads: ${error.message}`);
    }
  }

  /**
   * Update lead status
   * @param {string} leadId - Lead identifier
   * @param {string} status - New status ('new', 'contacted', 'converted')
   * @returns {Promise<Object|null>} Updated lead or null if not found
   */
  async updateLeadStatus(leadId, status) {
    try {
      const validStatuses = ['new', 'contacted', 'converted'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      let lead;
      if (this.useMemory) {
        const existing = this.memoryLeads.get(leadId);
        if (!existing) return null;
        const updated = { ...existing, status, updatedAt: new Date() };
        this.memoryLeads.set(leadId, updated);
        lead = updated;
      } else {
        lead = await Lead.findOneAndUpdate(
          { leadId },
          { status },
          { new: true, runValidators: true }
        );
      }

      if (lead) {
        console.log(`Lead ${leadId} status updated to: ${status}`);
      }
      
      return lead;
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw new Error(`Failed to update lead status: ${error.message}`);
    }
  }

  /**
   * Get lead statistics
   * @returns {Promise<Object>} Lead statistics
   */
  async getLeadStats() {
    try {
      if (this.useMemory) {
        const values = Array.from(this.memoryLeads.values());
        const totalLeads = values.length;
        const today = new Date();
        today.setHours(0,0,0,0);
        const leadsToday = values.filter(l => new Date(l.createdAt) >= today).length;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const leadsThisWeek = values.filter(l => new Date(l.createdAt) >= weekAgo).length;
        const statusBreakdown = values.reduce((acc, l) => { acc[l.status] = (acc[l.status]||0)+1; return acc; }, {});
        const popularMajors = Object.entries(values.reduce((acc, l) => { acc[l.major] = (acc[l.major]||0)+1; return acc; }, {}))
          .map(([major, count]) => ({ _id: major, count }))
          .sort((a,b)=>b.count-a.count);
        const channelPreferences = values.reduce((acc, l) => { acc[l.channel] = (acc[l.channel]||0)+1; return acc; }, {});
        return { totalLeads, leadsToday, leadsThisWeek, statusBreakdown, popularMajors, channelPreferences };
      } else {
        const totalLeads = await Lead.countDocuments();
        const statusStats = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const majorStats = await Lead.aggregate([{ $group: { _id: '$major', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
        const channelStats = await Lead.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }]);
        const today = new Date(); today.setHours(0,0,0,0);
        const leadsToday = await Lead.countDocuments({ createdAt: { $gte: today } });
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const leadsThisWeek = await Lead.countDocuments({ createdAt: { $gte: weekAgo } });
        return {
          totalLeads,
          leadsToday,
          leadsThisWeek,
          statusBreakdown: statusStats.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
          popularMajors: majorStats,
          channelPreferences: channelStats.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {})
        };
      }
    } catch (error) {
      console.error('Error getting lead statistics:', error);
      throw new Error(`Failed to get lead statistics: ${error.message}`);
    }
  }

  /**
   * Delete lead by ID
   * @param {string} leadId - Lead identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteLead(leadId) {
    try {
      if (this.useMemory) {
        return this.memoryLeads.delete(leadId);
      } else {
        const result = await Lead.deleteOne({ leadId });
        return result.deletedCount > 0;
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw new Error(`Failed to delete lead: ${error.message}`);
    }
  }

  /**
   * Get leads by session ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Lead data or null if not found
   */
  async getLeadBySession(sessionId) {
    try {
      if (this.useMemory) {
        return Array.from(this.memoryLeads.values()).find(l => l.sessionId === sessionId) || null;
      } else {
        const lead = await Lead.findOne({ sessionId });
        return lead;
      }
    } catch (error) {
      console.error('Error retrieving lead by session:', error);
      throw new Error(`Failed to retrieve lead by session: ${error.message}`);
    }
  }

  /**
   * Update lead information
   * @param {string} leadId - Lead identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated lead or null if not found
   */
  async updateLead(leadId, updates) {
    try {
      const allowedUpdates = ['status', 'notes'];
      const filteredUpdates = {};
      
      // Only allow specific fields to be updated
      for (const key of Object.keys(updates)) {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      }

      let lead;
      if (this.useMemory) {
        const existing = this.memoryLeads.get(leadId);
        if (!existing) return null;
        const updated = { ...existing, ...filteredUpdates, updatedAt: new Date() };
        this.memoryLeads.set(leadId, updated);
        lead = updated;
      } else {
        lead = await Lead.findOneAndUpdate(
          { leadId },
          filteredUpdates,
          { new: true, runValidators: true }
        );
      }

      if (lead) {
        console.log(`Lead ${leadId} updated:`, Object.keys(filteredUpdates));
      }
      
      return lead;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }
}

module.exports = LeadService;