const express = require('express');
const router = express.Router();
const LeadService = require('../services/LeadService');
const Session = process.env.IN_MEMORY_STORAGE === 'true' ? null : require('../models/Session');
const SessionManager = require('../services/SessionManager');
const sessionManager = new SessionManager();
const ErrorHandler = require('../middleware/errorHandler');
const ValidationMiddleware = require('../middleware/validation');

const leadService = new LeadService();
const validator = new ValidationMiddleware();

/**
 * GET /api/admin/stats
 * Get basic metrics including total conversations, leads, completion rates, and popular majors
 */
router.get('/stats', ErrorHandler.asyncHandler(async (req, res) => {
  // Get lead statistics
  const leadStats = await leadService.getLeadStats();
  
    // Get session statistics (support in-memory mode)
    let totalSessions, completedSessions, sessionsToday, sessionsThisWeek, completionRate;
    if (process.env.IN_MEMORY_STORAGE === 'true') {
      const stats = await sessionManager.getSessionStats();
      totalSessions = stats.total;
      completedSessions = stats.completed;
      completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(2) : 0;
      const today = new Date(); today.setHours(0,0,0,0);
      sessionsToday = Array.from(sessionManager.memoryStore.values()).filter(s => new Date(s.createdAt) >= today).length;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      sessionsThisWeek = Array.from(sessionManager.memoryStore.values()).filter(s => new Date(s.createdAt) >= weekAgo).length;
    } else {
      totalSessions = await Session.countDocuments();
      completedSessions = await Session.countDocuments({ isCompleted: true });
      completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(2) : 0;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      sessionsToday = await Session.countDocuments({ createdAt: { $gte: today } });
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      sessionsThisWeek = await Session.countDocuments({ createdAt: { $gte: weekAgo } });
    }

    const stats = {
      conversations: {
        total: totalSessions,
        completed: completedSessions,
        completionRate: parseFloat(completionRate),
        today: sessionsToday,
        thisWeek: sessionsThisWeek
      },
      leads: {
        total: leadStats.totalLeads,
        today: leadStats.leadsToday,
        thisWeek: leadStats.leadsThisWeek,
        statusBreakdown: leadStats.statusBreakdown
      },
      popularMajors: leadStats.popularMajors,
      channelPreferences: leadStats.channelPreferences
    };

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/admin/leads
 * Get leads with optional date filtering and pagination
 * Query parameters:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - status: Filter by status (new, contacted, converted)
 * - limit: Number of results per page (default: 50)
 * - page: Page number (default: 1)
 * - export: Set to 'json' to export all matching leads
 */
router.get('/leads', validator.validateAdminRequest, ErrorHandler.asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, status, limit = 50, page = 1, export: exportFormat } = req.query;
    
    // Build filters
    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (status) filters.status = status;
    
    // For export, get all matching leads without pagination
    if (exportFormat === 'json') {
      const allLeads = await leadService.getLeads(filters);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="hsu-leads-${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.json({
        exportDate: new Date().toISOString(),
        totalLeads: allLeads.length,
        filters: filters,
        leads: allLeads
      });
    }
    
    // Regular paginated response
    const options = {
      limit: Math.min(parseInt(limit), 100), // Cap at 100 per page
      skip: (parseInt(page) - 1) * parseInt(limit)
    };
    
    const leads = await leadService.getLeads(filters, options);
    
    // Get total count for pagination info
    const totalCount = await leadService.getLeads(filters);
    const totalPages = Math.ceil(totalCount.length / options.limit);
    
  res.json({
    success: true,
    data: {
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads: totalCount.length,
        leadsPerPage: options.limit
      },
      filters: filters
    }
  });
}));

/**
 * PUT /api/admin/leads/:leadId/status
 * Update lead status
 */
router.put('/leads/:leadId/status', ErrorHandler.asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { status } = req.body;
  
  // Validate lead ID
  if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
    return res.status(400).json(
      ErrorHandler.handleValidationError('leadId', leadId, 'Lead ID không hợp lệ')
    );
  }
  
  // Validate status
  const validStatuses = ['new', 'contacted', 'converted'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json(
      ErrorHandler.handleValidationError('status', status, 'Trạng thái không hợp lệ')
    );
  }
    
  const updatedLead = await leadService.updateLeadStatus(leadId.trim(), status);
  
  if (!updatedLead) {
    return res.status(404).json(
      ErrorHandler.formatError('NOT_FOUND', 'Không tìm thấy lead')
    );
  }
  
  res.json({
    success: true,
    data: updatedLead
  });
}));

module.exports = router;