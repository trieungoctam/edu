/**
 * GeminiChatService - Integrates Google Gemini AI for intelligent conversation handling
 * Processes user messages with contextual prompts and provides fallback responses
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simple circuit breaker cooldown after rate-limit (shared within process)
let rateLimitCooldownUntil = 0; // epoch ms

class GeminiChatService {
    constructor() {
        // Initialize Google Gemini AI client
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Configure AI parameters as specified in requirements
        this.modelConfig = {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        };

        // Initialize the model
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: this.modelConfig
        });

        // Fallback responses for different scenarios
        this.fallbackResponses = {
            apiError: "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau hoặc liên hệ hotline HSU: 1900 6929.",
            timeout: "Phản hồi hơi chậm, vui lòng thử lại. Nếu vấn đề tiếp tục, hãy liên hệ trực tiếp với HSU.",
            rateLimitError: "Hệ thống đang xử lý nhiều yêu cầu. Vui lòng đợi một chút và thử lại.",
            invalidResponse: "Mình gặp khó khăn trong việc xử lý câu hỏi này. Bạn có thể thử diễn đạt khác hoặc liên hệ tư vấn viên HSU.",
            general: "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ HSU để được hỗ trợ trực tiếp."
        };

        // Retry configuration
        this.maxRetries = 2;
        this.baseDelayMs = 300; // exponential backoff base
        this.requestTimeoutMs = 10000; // 10s
        this.minimumCooldownMs = parseInt(process.env.LLM_COOLDOWN_MS || '60000'); // default 60s
    }

    /**
     * Process user message with contextual AI response
     * @param {string} sessionId - Session identifier
     * @param {string} userMessage - User's input message
     * @param {Object} context - Conversation context including state and user data
     * @returns {Promise<Object>} AI response with next state and quick replies
     */
    async processMessage(sessionId, userMessage, context) {
        try {
            // If in cooldown, immediately provide graceful fallback without calling the API
            if (Date.now() < rateLimitCooldownUntil) {
                const cooldownError = new Error('AI rate limit cooldown active');
                return this.handleServiceError(cooldownError, {
                    ...context,
                    sessionId
                });
            }
            // Build contextual prompt based on conversation state
            const prompt = this.buildContextualPrompt(userMessage, context);

            // Generate AI response with timeout and retries
            const response = await this.withTimeout(this.generateResponseWithRetry(prompt), this.requestTimeoutMs);

            if (!response || !response.text) {
                throw new Error('Invalid response from AI service');
            }

            // Process and validate the AI response
            const processedResponse = this.processAIResponse(response.text, context);

            return {
                success: true,
                reply: processedResponse.reply,
                nextState: processedResponse.nextState,
                quickReplies: processedResponse.quickReplies,
                confidence: processedResponse.confidence || 0.8
            };

        } catch (error) {
            console.error('GeminiChatService Error:', error);
            return this.handleServiceError(error, context);
        }
    }

    /**
     * Build contextual prompt based on conversation state and user data
     * @param {string} userMessage - User's message
     * @param {Object} context - Conversation context
     * @returns {string} Formatted prompt for AI
     */
    buildContextualPrompt(userMessage, context) {
        const { currentState, userData = {}, conversationHistory = [] } = context;

        // Base system prompt for HSU chatbot
        const systemPrompt = `
Bạn là chatbot tư vấn tuyển sinh của Đại học Hoa Sen (HSU). 
Nhiệm vụ: Thu thập thông tin sinh viên tiềm năng và hướng dẫn họ qua quy trình tư vấn.

NGUYÊN TẮC QUAN TRỌNG:
- Luôn giữ tone thân thiện, chuyên nghiệp, nhiệt tình
- Chỉ tập trung vào chủ đề tuyển sinh và các ngành học của HSU
- Nếu người dùng hỏi ngoài chủ đề, lịch sự chuyển hướng về tuyển sinh
- Không bao giờ cung cấp thông tin sai lệch về học phí, chương trình học
- Luôn khuyến khích người dùng tiếp tục quy trình để nhận tư vấn chi tiết

THÔNG TIN HSU:
- Các ngành chính: Quản trị Kinh doanh, CNTT, Thiết kế, Ngôn ngữ, Truyền thông
- Có chương trình học bổng và hỗ trợ tài chính
- Hotline tư vấn: 1900 6929
- Cam kết chỉ sử dụng thông tin liên hệ cho mục đích tư vấn tuyển sinh

TRẠNG THÁI HIỆN TẠI: ${currentState}
THÔNG TIN ĐÃ THU THẬP: ${JSON.stringify(userData)}

QUY TRÌNH THEO TRẠNG THÁI:
${this.getStateGuidance(currentState)}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${this.formatConversationHistory(conversationHistory)}

TIN NHẮN NGƯỜI DÙNG: "${userMessage}"

YÊU CẦU PHẢN HỒI:
- Trả lời ngắn gọn, tối đa 2-3 câu
- Sử dụng emoji phù hợp để tạo cảm giác thân thiện
- Nếu cần thu thập thông tin, hỏi một cách tự nhiên
- Nếu người dùng đi lạc chủ đề, nhẹ nhàng đưa về tuyển sinh HSU
`;

        return systemPrompt.trim();
    }

    /**
     * Get state-specific guidance for AI prompt
     * @param {string} currentState - Current conversation state
     * @returns {string} State guidance text
     */
    getStateGuidance(currentState) {
        const stateGuidance = {
            welcome: `
- Chào hỏi thân thiện và giới thiệu HSU
- Hỏi về ngành học quan tâm
- Tạo cảm giác hứng thú về các cơ hội tại HSU`,

            major: `
- Hỏi về ngành học cụ thể mà sinh viên quan tâm
- Đưa ra các lựa chọn: Quản trị Kinh doanh, CNTT, Thiết kế, Ngôn ngữ, Truyền thông, Khác
- Nếu chọn "Khác", khuyến khích nhập tên ngành cụ thể`,

            major_other: `
- Yêu cầu sinh viên nhập tên ngành cụ thể
- Khuyến khích và tạo cảm giác thoải mái khi chia sẻ`,

            phone: `
- Giải thích lý do cần số điện thoại (gửi brochure, học phí, học bổng)
- Cam kết chỉ sử dụng cho mục đích tư vấn tuyển sinh
- Yêu cầu định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx`,

            channel: `
- Cảm ơn và xác nhận số điện thoại đã nhận
- Hỏi về kênh liên hệ ưa thích: Gọi điện, Zalo, Email`,

            timeslot: `
- Hỏi về thời gian thuận tiện để liên hệ
- Đưa ra các lựa chọn: Trong hôm nay, Tối (19-21h), Cuối tuần, Chọn giờ khác`,

            custom_time: `
- Yêu cầu nhập khung giờ cụ thể
- Đưa ví dụ: "Sáng mai 9h", "Chiều thứ 3"`,

            complete: `
- Xác nhận đã hoàn thành đăng ký tư vấn
- Tóm tắt thông tin đã thu thập
- Cảm ơn và tạo cảm giác tin tưởng về HSU`,

            nudge: `
- Nhắc nhở nhẹ nhàng về việc nhận tư vấn
- Tạo cảm giác cấp thiết nhưng không áp lực
- Đưa ra lựa chọn tiếp tục hoặc để sau`
        };

        return stateGuidance[currentState] || 'Hỗ trợ sinh viên với thông tin tuyển sinh HSU';
    }

    /**
     * Format conversation history for context
     * @param {Array} history - Conversation history array
     * @returns {string} Formatted history text
     */
    formatConversationHistory(history) {
        if (!history || history.length === 0) {
            return 'Chưa có lịch sử hội thoại';
        }

        // Get last 3 exchanges for context
        const recentHistory = history.slice(-6); // Last 3 user-bot exchanges

        return recentHistory.map(msg => {
            const role = msg.role === 'user' ? 'Người dùng' : 'Bot';
            return `${role}: ${msg.content}`;
        }).join('\n');
    }

    /**
     * Generate AI response using Gemini
     * @param {string} prompt - Formatted prompt
     * @returns {Promise<Object>} AI response
     */
    async generateResponse(prompt) {
        try {
            // Use structured contents as recommended by SDK
            const result = await this.model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [ { text: prompt } ]
                    }
                ]
            });
            const response = await result.response;

            return {
                text: response.text(),
                finishReason: response.candidates?.[0]?.finishReason
            };
        } catch (error) {
            // If rate limit, set cooldown based on retry info if present
            this.updateCooldownFromError(error);
            // Re-throw with more context
            throw new Error(`Gemini API Error: ${error.message}`);
        }
    }

    async generateResponseWithRetry(prompt) {
        let attempt = 0;
        while (true) {
            try {
                return await this.generateResponse(prompt);
            } catch (error) {
                attempt += 1;
                // Retry on transient errors
                const transient = /timeout|rate limit|429|ECONNRESET|ENETUNREACH|ETIMEDOUT|network/i.test(error.message);
                if (!transient || attempt > this.maxRetries) {
                    throw error;
                }
                // Honor server-provided retry hints if present on error
                let delay = this.baseDelayMs * Math.pow(2, attempt - 1);
                const hinted = this.extractRetryDelayMs(error);
                if (hinted) {
                    delay = Math.max(delay, hinted);
                }
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
        ]);
    }

    extractRetryDelayMs(error) {
        try {
            const msg = String(error && error.message || '');
            // Look for RetryInfo retryDelay":"11s" or Retry-After like patterns
            const m = msg.match(/retryDelay\":\"(\d+)s\"/i) || msg.match(/Retry-After:?\s*(\d+)/i);
            if (m && m[1]) {
                const seconds = parseInt(m[1], 10);
                if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
            }
        } catch (_) {}
        return 0;
    }

    updateCooldownFromError(error) {
        const msg = String(error && error.message || '');
        if (/429|rate limit/i.test(msg)) {
            const hintedMs = this.extractRetryDelayMs(error);
            const cooldownMs = Math.max(hintedMs, this.minimumCooldownMs);
            rateLimitCooldownUntil = Date.now() + cooldownMs;
        }
    }

    /**
     * Process and validate AI response
     * @param {string} aiResponse - Raw AI response text
     * @param {Object} context - Conversation context
     * @returns {Object} Processed response with next state and quick replies
     */
    processAIResponse(aiResponse, context) {
        // Clean and validate the response
        const cleanedResponse = aiResponse.trim();

        if (!cleanedResponse || cleanedResponse.length < 5) {
            throw new Error('AI response too short or empty');
        }

        // Determine next state based on current context
        // This should align with the ConversationFlow logic
        const nextState = this.determineNextStateFromAI(context.currentState, aiResponse, context.userData);

        // Get appropriate quick replies for the next state
        const quickReplies = this.getQuickRepliesForState(nextState);

        return {
            reply: cleanedResponse,
            nextState: nextState,
            quickReplies: quickReplies,
            confidence: 0.85 // Default confidence score
        };
    }

    /**
     * Determine next state based on AI response and current context
     * @param {string} currentState - Current conversation state
     * @param {string} aiResponse - AI response text
     * @param {Object} userData - Current user data
     * @returns {string} Next state name
     */
    determineNextStateFromAI(currentState, aiResponse, userData) {
        // This logic should mirror the ConversationFlow state transitions
        // The AI response is mainly for natural conversation, state transitions
        // should follow the predefined flow

        switch (currentState) {
            case 'welcome':
                return 'major';
            case 'major':
                return userData.major === 'Khác' ? 'major_other' : 'phone';
            case 'major_other':
                return 'phone';
            case 'phone':
                return 'channel';
            case 'channel':
                return 'timeslot';
            case 'timeslot':
                return userData.timeslot === 'Chọn giờ khác' ? 'custom_time' : 'complete';
            case 'custom_time':
                return 'complete';
            case 'nudge':
                return 'complete';
            default:
                return currentState;
        }
    }

    /**
     * Get quick replies for a specific state
     * @param {string} stateName - State name
     * @returns {Array} Array of quick reply options
     */
    getQuickRepliesForState(stateName) {
        const quickReplies = {
            welcome: ['Có, mình quan tâm', 'Xem ngành đào tạo', 'Nói chuyện với người thật'],
            major: ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'],
            major_other: [],
            phone: [],
            channel: ['Gọi điện', 'Zalo', 'Email'],
            timeslot: ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'],
            custom_time: [],
            complete: [],
            nudge: ['Có, giữ giúp mình', 'Để sau']
        };

        return quickReplies[stateName] || [];
    }

    /**
     * Handle service errors and provide appropriate fallback responses
     * @param {Error} error - The error that occurred
     * @param {Object} context - Conversation context
     * @returns {Object} Error response with fallback message
     */
    handleServiceError(error, context) {
        let fallbackMessage = this.fallbackResponses.general;
        let errorType = 'general';

        // Categorize error types for appropriate responses
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
            fallbackMessage = this.fallbackResponses.timeout;
            errorType = 'timeout';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            fallbackMessage = this.fallbackResponses.rateLimitError;
            errorType = 'rateLimit';
        } else if (error.message.includes('API') || error.message.includes('network')) {
            fallbackMessage = this.fallbackResponses.apiError;
            errorType = 'apiError';
        } else if (error.message.includes('Invalid response') || error.message.includes('too short')) {
            fallbackMessage = this.fallbackResponses.invalidResponse;
            errorType = 'invalidResponse';
        }

        // Enhanced error logging with more context
        console.error(`GeminiChatService ${errorType} error:`, {
            error: error.message,
            stack: error.stack,
            sessionId: context.sessionId || 'unknown',
            currentState: context.currentState || 'unknown',
            timestamp: new Date().toISOString(),
            userAgent: context.userAgent || 'unknown',
            errorType: errorType
        });

        return {
            success: false,
            reply: fallbackMessage,
            nextState: context.currentState, // Stay in current state on error
            quickReplies: this.getQuickRepliesForState(context.currentState),
            error: errorType,
            fallback: true
        };
    }

    /**
     * Create a timeout promise for race conditions
     * @param {number} ms - Timeout in milliseconds
     * @returns {Promise} Promise that rejects after timeout
     */
    createTimeoutPromise(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), ms);
        });
    }

    /**
     * Test the Gemini AI connection
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            const testPrompt = "Chào bạn! Đây là test kết nối.";
            const response = await this.generateResponse(testPrompt);
            return response && response.text && response.text.length > 0;
        } catch (error) {
            console.error('Gemini connection test failed:', error);
            return false;
        }
    }

    /**
     * Get service health status
     * @returns {Object} Service health information
     */
    getHealthStatus() {
        return {
            service: 'GeminiChatService',
            status: this.genAI ? 'initialized' : 'not_initialized',
            model: 'gemini-1.5-flash',
            config: this.modelConfig,
            hasApiKey: !!process.env.GEMINI_API_KEY
        };
    }
}

module.exports = GeminiChatService;