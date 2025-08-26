/**
 * Tests for ConversationFlow class
 * Covers state transitions, validation, and message templating
 */

const ConversationFlow = require('../services/ConversationFlow');

describe('ConversationFlow', () => {
  let conversationFlow;

  beforeEach(() => {
    conversationFlow = new ConversationFlow();
  });

  describe('State Management', () => {
    test('should return valid state configuration', () => {
      const welcomeState = conversationFlow.getState('welcome');
      expect(welcomeState).toBeDefined();
      expect(welcomeState.message).toContain('Chào {{first_name}}');
      expect(welcomeState.quickReplies).toHaveLength(3);
    });

    test('should return null for invalid state', () => {
      const invalidState = conversationFlow.getState('invalid_state');
      expect(invalidState).toBeNull();
    });

    test('should check if conversation is complete', () => {
      expect(conversationFlow.isConversationComplete('complete')).toBe(true);
      expect(conversationFlow.isConversationComplete('welcome')).toBe(false);
    });
  });

  describe('Message Templating', () => {
    test('should replace template variables in messages', () => {
      const userData = {
        first_name: 'Minh',
        major: 'CNTT',
        phone_standardized: '0901234567'
      };

      const message = conversationFlow.generateMessage('welcome', userData);
      expect(message).toContain('Chào Minh');
      expect(message).not.toContain('{{first_name}}');
    });

    test('should handle missing template variables gracefully', () => {
      const userData = { major: 'CNTT' };
      const message = conversationFlow.generateMessage('welcome', userData);
      expect(message).toContain('{{first_name}}'); // Should remain unreplaced
    });

    test('should generate complete message with all variables', () => {
      const userData = {
        first_name: 'An',
        major: 'Thiết kế',
        channel: 'Zalo',
        timeslot: 'Tối (19–21h)'
      };

      const message = conversationFlow.generateMessage('complete', userData);
      expect(message).toContain('An');
      expect(message).toContain('Thiết kế');
      expect(message).toContain('Zalo');
      expect(message).toContain('Tối (19–21h)');
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate correct Vietnamese phone numbers', () => {
      const validPhones = [
        '0901234567',
        '0351234567',
        '0781234567',
        '+84901234567',
        '+84351234567',
        '0 90 123 4567', // with spaces
        '090-123-4567'   // with dashes
      ];

      validPhones.forEach(phone => {
        const result = conversationFlow.validatePhone(phone, {});
        expect(result.isValid).toBe(true);
        expect(result.processedData.phone_standardized).toMatch(/^0[3|5|7|8|9]\d{8}$/);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789',     // too short
        '01234567890',   // wrong prefix
        '0123456789',    // invalid prefix
        '+841234567890', // invalid format
        'abc123456789',  // contains letters
        '0901234',       // too short
        ''               // empty
      ];

      invalidPhones.forEach(phone => {
        const result = conversationFlow.validatePhone(phone, {});
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should standardize +84 format to 0 format', () => {
      const result = conversationFlow.validatePhone('+84901234567', {});
      expect(result.isValid).toBe(true);
      expect(result.processedData.phone_standardized).toBe('0901234567');
    });
  });

  describe('State Transitions', () => {
    test('should transition from welcome to major', () => {
      const result = conversationFlow.processInput('welcome', 'Có, mình quan tâm', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('major');
    });

    test('should transition from major to major_other when selecting "Khác"', () => {
      const result = conversationFlow.processInput('major', 'Khác', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('major_other');
    });

    test('should transition from major to phone for standard majors', () => {
      const result = conversationFlow.processInput('major', 'CNTT', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('phone');
      expect(result.userData.major).toBe('CNTT');
    });

    test('should transition from phone to channel with valid phone', () => {
      const result = conversationFlow.processInput('phone', '0901234567', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel');
      expect(result.userData.phone_standardized).toBe('0901234567');
    });

    test('should stay in phone state with invalid phone', () => {
      const result = conversationFlow.processInput('phone', '123456', {});
      expect(result.success).toBe(false);
      expect(result.nextState).toBe('phone');
      expect(result.error).toBeDefined();
    });

    test('should transition from timeslot to custom_time when selecting "Chọn giờ khác"', () => {
      const result = conversationFlow.processInput('timeslot', 'Chọn giờ khác', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('custom_time');
    });

    test('should transition from timeslot to complete for standard options', () => {
      const result = conversationFlow.processInput('timeslot', 'Tối (19–21h)', {});
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('complete');
      expect(result.userData.timeslot).toBe('Tối (19–21h)');
    });
  });

  describe('Input Validation', () => {
    test('should validate major selection', () => {
      const validResult = conversationFlow.validateMajorSelection('CNTT', {});
      expect(validResult.isValid).toBe(true);
      expect(validResult.processedData.major).toBe('CNTT');

      const invalidResult = conversationFlow.validateMajorSelection('', {});
      expect(invalidResult.isValid).toBe(false);
    });

    test('should validate custom major input', () => {
      const validResult = conversationFlow.validateCustomMajor('Kỹ thuật phần mềm', {});
      expect(validResult.isValid).toBe(true);
      expect(validResult.processedData.major).toBe('Kỹ thuật phần mềm');

      const invalidResult = conversationFlow.validateCustomMajor('A', {}); // too short
      expect(invalidResult.isValid).toBe(false);
    });

    test('should validate communication channel', () => {
      const validChannels = ['Gọi điện', 'Zalo', 'Email'];
      
      validChannels.forEach(channel => {
        const result = conversationFlow.validateChannel(channel, {});
        expect(result.isValid).toBe(true);
        expect(result.processedData.channel).toBe(channel);
      });

      const invalidResult = conversationFlow.validateChannel('SMS', {});
      expect(invalidResult.isValid).toBe(false);
    });

    test('should validate timeslot selection', () => {
      const validTimeslots = ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'];
      
      validTimeslots.forEach(timeslot => {
        const result = conversationFlow.validateTimeslot(timeslot, {});
        expect(result.isValid).toBe(true);
        expect(result.processedData.timeslot).toBe(timeslot);
      });

      const invalidResult = conversationFlow.validateTimeslot('Invalid time', {});
      expect(invalidResult.isValid).toBe(false);
    });

    test('should validate custom time input', () => {
      const validResult = conversationFlow.validateCustomTime('Sáng mai 9h', {});
      expect(validResult.isValid).toBe(true);
      expect(validResult.processedData.timeslot).toBe('Sáng mai 9h');

      const invalidResult = conversationFlow.validateCustomTime('AB', {}); // too short
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid state gracefully', () => {
      const result = conversationFlow.processInput('invalid_state', 'test', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid state');
      expect(result.nextState).toBe('welcome');
    });

    test('should handle validation errors with retry logic', () => {
      const result = conversationFlow.processInput('phone', 'invalid_phone', { retryCount: 0 });
      expect(result.success).toBe(false);
      expect(result.nextState).toBe('phone');
      expect(result.retryCount).toBe(1);
    });

    test('should provide fallback after max retries', () => {
      const errorResult = conversationFlow.handleError('phone', 'Validation failed', 3);
      expect(errorResult.shouldRestart).toBe(true);
      expect(errorResult.nextState).toBe('welcome');
      expect(errorResult.message).toContain('hotline 1900 6929');
    });

    test('should suggest retry for errors under max limit', () => {
      const errorResult = conversationFlow.handleError('phone', 'Validation failed', 1);
      expect(errorResult.shouldRetry).toBe(true);
      expect(errorResult.nextState).toBe('phone');
      expect(errorResult.retryCount).toBe(2);
    });
  });

  describe('Quick Replies', () => {
    test('should return correct quick replies for each state', () => {
      const welcomeReplies = conversationFlow.getQuickReplies('welcome');
      expect(welcomeReplies).toEqual(['Có, mình quan tâm', 'Xem ngành đào tạo', 'Nói chuyện với người thật']);

      const majorReplies = conversationFlow.getQuickReplies('major');
      expect(majorReplies).toEqual(['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác']);

      const phoneReplies = conversationFlow.getQuickReplies('phone');
      expect(phoneReplies).toEqual([]);
    });

    test('should return empty array for invalid state', () => {
      const replies = conversationFlow.getQuickReplies('invalid_state');
      expect(replies).toEqual([]);
    });
  });

  describe('Complete Conversation Flow', () => {
    test('should handle complete conversation flow successfully', () => {
      let currentState = 'welcome';
      let userData = { first_name: 'Test User' };

      // Welcome -> Major
      let result = conversationFlow.processInput(currentState, 'Có, mình quan tâm', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      // Major -> Phone
      result = conversationFlow.processInput(currentState, 'CNTT', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      // Phone -> Channel
      result = conversationFlow.processInput(currentState, '0901234567', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      // Channel -> Timeslot
      result = conversationFlow.processInput(currentState, 'Zalo', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      // Timeslot -> Complete
      result = conversationFlow.processInput(currentState, 'Tối (19–21h)', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      expect(currentState).toBe('complete');
      expect(conversationFlow.isConversationComplete(currentState)).toBe(true);
      expect(userData.major).toBe('CNTT');
      expect(userData.phone_standardized).toBe('0901234567');
      expect(userData.channel).toBe('Zalo');
      expect(userData.timeslot).toBe('Tối (19–21h)');
    });
  });
});