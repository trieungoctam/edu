/**
 * Validation Middleware Tests
 * Tests for comprehensive input validation and sanitization
 */

const ValidationMiddleware = require('../middleware/validation');

describe('ValidationMiddleware', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationMiddleware();
  });

  describe('sanitizeString', () => {
    test('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello <b>World</b>';
      const result = validator.sanitizeString(input);
      
      expect(result).toBe('Hello World');
    });

    test('should escape dangerous characters', () => {
      const input = 'Hello <>&"\' World';
      const result = validator.sanitizeString(input);
      
      expect(result).toBe('Hello &amp;&quot;&#x27; World');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = validator.sanitizeString(input);
      
      expect(result).toBe('Hello World');
    });

    test('should limit string length', () => {
      const input = 'a'.repeat(100);
      const result = validator.sanitizeString(input, 50);
      
      expect(result).toHaveLength(50);
    });

    test('should handle non-string input', () => {
      const result = validator.sanitizeString(123);
      
      expect(result).toBe('');
    });
  });

  describe('validateFirstName', () => {
    test('should validate correct Vietnamese names', () => {
      const validNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Minh C', 'Hoàng-Anh'];
      
      validNames.forEach(name => {
        const result = validator.validateFirstName(name);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(name);
      });
    });

    test('should reject empty names', () => {
      const result = validator.validateFirstName('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_FIRST_NAME');
    });

    test('should reject null/undefined names', () => {
      const result1 = validator.validateFirstName(null);
      const result2 = validator.validateFirstName(undefined);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    test('should reject names that are too short', () => {
      const result = validator.validateFirstName('A');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('FIRST_NAME_TOO_SHORT');
    });

    test('should reject names with invalid characters', () => {
      const result = validator.validateFirstName('John123');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_NAME_CHARACTERS');
    });

    test('should sanitize and validate names with HTML', () => {
      const result = validator.validateFirstName('<script>Nguyễn</script> Văn A');
      
      expect(result.isValid).toBe(true); // HTML tags are removed, leaving valid name
      expect(result.sanitized).toBe(' Văn A');
    });
  });

  describe('validateMajor', () => {
    test('should validate predefined majors', () => {
      const validMajors = ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'];
      
      validMajors.forEach(major => {
        const result = validator.validateMajor(major);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(major);
      });
    });

    test('should validate custom majors', () => {
      const result = validator.validateMajor('Kỹ thuật Phần mềm');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Kỹ thuật Phần mềm');
    });

    test('should reject empty majors', () => {
      const result = validator.validateMajor('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_MAJOR');
    });

    test('should reject majors that are too short', () => {
      const result = validator.validateMajor('A');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('MAJOR_TOO_SHORT');
    });

    test('should reject majors that are too long', () => {
      const longMajor = 'a'.repeat(101);
      const result = validator.validateMajor(longMajor);
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('MAJOR_TOO_LONG');
    });
  });

  describe('validatePhone', () => {
    test('should validate correct Vietnamese phone numbers', () => {
      const validPhones = ['0901234567', '+84901234567'];
      
      validPhones.forEach(phone => {
        const result = validator.validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toMatch(/^0\d{9}$/);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = ['123456', '0123456', '+841234567890', 'abc123', '0123456789'];
      
      invalidPhones.forEach(phone => {
        const result = validator.validatePhone(phone);
        expect(result.isValid).toBe(false);
      });
    });

    test('should standardize +84 format to 0 format', () => {
      const result = validator.validatePhone('+84901234567');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('0901234567');
    });
  });

  describe('validateChannel', () => {
    test('should validate correct channels', () => {
      const validChannels = ['Gọi điện', 'Zalo', 'Email'];
      
      validChannels.forEach(channel => {
        const result = validator.validateChannel(channel);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(channel);
      });
    });

    test('should reject invalid channels', () => {
      const result = validator.validateChannel('SMS');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_CHANNEL');
    });

    test('should reject empty channels', () => {
      const result = validator.validateChannel('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_CHANNEL');
    });
  });

  describe('validateTimeslot', () => {
    test('should validate predefined timeslots', () => {
      const validTimeslots = ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'];
      
      validTimeslots.forEach(timeslot => {
        const result = validator.validateTimeslot(timeslot);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(timeslot);
      });
    });

    test('should validate custom timeslots', () => {
      const result = validator.validateTimeslot('Sáng mai 9h');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Sáng mai 9h');
    });

    test('should reject empty timeslots', () => {
      const result = validator.validateTimeslot('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_TIMESLOT');
    });

    test('should reject timeslots that are too short', () => {
      const result = validator.validateTimeslot('AB');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('TIMESLOT_TOO_SHORT');
    });

    test('should reject timeslots that are too long', () => {
      const longTimeslot = 'a'.repeat(201);
      const result = validator.validateTimeslot(longTimeslot);
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('TIMESLOT_TOO_LONG');
    });
  });

  describe('validateMessage', () => {
    test('should validate correct messages', () => {
      const result = validator.validateMessage('Hello, I want to know about HSU');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello, I want to know about HSU');
    });

    test('should reject empty messages', () => {
      const result = validator.validateMessage('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_MESSAGE');
    });

    test('should reject null messages', () => {
      const result = validator.validateMessage(null);
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_MESSAGE');
    });

    test('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(1001);
      const result = validator.validateMessage(longMessage);
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('MESSAGE_TOO_LONG');
    });

    test('should sanitize messages with HTML', () => {
      const result = validator.validateMessage('<script>alert("xss")</script>Hello');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello');
    });
  });

  describe('validateSessionId', () => {
    test('should validate correct session IDs', () => {
      const validIds = ['session_123456789_abc', 'user-session-123', 'abc123_def456'];
      
      validIds.forEach(id => {
        const result = validator.validateSessionId(id);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(id);
      });
    });

    test('should reject empty session IDs', () => {
      const result = validator.validateSessionId('');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EMPTY_SESSION_ID');
    });

    test('should reject session IDs with invalid characters', () => {
      const result = validator.validateSessionId('session@123');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_SESSION_ID');
    });

    test('should reject session IDs that are too short', () => {
      const result = validator.validateSessionId('abc');
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_SESSION_ID_LENGTH');
    });

    test('should reject session IDs that are too long', () => {
      const longId = 'a'.repeat(101);
      const result = validator.validateSessionId(longId);
      
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_SESSION_ID_LENGTH');
    });
  });

  describe('middleware functions', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = { body: {}, query: {} };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    describe('validateMessageRequest', () => {
      test('should pass valid message requests', () => {
        mockReq.body = {
          sessionId: 'session_123456789_abc',
          message: 'Hello HSU'
        };
        
        validator.validateMessageRequest(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      test('should reject invalid session ID', () => {
        mockReq.body = {
          sessionId: 'invalid@session',
          message: 'Hello HSU'
        };
        
        validator.validateMessageRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject empty message', () => {
        mockReq.body = {
          sessionId: 'session_123456789_abc',
          message: ''
        };
        
        validator.validateMessageRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('validateSessionRequest', () => {
      test('should pass valid session requests', () => {
        mockReq.body = {
          firstName: 'Nguyễn Văn A'
        };
        
        validator.validateSessionRequest(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      test('should reject invalid first name', () => {
        mockReq.body = {
          firstName: 'A'
        };
        
        validator.validateSessionRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('validateAdminRequest', () => {
      test('should pass valid admin requests', () => {
        mockReq.query = {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          status: 'new',
          limit: '50',
          page: '1'
        };
        
        validator.validateAdminRequest(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      test('should reject invalid date format', () => {
        mockReq.query = {
          dateFrom: '2024/01/01'
        };
        
        validator.validateAdminRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject invalid status', () => {
        mockReq.query = {
          status: 'invalid_status'
        };
        
        validator.validateAdminRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject invalid limit', () => {
        mockReq.query = {
          limit: '200'
        };
        
        validator.validateAdminRequest(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('sanitizeInputs', () => {
      test('should sanitize request body strings', () => {
        mockReq.body = {
          name: '<script>alert("xss")</script>John',
          age: 25,
          message: 'Hello <b>World</b>'
        };
        
        validator.sanitizeInputs(mockReq, mockRes, mockNext);
        
        expect(mockReq.body.name).toBe('John');
        expect(mockReq.body.age).toBe(25); // Numbers should remain unchanged
        expect(mockReq.body.message).toBe('Hello World');
        expect(mockNext).toHaveBeenCalled();
      });

      test('should sanitize query parameters', () => {
        mockReq.query = {
          search: '<script>alert("xss")</script>test',
          limit: '50'
        };
        
        validator.sanitizeInputs(mockReq, mockRes, mockNext);
        
        expect(mockReq.query.search).toBe('test');
        expect(mockReq.query.limit).toBe('50');
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});