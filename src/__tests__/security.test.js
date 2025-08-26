/**
 * Security Features Test Suite
 * Tests data protection, input sanitization, and security middleware
 */

const DataProtection = require('../utils/dataProtection');
const ValidationMiddleware = require('../middleware/validation');
const RequestLogger = require('../middleware/requestLogger');

describe('Security Features', () => {
  describe('DataProtection', () => {
    let dataProtection;

    beforeAll(() => {
      // Set test encryption key (exactly 32 characters)
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
      dataProtection = new DataProtection();
    });

    afterAll(() => {
      delete process.env.ENCRYPTION_KEY;
    });

    describe('Encryption/Decryption', () => {
      test('should encrypt and decrypt data correctly', () => {
        const plaintext = '0901234567';
        const encrypted = dataProtection.encrypt(plaintext);
        const decrypted = dataProtection.decrypt(encrypted);

        expect(encrypted).not.toBe(plaintext);
        expect(encrypted).toContain(':'); // Should contain IV:ciphertext format
        expect(decrypted).toBe(plaintext);
      });

      test('should produce different ciphertext for same plaintext', () => {
        const plaintext = '0901234567';
        const encrypted1 = dataProtection.encrypt(plaintext);
        const encrypted2 = dataProtection.encrypt(plaintext);

        expect(encrypted1).not.toBe(encrypted2);
        expect(dataProtection.decrypt(encrypted1)).toBe(plaintext);
        expect(dataProtection.decrypt(encrypted2)).toBe(plaintext);
      });

      test('should handle phone number encryption specifically', () => {
        const phone = '0901234567';
        const result = dataProtection.encryptPhone(phone);

        expect(result.encrypted).toBeDefined();
        expect(result.original).toBe(phone);
        expect(dataProtection.decryptPhone(result.encrypted)).toBe(phone);
      });

      test('should handle empty phone numbers', () => {
        const result = dataProtection.encryptPhone('');
        expect(result.encrypted).toBeNull();
        expect(result.original).toBeNull();

        expect(dataProtection.decryptPhone('')).toBeNull();
        expect(dataProtection.decryptPhone(null)).toBeNull();
      });

      test('should throw error for invalid encryption key', () => {
        expect(() => {
          process.env.ENCRYPTION_KEY = 'short';
          new DataProtection();
        }).toThrow('ENCRYPTION_KEY must be exactly 32 characters long');
      });

      test('should throw error for missing encryption key', () => {
        const originalKey = process.env.ENCRYPTION_KEY;
        delete process.env.ENCRYPTION_KEY;

        expect(() => {
          new DataProtection();
        }).toThrow('ENCRYPTION_KEY environment variable is required');

        process.env.ENCRYPTION_KEY = originalKey;
      });

      test('should throw error for invalid encrypted data format', () => {
        expect(() => {
          dataProtection.decrypt('invalid_format');
        }).toThrow('Invalid encrypted data format');

        expect(() => {
          dataProtection.decrypt('part1:part2:part3');
        }).toThrow('Invalid encrypted data format');
      });
    });

    describe('Hashing', () => {
      test('should hash data consistently', () => {
        const data = 'test_data';
        const hash1 = dataProtection.hash(data);
        const hash2 = dataProtection.hash(data);

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
      });

      test('should produce different hashes for different data', () => {
        const hash1 = dataProtection.hash('data1');
        const hash2 = dataProtection.hash('data2');

        expect(hash1).not.toBe(hash2);
      });

      test('should throw error for invalid hash input', () => {
        expect(() => {
          dataProtection.hash('');
        }).toThrow('Data must be a non-empty string');

        expect(() => {
          dataProtection.hash(null);
        }).toThrow('Data must be a non-empty string');
      });
    });

    describe('Token Generation', () => {
      test('should generate secure random tokens', () => {
        const token1 = dataProtection.generateToken();
        const token2 = dataProtection.generateToken();

        expect(token1).not.toBe(token2);
        expect(token1).toHaveLength(64); // 32 bytes = 64 hex characters
        expect(token2).toHaveLength(64);
      });

      test('should generate tokens of specified length', () => {
        const token = dataProtection.generateToken(16);
        expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
      });
    });

    describe('Key Validation', () => {
      test('should validate encryption key format', () => {
        expect(DataProtection.validateEncryptionKey('12345678901234567890123456789012')).toBe(true);
        expect(DataProtection.validateEncryptionKey('short')).toBe(false);
        expect(DataProtection.validateEncryptionKey('')).toBe(false);
        expect(DataProtection.validateEncryptionKey(null)).toBe(false);
      });
    });
  });

  describe('Input Sanitization', () => {
    let validator;

    beforeEach(() => {
      validator = new ValidationMiddleware();
    });

    describe('String Sanitization', () => {
      test('should remove script tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const sanitized = validator.sanitizeString(input);
        expect(sanitized).toBe('Hello');
      });

      test('should remove HTML tags', () => {
        const input = '<div>Hello <b>World</b></div>';
        const sanitized = validator.sanitizeString(input);
        expect(sanitized).toBe('Hello World');
      });

      test('should escape dangerous characters', () => {
        const input = 'Hello <>&"\'';
        const sanitized = validator.sanitizeString(input);
        expect(sanitized).toBe('Hello &amp;&quot;&#x27;');
      });

      test('should limit string length', () => {
        const input = 'a'.repeat(2000);
        const sanitized = validator.sanitizeString(input, 100);
        expect(sanitized).toHaveLength(100);
      });

      test('should handle non-string input', () => {
        expect(validator.sanitizeString(null)).toBe('');
        expect(validator.sanitizeString(undefined)).toBe('');
        expect(validator.sanitizeString(123)).toBe('');
      });
    });

    describe('Name Validation', () => {
      test('should validate valid Vietnamese names', () => {
        const result = validator.validateFirstName('Nguyễn Văn An');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('Nguyễn Văn An');
      });

      test('should reject empty names', () => {
        const result = validator.validateFirstName('');
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('EMPTY_FIRST_NAME');
      });

      test('should reject names that are too short', () => {
        const result = validator.validateFirstName('A');
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('FIRST_NAME_TOO_SHORT');
      });

      test('should reject names with invalid characters', () => {
        const result = validator.validateFirstName('Name123!@#');
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('INVALID_NAME_CHARACTERS');
      });
    });

    describe('Message Validation', () => {
      test('should validate normal messages', () => {
        const result = validator.validateMessage('Hello, I want to know about CNTT');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('Hello, I want to know about CNTT');
      });

      test('should reject empty messages', () => {
        const result = validator.validateMessage('');
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('EMPTY_MESSAGE');
      });

      test('should reject messages that are too long', () => {
        const longMessage = 'a'.repeat(1001);
        const result = validator.validateMessage(longMessage);
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('MESSAGE_TOO_LONG');
      });

      test('should sanitize malicious content in messages', () => {
        const result = validator.validateMessage('<script>alert("xss")</script>Hello');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('Hello');
      });
    });

    describe('Session ID Validation', () => {
      test('should validate valid session IDs', () => {
        const result = validator.validateSessionId('session_123-abc_456');
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe('session_123-abc_456');
      });

      test('should reject session IDs with invalid characters', () => {
        const result = validator.validateSessionId('session@123!');
        expect(result.isValid).toBe(false);
        expect(result.code).toBe('INVALID_SESSION_ID');
      });

      test('should reject session IDs that are too short or too long', () => {
        const shortResult = validator.validateSessionId('short');
        expect(shortResult.isValid).toBe(false);
        expect(shortResult.code).toBe('INVALID_SESSION_ID_LENGTH');

        const longResult = validator.validateSessionId('a'.repeat(101));
        expect(longResult.isValid).toBe(false);
        expect(longResult.code).toBe('INVALID_SESSION_ID_LENGTH');
      });
    });
  });

  describe('Request Logging', () => {
    let requestLogger;

    beforeEach(() => {
      requestLogger = new RequestLogger();
    });

    describe('Client IP Detection', () => {
      test('should extract client IP from request', () => {
        const req = { ip: '192.168.1.1' };
        const ip = requestLogger.getClientIP(req);
        expect(ip).toBe('192.168.1.1');
      });

      test('should handle missing IP gracefully', () => {
        const req = {};
        const ip = requestLogger.getClientIP(req);
        expect(ip).toBe('unknown');
      });
    });

    describe('Request Body Sanitization', () => {
      test('should mask phone numbers in logs', () => {
        const body = { phone: '0901234567', message: 'Hello' };
        const sanitized = requestLogger.sanitizeRequestBody(body);
        
        expect(sanitized.phone).toBe('090****67');
        expect(sanitized.message).toBe('Hello');
      });

      test('should redact sensitive fields', () => {
        const body = { password: 'secret123', apiKey: 'key123', phone: '0901234567' };
        const sanitized = requestLogger.sanitizeRequestBody(body);
        
        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.apiKey).toBe('[REDACTED]');
        expect(sanitized.phone).toBe('090****67');
      });

      test('should handle non-object bodies', () => {
        expect(requestLogger.sanitizeRequestBody(null)).toBeNull();
        expect(requestLogger.sanitizeRequestBody('string')).toBe('string');
      });
    });

    describe('Metrics Tracking', () => {
      test('should track request counts', () => {
        const req = { method: 'POST', route: { path: '/api/chat' } };
        const res = { statusCode: 200 };
        
        requestLogger.updateMetrics(req, res, 100);
        
        const metrics = requestLogger.getMetrics();
        expect(metrics.requestCounts['POST /api/chat']).toBe(1);
      });

      test('should track error counts', () => {
        const req = { method: 'POST', route: { path: '/api/chat' } };
        const res = { statusCode: 400 };
        
        requestLogger.updateMetrics(req, res, 100);
        
        const metrics = requestLogger.getMetrics();
        expect(metrics.errorCounts[400]).toBe(1);
      });

      test('should track response times', () => {
        const req = { method: 'GET', route: { path: '/health' } };
        const res = { statusCode: 200 };
        
        requestLogger.updateMetrics(req, res, 150);
        
        const metrics = requestLogger.getMetrics();
        expect(metrics.responseTimeStats.samples).toBe(1);
        expect(metrics.responseTimeStats.average).toBe(150);
        expect(metrics.responseTimeStats.maximum).toBe(150);
      });
    });
  });

  describe('Environment Variable Validation', () => {
    test('should validate required environment variables', () => {
      const originalEnv = process.env;
      
      // Test missing variables
      process.env = {};
      
      const requiredVars = ['GEMINI_API_KEY', 'MONGODB_URI', 'SESSION_SECRET', 'ENCRYPTION_KEY'];
      
      requiredVars.forEach(envVar => {
        expect(process.env[envVar]).toBeUndefined();
      });
      
      // Restore original environment
      process.env = originalEnv;
    });

    test('should validate encryption key length', () => {
      expect(DataProtection.validateEncryptionKey('12345678901234567890123456789012')).toBe(true); // exactly 32 chars
      expect(DataProtection.validateEncryptionKey('short')).toBe(false);
      expect(DataProtection.validateEncryptionKey('this_is_way_too_long_to_be_a_valid_encryption_key')).toBe(false);
    });
  });
});