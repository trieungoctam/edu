/**
 * Tests for GeminiChatService
 * Verifies AI integration, contextual prompts, and error handling
 */

const GeminiChatService = require('../services/GeminiChatService');

// Mock the Google Generative AI module
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn()
      })
    }))
  };
});

describe('GeminiChatService', () => {
  let geminiService;
  let mockModel;
  
  beforeEach(() => {
    // Set up environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Create service instance
    geminiService = new GeminiChatService();
    mockModel = geminiService.model;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('Constructor', () => {
    test('should initialize with API key', () => {
      expect(geminiService.genAI).toBeDefined();
      expect(geminiService.model).toBeDefined();
      expect(geminiService.modelConfig.temperature).toBe(0.3);
      expect(geminiService.modelConfig.maxOutputTokens).toBe(1024);
    });

    test('should throw error without API key', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GeminiChatService()).toThrow('GEMINI_API_KEY environment variable is required');
    });

    test('should have fallback responses configured', () => {
      expect(geminiService.fallbackResponses).toBeDefined();
      expect(geminiService.fallbackResponses.apiError).toContain('Xin lỗi');
      expect(geminiService.fallbackResponses.timeout).toContain('chậm');
    });
  });

  describe('buildContextualPrompt', () => {
    test('should build prompt with conversation context', () => {
      const context = {
        currentState: 'major',
        userData: { firstName: 'Nam' },
        conversationHistory: [
          { role: 'user', content: 'Chào bạn' },
          { role: 'assistant', content: 'Chào Nam!' }
        ]
      };

      const prompt = geminiService.buildContextualPrompt('Tôi quan tâm CNTT', context);
      
      expect(prompt).toContain('chatbot tư vấn tuyển sinh');
      expect(prompt).toContain('TRẠNG THÁI HIỆN TẠI: major');
      expect(prompt).toContain('firstName":"Nam"');
      expect(prompt).toContain('Tôi quan tâm CNTT');
    });

    test('should include state-specific guidance', () => {
      const context = { currentState: 'phone', userData: {} };
      const prompt = geminiService.buildContextualPrompt('0901234567', context);
      
      expect(prompt).toContain('số điện thoại');
      expect(prompt).toContain('0xxxxxxxxx hoặc +84xxxxxxxxx');
    });

    test('should handle empty conversation history', () => {
      const context = { currentState: 'welcome', userData: {}, conversationHistory: [] };
      const prompt = geminiService.buildContextualPrompt('Chào', context);
      
      expect(prompt).toContain('Chưa có lịch sử hội thoại');
    });
  });

  describe('processMessage', () => {
    test('should process message successfully', async () => {
      // Mock successful AI response
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Chào bạn! Bạn quan tâm ngành nào của HSU?',
          candidates: [{ finishReason: 'STOP' }]
        }
      });

      const context = {
        sessionId: 'test-session',
        currentState: 'welcome',
        userData: { firstName: 'Nam' }
      };

      const result = await geminiService.processMessage('test-session', 'Chào', context);

      expect(result.success).toBe(true);
      expect(result.reply).toContain('Chào bạn');
      expect(result.nextState).toBe('major');
      expect(result.quickReplies).toContain('CNTT');
    });

    test('should handle API timeout', async () => {
      // Mock timeout - return a promise that never resolves to trigger timeout
      mockModel.generateContent.mockImplementation(() => 
        new Promise(() => {}) // Never resolves, will trigger timeout
      );

      const context = {
        sessionId: 'test-session',
        currentState: 'welcome',
        userData: {}
      };

      const result = await geminiService.processMessage('test-session', 'Chào', context);

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.reply).toContain('chậm');
    }, 10000); // Increase timeout for this test

    test('should handle API errors', async () => {
      // Mock API error
      mockModel.generateContent.mockRejectedValue(new Error('API Error: 500'));

      const context = {
        sessionId: 'test-session',
        currentState: 'welcome',
        userData: {}
      };

      const result = await geminiService.processMessage('test-session', 'Chào', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('apiError');
      expect(result.reply).toContain('hệ thống đang bận');
    });

    test('should handle empty AI response', async () => {
      // Mock empty response
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => '',
          candidates: [{ finishReason: 'STOP' }]
        }
      });

      const context = {
        sessionId: 'test-session',
        currentState: 'welcome',
        userData: {}
      };

      const result = await geminiService.processMessage('test-session', 'Chào', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalidResponse');
    });
  });

  describe('getStateGuidance', () => {
    test('should return guidance for welcome state', () => {
      const guidance = geminiService.getStateGuidance('welcome');
      expect(guidance).toContain('Chào hỏi thân thiện');
      expect(guidance).toContain('ngành học quan tâm');
    });

    test('should return guidance for phone state', () => {
      const guidance = geminiService.getStateGuidance('phone');
      expect(guidance).toContain('số điện thoại');
      expect(guidance).toContain('0xxxxxxxxx hoặc +84xxxxxxxxx');
    });

    test('should return default guidance for unknown state', () => {
      const guidance = geminiService.getStateGuidance('unknown');
      expect(guidance).toContain('Hỗ trợ sinh viên');
    });
  });

  describe('determineNextStateFromAI', () => {
    test('should determine correct next state transitions', () => {
      expect(geminiService.determineNextStateFromAI('welcome', 'response', {})).toBe('major');
      expect(geminiService.determineNextStateFromAI('major', 'response', { major: 'CNTT' })).toBe('phone');
      expect(geminiService.determineNextStateFromAI('major', 'response', { major: 'Khác' })).toBe('major_other');
      expect(geminiService.determineNextStateFromAI('phone', 'response', {})).toBe('channel');
    });

    test('should handle timeslot special case', () => {
      expect(geminiService.determineNextStateFromAI('timeslot', 'response', { timeslot: 'Chọn giờ khác' })).toBe('custom_time');
      expect(geminiService.determineNextStateFromAI('timeslot', 'response', { timeslot: 'Trong hôm nay' })).toBe('complete');
    });
  });

  describe('getQuickRepliesForState', () => {
    test('should return correct quick replies for each state', () => {
      expect(geminiService.getQuickRepliesForState('welcome')).toContain('Có, mình quan tâm');
      expect(geminiService.getQuickRepliesForState('major')).toContain('CNTT');
      expect(geminiService.getQuickRepliesForState('channel')).toContain('Zalo');
      expect(geminiService.getQuickRepliesForState('timeslot')).toContain('Cuối tuần');
    });

    test('should return empty array for states without quick replies', () => {
      expect(geminiService.getQuickRepliesForState('phone')).toEqual([]);
      expect(geminiService.getQuickRepliesForState('complete')).toEqual([]);
    });
  });

  describe('handleServiceError', () => {
    test('should categorize timeout errors', () => {
      const error = new Error('Request timeout');
      const context = { currentState: 'welcome' };
      
      const result = geminiService.handleServiceError(error, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout');
      expect(result.reply).toContain('chậm');
    });

    test('should categorize rate limit errors', () => {
      const error = new Error('429 rate limit exceeded');
      const context = { currentState: 'welcome' };
      
      const result = geminiService.handleServiceError(error, context);
      
      expect(result.error).toBe('rateLimit');
      expect(result.reply).toContain('nhiều yêu cầu');
    });

    test('should categorize API errors', () => {
      const error = new Error('API connection failed');
      const context = { currentState: 'welcome' };
      
      const result = geminiService.handleServiceError(error, context);
      
      expect(result.error).toBe('apiError');
      expect(result.reply).toContain('hệ thống đang bận');
    });

    test('should handle general errors', () => {
      const error = new Error('Unknown error');
      const context = { currentState: 'welcome' };
      
      const result = geminiService.handleServiceError(error, context);
      
      expect(result.error).toBe('general');
      expect(result.fallback).toBe(true);
    });
  });

  describe('formatConversationHistory', () => {
    test('should format conversation history correctly', () => {
      const history = [
        { role: 'user', content: 'Chào bạn' },
        { role: 'assistant', content: 'Chào! Bạn quan tâm ngành nào?' },
        { role: 'user', content: 'CNTT' }
      ];

      const formatted = geminiService.formatConversationHistory(history);
      
      expect(formatted).toContain('Người dùng: Chào bạn');
      expect(formatted).toContain('Bot: Chào! Bạn quan tâm ngành nào?');
      expect(formatted).toContain('Người dùng: CNTT');
    });

    test('should handle empty history', () => {
      const formatted = geminiService.formatConversationHistory([]);
      expect(formatted).toBe('Chưa có lịch sử hội thoại');
    });

    test('should limit to recent history', () => {
      const longHistory = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));

      const formatted = geminiService.formatConversationHistory(longHistory);
      const lines = formatted.split('\n');
      
      // Should only include last 6 messages (3 exchanges)
      expect(lines.length).toBeLessThanOrEqual(6);
    });
  });

  describe('testConnection', () => {
    test('should return true for successful connection', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Test response',
          candidates: [{ finishReason: 'STOP' }]
        }
      });

      const result = await geminiService.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await geminiService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    test('should return service health information', () => {
      const health = geminiService.getHealthStatus();
      
      expect(health.service).toBe('GeminiChatService');
      expect(health.status).toBe('initialized');
      expect(health.model).toBe('gemini-1.5-flash');
      expect(health.hasApiKey).toBe(true);
      expect(health.config.temperature).toBe(0.3);
    });
  });
});