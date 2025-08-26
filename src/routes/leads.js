/**
 * Lead Management Routes
 * Handles lead creation and management endpoints
 */

const express = require('express');
const router = express.Router();
const LeadService = require('../services/LeadService');
const ErrorHandler = require('../middleware/errorHandler');
const ValidationMiddleware = require('../middleware/validation');

const leadService = new LeadService();
const validator = new ValidationMiddleware();

/**
 * POST /api/leads
 * Create a new lead from completed conversation
 */
router.post('/', validator.validateLeadRequest, ErrorHandler.asyncHandler(async (req, res) => {
  const { sessionId, firstName, major, phone, channel, timeslot, phoneStandardized } = req.body;

  // Create lead with validated and sanitized data
  const leadData = {
    sessionId,
    firstName,
    major,
    phone,
    phoneStandardized: phoneStandardized || phone, // Use standardized if provided, otherwise use original
    channel,
    timeslot,
    status: 'new' // Default status for new leads
  };

  const lead = await leadService.createLead(leadData);

  res.status(201).json({
    success: true,
    data: {
      leadId: lead.leadId,
      message: 'Lead đã được tạo thành công',
      lead: lead
    }
  });
}));

/**
 * GET /api/leads/:leadId
 * Get specific lead by ID
 */
router.get('/:leadId', ErrorHandler.asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  // Validate lead ID
  if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
    return res.status(400).json(
      ErrorHandler.handleValidationError('leadId', leadId, 'Lead ID không hợp lệ')
    );
  }

  const lead = await leadService.getLeadById(leadId.trim());

  if (!lead) {
    return res.status(404).json(
      ErrorHandler.formatError('NOT_FOUND', 'Không tìm thấy lead')
    );
  }

  res.json({
    success: true,
    data: lead
  });
}));

/**
 * GET /api/leads
 * Get all leads with optional filtering
 */
router.get('/', validator.validateAdminRequest, ErrorHandler.asyncHandler(async (req, res) => {
  const { status, dateFrom, dateTo, limit = 50, page = 1 } = req.query;

  // Build filters
  const filters = {};
  if (status) filters.status = status;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  // Build options for pagination
  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    sortBy: { createdAt: -1 }
  };

  const leads = await leadService.getLeads(filters, options);

  res.json({
    success: true,
    data: {
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: leads.length
      }
    }
  });
}));

/**
 * PUT /api/leads/:leadId
 * Update lead information
 */
router.put('/:leadId', ErrorHandler.asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const updates = req.body;

  // Validate lead ID
  if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
    return res.status(400).json(
      ErrorHandler.handleValidationError('leadId', leadId, 'Lead ID không hợp lệ')
    );
  }

  // Validate update fields if provided
  const allowedUpdates = ['status', 'notes'];
  const updateKeys = Object.keys(updates);
  
  for (const key of updateKeys) {
    if (!allowedUpdates.includes(key)) {
      return res.status(400).json(
        ErrorHandler.handleValidationError(key, updates[key], `Trường ${key} không được phép cập nhật`)
      );
    }
  }

  // Validate status if being updated
  if (updates.status) {
    const validStatuses = ['new', 'contacted', 'converted'];
    if (!validStatuses.includes(updates.status)) {
      return res.status(400).json(
        ErrorHandler.handleValidationError('status', updates.status, 'Trạng thái không hợp lệ')
      );
    }
  }

  // Sanitize notes if provided
  if (updates.notes) {
    updates.notes = validator.sanitizeString(updates.notes, 1000);
  }

  const updatedLead = await leadService.updateLead(leadId.trim(), updates);

  if (!updatedLead) {
    return res.status(404).json(
      ErrorHandler.formatError('NOT_FOUND', 'Không tìm thấy lead')
    );
  }

  res.json({
    success: true,
    data: updatedLead,
    message: 'Lead đã được cập nhật thành công'
  });
}));

module.exports = router;