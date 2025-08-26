/**
 * Integration tests for phone validation
 * Tests the integration between ConversationFlow and PhoneValidator
 */

const ConversationFlow = require('../services/ConversationFlow');

describe('Phone Validation Integration', () => {
  let conversationFlow;

  beforeEach(() => {
    conversationFlow = new ConversationFlow();
  });

  describe('ConversationFlow with Enhanced Phone Validation', () => {
    test('should validate and store enhanced phone data', () => {
      const result = conversationFlow.processInput('phone', '0901234567', {});
      
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel');
      expect(result.userData.phone).toBe('0901234567');
      expect(result.userData.phone_clean).toBe('0901234567');
      expect(result.userData.phone_standardized).toBe('0901234567');
      expect(result.userData.phone_network).toBe('mobifone');
    });

    test('should handle +84 format and standardize correctly', () => {
      const result = conversationFlow.processInput('phone', '+84901234567', {});
      
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel');
      expect(result.userData.phone).toBe('+84901234567');
      expect(result.userData.phone_clean).toBe('+84901234567');
      expect(result.userData.phone_standardized).toBe('0901234567');
      expect(result.userData.phone_network).toBe('mobifone');
    });

    test('should handle formatted phone numbers', () => {
      const result = conversationFlow.processInput('phone', '090 123 4567', {});
      
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel');
      expect(result.userData.phone).toBe('090 123 4567');
      expect(result.userData.phone_clean).toBe('0901234567');
      expect(result.userData.phone_standardized).toBe('0901234567');
      expect(result.userData.phone_network).toBe('mobifone');
    });

    test('should provide detailed error information for invalid phones', () => {
      const result = conversationFlow.processInput('phone', '0121234567', {});
      
      expect(result.success).toBe(false);
      expect(result.nextState).toBe('phone');
      expect(result.error).toContain('Đầu số không hợp lệ');
      expect(result.errorCode).toBe('INVALID_NETWORK_PREFIX');
    });

    test('should detect different network providers correctly', () => {
      const testCases = [
        { phone: '0321234567', expectedNetwork: 'viettel' },
        { phone: '0811234567', expectedNetwork: 'vinaphone' },
        { phone: '0901234567', expectedNetwork: 'mobifone' },
        { phone: '0521234567', expectedNetwork: 'vietnamobile' },
        { phone: '0591234567', expectedNetwork: 'gmobile' }
      ];

      testCases.forEach(({ phone, expectedNetwork }) => {
        const result = conversationFlow.processInput('phone', phone, {});
        expect(result.success).toBe(true);
        expect(result.userData.phone_network).toBe(expectedNetwork);
      });
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        { input: '', expectedError: true },
        { input: null, expectedError: true },
        { input: 'abc123', expectedError: true },
        { input: '090123456', expectedError: true }, // too short
        { input: '09012345678', expectedError: true } // too long
      ];

      edgeCases.forEach(({ input, expectedError }) => {
        const result = conversationFlow.processInput('phone', input, {});
        expect(result.success).toBe(!expectedError);
        if (expectedError) {
          expect(result.nextState).toBe('phone');
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('Complete Flow with Phone Validation', () => {
    test('should complete full conversation with enhanced phone data', () => {
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

      // Phone -> Channel (with enhanced validation)
      result = conversationFlow.processInput(currentState, '+84901234567', userData);
      expect(result.success).toBe(true);
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };

      // Verify enhanced phone data is stored
      expect(userData.phone).toBe('+84901234567');
      expect(userData.phone_standardized).toBe('0901234567');
      expect(userData.phone_network).toBe('mobifone');

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

      // Verify all data is preserved
      expect(userData.major).toBe('CNTT');
      expect(userData.phone).toBe('+84901234567');
      expect(userData.phone_standardized).toBe('0901234567');
      expect(userData.phone_network).toBe('mobifone');
      expect(userData.channel).toBe('Zalo');
      expect(userData.timeslot).toBe('Tối (19–21h)');
    });

    test('should handle phone validation errors in conversation flow', () => {
      let currentState = 'phone';
      let userData = { first_name: 'Test User', major: 'CNTT' };

      // Try invalid phone first
      let result = conversationFlow.processInput(currentState, '123456', userData);
      expect(result.success).toBe(false);
      expect(result.nextState).toBe('phone'); // Stay in phone state
      expect(result.error).toBeDefined();

      // Try valid phone
      result = conversationFlow.processInput(currentState, '0901234567', userData);
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel'); // Move to next state
      expect(result.userData.phone_standardized).toBe('0901234567');
    });
  });

  describe('Message Generation with Phone Data', () => {
    test('should generate messages with standardized phone number', () => {
      const userData = {
        first_name: 'Minh',
        phone_standardized: '0901234567',
        major: 'CNTT',
        channel: 'Zalo',
        timeslot: 'Tối (19–21h)'
      };

      const channelMessage = conversationFlow.generateMessage('channel', userData);
      expect(channelMessage).toContain('0901234567');

      const completeMessage = conversationFlow.generateMessage('complete', userData);
      expect(completeMessage).toContain('Minh');
      expect(completeMessage).toContain('CNTT');
      expect(completeMessage).toContain('Zalo');
      expect(completeMessage).toContain('Tối (19–21h)');
    });
  });

  describe('Error Recovery', () => {
    test('should handle multiple invalid phone attempts', () => {
      let currentState = 'phone';
      let userData = { first_name: 'Test User', major: 'CNTT' };

      // First invalid attempt
      let result = conversationFlow.processInput(currentState, '123', userData);
      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(1);

      // Second invalid attempt
      userData.retryCount = result.retryCount;
      result = conversationFlow.processInput(currentState, 'abc123', userData);
      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(2);

      // Valid attempt should reset and proceed
      result = conversationFlow.processInput(currentState, '0901234567', userData);
      expect(result.success).toBe(true);
      expect(result.nextState).toBe('channel');
    });

    test('should provide fallback after max retries', () => {
      const errorResult = conversationFlow.handleError('phone', 'Validation failed', 3);
      expect(errorResult.shouldRestart).toBe(true);
      expect(errorResult.nextState).toBe('welcome');
      expect(errorResult.message).toContain('hotline 1900 6929');
    });
  });
});