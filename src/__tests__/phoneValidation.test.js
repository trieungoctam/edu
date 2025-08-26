/**
 * Tests for PhoneValidator utility
 * Covers Vietnamese phone number validation, standardization, and formatting
 */

const PhoneValidator = require('../utils/phoneValidation');

describe('PhoneValidator', () => {
  let phoneValidator;

  beforeEach(() => {
    phoneValidator = new PhoneValidator();
  });

  describe('Basic Validation', () => {
    test('should validate correct Vietnamese phone numbers', () => {
      const validPhones = [
        '0901234567',    // Viettel
        '0351234567',    // Viettel
        '0781234567',    // Viettel
        '0861234567',    // Viettel
        '0961234567',    // Viettel
        '0811234567',    // Vinaphone
        '0911234567',    // Vinaphone
        '0701234567',    // Mobifone
        '0891234567',    // Mobifone
        '0521234567',    // Vietnamobile
        '0591234567'     // Gmobile
      ];

      validPhones.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toMatch(/^0[3|5|7|8|9]\d{8}$/);
        expect(result.network).toBeDefined();
        expect(result.network).not.toBe('unknown');
      });
    });

    test('should validate +84 format phone numbers', () => {
      const validPhones = [
        '+84901234567',
        '+84351234567',
        '+84781234567',
        '+84811234567',
        '+84701234567'
      ];

      validPhones.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toMatch(/^0[3|5|7|8|9]\d{8}$/);
        expect(result.cleanPhone).toBe(phone);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789',      // too short
        '01234567890',    // wrong prefix (01)
        '0123456789',     // invalid prefix (012)
        '+841234567890',  // invalid +84 format
        'abc123456789',   // contains letters
        '0901234',        // too short
        '',               // empty
        null,             // null
        undefined,        // undefined
        '0901234567890',  // too long
        '+84901234567890' // too long +84 format
      ];

      invalidPhones.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.errorCode).toBeDefined();
      });
    });

    test('should handle phone numbers with formatting characters', () => {
      const formattedPhones = [
        '090 123 4567',
        '090-123-4567',
        '090.123.4567',
        '(090) 123-4567',
        '+84 90 123 4567',
        '+84-90-123-4567'
      ];

      formattedPhones.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toBe('0901234567');
      });
    });
  });

  describe('Phone Number Standardization', () => {
    test('should standardize +84 format to 0 format', () => {
      const testCases = [
        { input: '+84901234567', expected: '0901234567' },
        { input: '+84351234567', expected: '0351234567' },
        { input: '+84781234567', expected: '0781234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = phoneValidator.validate(input);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toBe(expected);
      });
    });

    test('should keep 0 format unchanged', () => {
      const testCases = [
        '0901234567',
        '0351234567',
        '0781234567'
      ];

      testCases.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toBe(phone);
      });
    });
  });

  describe('Network Provider Detection', () => {
    test('should correctly identify Viettel numbers', () => {
      const viettelNumbers = [
        '0321234567', '0331234567', '0341234567', '0351234567',
        '0361234567', '0371234567', '0381234567', '0391234567',
        '0861234567', '0961234567', '0971234567', '0981234567'
      ];

      viettelNumbers.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('viettel');
      });
    });

    test('should correctly identify Vinaphone numbers', () => {
      const vinaphoneNumbers = [
        '0811234567', '0821234567', '0831234567', '0841234567',
        '0851234567', '0881234567', '0911234567', '0941234567'
      ];

      vinaphoneNumbers.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('vinaphone');
      });
    });

    test('should correctly identify Mobifone numbers', () => {
      const mobifoneNumbers = [
        '0701234567', '0761234567', '0771234567', '0781234567',
        '0791234567', '0891234567', '0901234567', '0931234567'
      ];

      mobifoneNumbers.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('mobifone');
      });
    });

    test('should correctly identify Vietnamobile numbers', () => {
      const vietnamobileNumbers = [
        '0521234567', '0561234567', '0581234567', '0921234567'
      ];

      vietnamobileNumbers.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('vietnamobile');
      });
    });

    test('should correctly identify Gmobile numbers', () => {
      const gmobileNumbers = [
        '0591234567', '0991234567'
      ];

      gmobileNumbers.forEach(phone => {
        const result = phoneValidator.validate(phone);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('gmobile');
      });
    });
  });

  describe('Phone Number Formatting', () => {
    test('should format phone numbers for display', () => {
      const testCases = [
        { input: '0901234567', expected: '0901 234 567' },
        { input: '+84901234567', expected: '0901 234 567' },
        { input: '090 123 4567', expected: '0901 234 567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = phoneValidator.formatPhone(input, 'display');
        expect(formatted).toBe(expected);
      });
    });

    test('should format phone numbers for international display', () => {
      const testCases = [
        { input: '0901234567', expected: '+84901234567' },
        { input: '+84901234567', expected: '+84901234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = phoneValidator.formatPhone(input, 'international');
        expect(formatted).toBe(expected);
      });
    });

    test('should format phone numbers in standard format', () => {
      const testCases = [
        { input: '0901234567', expected: '0901234567' },
        { input: '+84901234567', expected: '0901234567' },
        { input: '090 123 4567', expected: '0901234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = phoneValidator.formatPhone(input, 'standard');
        expect(formatted).toBe(expected);
      });
    });

    test('should return original phone if invalid', () => {
      const invalidPhone = '123456';
      const formatted = phoneValidator.formatPhone(invalidPhone, 'display');
      expect(formatted).toBe(invalidPhone);
    });
  });

  describe('Error Handling and Messages', () => {
    test('should provide appropriate error messages for different error types', () => {
      const errorCases = [
        { input: '', expectedCode: 'EMPTY_PHONE' },
        { input: 'abc123', expectedCode: 'INVALID_CHARACTERS' },
        { input: '090123456', expectedCode: 'INVALID_LENGTH_ZERO' },
        { input: '+8490123456', expectedCode: 'INVALID_LENGTH_PLUS84' },
        { input: '1901234567', expectedCode: 'INVALID_CHARACTERS' }, // Numbers starting with 1 are invalid characters
        { input: '0121234567', expectedCode: 'INVALID_NETWORK_PREFIX' }
      ];

      errorCases.forEach(({ input, expectedCode }) => {
        const result = phoneValidator.validate(input);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(expectedCode);
        expect(result.error).toBeDefined();
      });
    });

    test('should provide helpful suggestions for errors', () => {
      const errorCodes = [
        'EMPTY_PHONE',
        'INVALID_CHARACTERS',
        'INVALID_LENGTH_ZERO',
        'INVALID_LENGTH_PLUS84',
        'INVALID_PREFIX',
        'INVALID_NETWORK_PREFIX'
      ];

      errorCodes.forEach(errorCode => {
        const suggestions = phoneValidator.getErrorSuggestions(errorCode);
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
        suggestions.forEach(suggestion => {
          expect(typeof suggestion).toBe('string');
          expect(suggestion.length).toBeGreaterThan(0);
        });
      });
    });

    test('should provide default suggestions for unknown error codes', () => {
      const suggestions = phoneValidator.getErrorSuggestions('UNKNOWN_ERROR');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions).toEqual(['Vui lòng kiểm tra lại số điện thoại']);
    });
  });

  describe('Real-time Validation', () => {
    test('should handle empty input gracefully', () => {
      const result = phoneValidator.validateRealTime('');
      expect(result.isValid).toBeNull();
      expect(result.message).toBe('');
      expect(result.showError).toBe(false);
    });

    test('should provide progressive feedback for incomplete input', () => {
      const progressiveCases = [
        { input: '09', expected: 'Tiếp tục nhập...' },
        { input: '090123', expected: 'Nhập thêm 4 chữ số' },
        { input: '+8490123', expected: 'Nhập thêm 4 chữ số' } // +8490123 has 8 chars, needs 4 more to reach 12
      ];

      progressiveCases.forEach(({ input, expected }) => {
        const result = phoneValidator.validateRealTime(input);
        expect(result.message).toBe(expected);
        expect(result.showError).toBe(false);
      });
    });

    test('should show success message for valid complete input', () => {
      const result = phoneValidator.validateRealTime('0901234567');
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('Mobifone');
      expect(result.message).toContain('0901 234 567');
      expect(result.showError).toBe(false);
      expect(result.standardized).toBe('0901234567');
    });

    test('should show error for invalid complete input', () => {
      const result = phoneValidator.validateRealTime('0121234567');
      expect(result.isValid).toBe(false);
      expect(result.showError).toBe(true);
      expect(result.message).toContain('Đầu số không hợp lệ');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined inputs', () => {
      const nullResult = phoneValidator.validate(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errorCode).toBe('EMPTY_PHONE');

      const undefinedResult = phoneValidator.validate(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errorCode).toBe('EMPTY_PHONE');
    });

    test('should handle non-string inputs', () => {
      const numberResult = phoneValidator.validate(901234567);
      expect(numberResult.isValid).toBe(false);
      expect(numberResult.errorCode).toBe('EMPTY_PHONE');
    });

    test('should handle very long inputs', () => {
      const longInput = '0901234567890123456789';
      const result = phoneValidator.validate(longInput);
      expect(result.isValid).toBe(false);
    });

    test('should handle inputs with only formatting characters', () => {
      const formattingOnly = '- . ( ) ';
      const result = phoneValidator.validate(formattingOnly);
      expect(result.isValid).toBe(false);
    });

    test('should handle mixed valid and invalid characters', () => {
      const mixedInput = '090abc123def4567';
      const result = phoneValidator.validate(mixedInput);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_CHARACTERS');
    });
  });

  describe('Performance and Consistency', () => {
    test('should consistently validate the same input', () => {
      const testPhone = '0901234567';
      
      // Run validation multiple times
      for (let i = 0; i < 10; i++) {
        const result = phoneValidator.validate(testPhone);
        expect(result.isValid).toBe(true);
        expect(result.standardizedPhone).toBe('0901234567');
        expect(result.network).toBe('mobifone');
      }
    });

    test('should handle batch validation efficiently', () => {
      const testPhones = [
        '0901234567', '0351234567', '0781234567', '0811234567',
        '0701234567', '0521234567', '0591234567', '+84901234567',
        'invalid123', '0121234567'
      ];

      const results = testPhones.map(phone => phoneValidator.validate(phone));
      
      expect(results).toHaveLength(testPhones.length);
      
      // Check that valid phones are correctly identified
      const validResults = results.filter(r => r.isValid);
      expect(validResults).toHaveLength(8); // 8 valid phones in the test set
      
      // Check that invalid phones are correctly identified
      const invalidResults = results.filter(r => !r.isValid);
      expect(invalidResults).toHaveLength(2); // 2 invalid phones in the test set
    });
  });
});