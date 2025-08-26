/**
 * Error Handler Tests
 * Tests for comprehensive error handling middleware
 */

const ErrorHandler = require('../middleware/errorHandler');

describe('ErrorHandler', () => {
  describe('formatError', () => {
    test('should format error with all required fields', () => {
      const result = ErrorHandler.formatError('TEST_ERROR', 'Test message', { detail: 'test' });
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'TEST_ERROR');
      expect(result.error).toHaveProperty('message', 'Test message');
      expect(result.error).toHaveProperty('details', { detail: 'test' });
      expect(result.error).toHaveProperty('timestamp');
    });

    test('should format error with default empty details', () => {
      const result = ErrorHandler.formatError('TEST_ERROR', 'Test message');
      
      expect(result.error).toHaveProperty('details', {});
    });
  });

  describe('handleGeminiError', () => {
    test('should handle rate limit errors', () => {
      const error = new Error('429 rate limit exceeded');
      const result = ErrorHandler.handleGeminiError(error);
      
      expect(result.error.code).toBe('AI_RATE_LIMIT');
      expect(result.error.message).toContain('nhiều yêu cầu');
      expect(result.error.details.retryAfter).toBe(60);
    });

    test('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      const result = ErrorHandler.handleGeminiError(error);
      
      expect(result.error.code).toBe('AI_TIMEOUT');
      expect(result.error.message).toContain('chậm');
      expect(result.error.details.timeout).toBe(true);
    });

    test('should handle API errors', () => {
      const error = new Error('API network error');
      const result = ErrorHandler.handleGeminiError(error);
      
      expect(result.error.code).toBe('AI_SERVICE_ERROR');
      expect(result.error.message).toContain('hệ thống đang bận');
      expect(result.error.details.serviceDown).toBe(true);
    });

    test('should handle invalid response errors', () => {
      const error = new Error('Invalid response too short');
      const result = ErrorHandler.handleGeminiError(error);
      
      expect(result.error.code).toBe('AI_INVALID_RESPONSE');
      expect(result.error.message).toContain('khó khăn');
      expect(result.error.details.invalidResponse).toBe(true);
    });

    test('should handle generic AI errors', () => {
      const error = new Error('Unknown AI error');
      const result = ErrorHandler.handleGeminiError(error);
      
      expect(result.error.code).toBe('AI_GENERAL_ERROR');
      expect(result.error.message).toContain('lỗi xảy ra');
      expect(result.error.details.fallback).toBe(true);
    });
  });

  describe('handleDatabaseError', () => {
    test('should handle connection errors', () => {
      const error = new Error('MongoNetworkError: connection failed');
      error.name = 'MongoNetworkError';
      const result = ErrorHandler.handleDatabaseError(error);
      
      expect(result.error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(result.error.message).toContain('kết nối');
      expect(result.error.details.connectionError).toBe(true);
    });

    test('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = { field: 'invalid' };
      const result = ErrorHandler.handleDatabaseError(error);
      
      expect(result.error.code).toBe('DATABASE_VALIDATION_ERROR');
      expect(result.error.message).toContain('không hợp lệ');
      expect(result.error.details.validationError).toBe(true);
      expect(result.error.details.details).toEqual({ field: 'invalid' });
    });

    test('should handle duplicate key errors', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      const result = ErrorHandler.handleDatabaseError(error);
      
      expect(result.error.code).toBe('DATABASE_DUPLICATE_ERROR');
      expect(result.error.message).toContain('đã tồn tại');
      expect(result.error.details.duplicateKey).toBe(true);
    });

    test('should handle generic database errors', () => {
      const error = new Error('Database error');
      const result = ErrorHandler.handleDatabaseError(error);
      
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toContain('cơ sở dữ liệu');
      expect(result.error.details.databaseError).toBe(true);
    });
  });

  describe('handleValidationError', () => {
    test('should handle phone validation errors', () => {
      const result = ErrorHandler.handleValidationError('phone', '123', 'invalid format');
      
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('điện thoại');
      expect(result.error.details.field).toBe('phone');
      expect(result.error.details.value).toBe('123');
      expect(result.error.details.reason).toBe('invalid format');
    });

    test('should handle major validation errors', () => {
      const result = ErrorHandler.handleValidationError('major', '', 'empty');
      
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('ngành học');
      expect(result.error.details.field).toBe('major');
    });

    test('should handle firstName validation errors', () => {
      const result = ErrorHandler.handleValidationError('firstName', '', 'empty');
      
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('Tên không được để trống');
      expect(result.error.details.field).toBe('firstName');
    });

    test('should handle unknown field validation errors', () => {
      const result = ErrorHandler.handleValidationError('unknownField', 'value', 'reason');
      
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Dữ liệu không hợp lệ');
      expect(result.error.details.field).toBe('unknownField');
    });

    test('should truncate long values', () => {
      const longValue = 'a'.repeat(100);
      const result = ErrorHandler.handleValidationError('test', longValue, 'too long');
      
      expect(result.error.details.value).toHaveLength(50);
    });
  });

  describe('asyncHandler', () => {
    test('should handle successful async functions', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      
      const wrappedFn = ErrorHandler.asyncHandler(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should catch and pass errors to next', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      
      const wrappedFn = ErrorHandler.asyncHandler(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        url: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
      
      // Mock console.error to avoid test output
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    test('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      ErrorHandler.middleware(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    test('should handle CastError', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';
      error.value = 'invalid-id';
      
      ErrorHandler.middleware(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_ID'
          })
        })
      );
    });

    test('should handle rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      error.retryAfter = 120;
      
      ErrorHandler.middleware(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            details: expect.objectContaining({
              retryAfter: 120
            })
          })
        })
      );
    });

    test('should handle generic errors', () => {
      const error = new Error('Generic error');
      
      ErrorHandler.middleware(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR'
          })
        })
      );
    });
  });

  describe('handle404', () => {
    test('should return 404 error response', () => {
      const mockReq = { path: '/nonexistent', method: 'GET' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      ErrorHandler.handle404(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            details: expect.objectContaining({
              path: '/nonexistent',
              method: 'GET'
            })
          })
        })
      );
    });
  });
});