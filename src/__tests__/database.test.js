const Session = require('../models/Session');
const Lead = require('../models/Lead');
const SessionService = require('../services/SessionService');
const LeadService = require('../services/LeadService');

describe('Database Models and Services', () => {

  describe('Model Structure', () => {
    test('Session model should have correct schema structure', () => {
      const sessionSchema = Session.schema;
      
      expect(sessionSchema.paths.sessionId).toBeDefined();
      expect(sessionSchema.paths.userId).toBeDefined();
      expect(sessionSchema.paths.firstName).toBeDefined();
      expect(sessionSchema.paths.currentState).toBeDefined();
      expect(sessionSchema.paths.userData).toBeDefined();
      expect(sessionSchema.paths.conversationHistory).toBeDefined();
      expect(sessionSchema.paths.isCompleted).toBeDefined();
      expect(sessionSchema.paths.createdAt).toBeDefined();
      expect(sessionSchema.paths.updatedAt).toBeDefined();
    });

    test('Lead model should have correct schema structure', () => {
      const leadSchema = Lead.schema;
      
      expect(leadSchema.paths.leadId).toBeDefined();
      expect(leadSchema.paths.sessionId).toBeDefined();
      expect(leadSchema.paths.firstName).toBeDefined();
      expect(leadSchema.paths.major).toBeDefined();
      expect(leadSchema.paths.phone).toBeDefined();
      expect(leadSchema.paths.phoneStandardized).toBeDefined();
      expect(leadSchema.paths.channel).toBeDefined();
      expect(leadSchema.paths.timeslot).toBeDefined();
      expect(leadSchema.paths.status).toBeDefined();
      expect(leadSchema.paths.createdAt).toBeDefined();
    });
  });

  describe('Service Classes', () => {
    test('SessionService should be instantiable', () => {
      const sessionService = new SessionService();
      expect(sessionService).toBeDefined();
      expect(typeof sessionService.createSession).toBe('function');
      expect(typeof sessionService.getSession).toBe('function');
      expect(typeof sessionService.updateSession).toBe('function');
      expect(typeof sessionService.addMessage).toBe('function');
      expect(typeof sessionService.completeSession).toBe('function');
      expect(typeof sessionService.cleanupOldSessions).toBe('function');
    });

    test('LeadService should be instantiable', () => {
      const leadService = new LeadService();
      expect(leadService).toBeDefined();
      expect(typeof leadService.createLead).toBe('function');
      expect(typeof leadService.getLead).toBe('function');
      expect(typeof leadService.getLeads).toBe('function');
      expect(typeof leadService.updateLeadStatus).toBe('function');
      expect(typeof leadService.getLeadStats).toBe('function');
      expect(typeof leadService.deleteLead).toBe('function');
    });
  });

  describe('Data Validation', () => {
    test('Session model should validate required fields', () => {
      const session = new Session();
      const validationError = session.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError.errors.sessionId).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.firstName).toBeDefined();
    });

    test('Lead model should validate required fields', () => {
      const lead = new Lead();
      const validationError = lead.validateSync();
      
      expect(validationError).toBeDefined();
      expect(validationError.errors.leadId).toBeDefined();
      expect(validationError.errors.sessionId).toBeDefined();
      expect(validationError.errors.firstName).toBeDefined();
      expect(validationError.errors.major).toBeDefined();
      expect(validationError.errors.phone).toBeDefined();
      expect(validationError.errors.phoneStandardized).toBeDefined();
      expect(validationError.errors.channel).toBeDefined();
      expect(validationError.errors.timeslot).toBeDefined();
    });

    test('Lead model should validate channel enum values', () => {
      const lead = new Lead({
        leadId: 'test-lead',
        sessionId: 'test-session',
        firstName: 'Test',
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'InvalidChannel',
        timeslot: 'Test time'
      });
      
      const validationError = lead.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.channel).toBeDefined();
    });
  });
});