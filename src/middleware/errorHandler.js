/**
 * Error Handling Middleware
 * Provides comprehensive error handling for all API endpoints
 * Implements standardized error response format and logging
 */

const PhoneValidator = require('../utils/phoneValidation');

class ErrorHandler {
    /**
     * Standardized error response format
     * @param {string} code - Error code
     * @param {string} message - Error message
     * @param {Object} details - Additional error details
     * @returns {Object} Formatted error response
     */
    static formatError(code, message, details = {}) {
        return {
            success: false,
            error: {
                code,
                message,
                details,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Handle Gemini AI service errors with fallback messages
     * @param {Error} error - The error from Gemini service
     * @returns {Object} Formatted error response
     */
    static handleGeminiError(error) {
        console.error('Gemini AI Service Error:', error);

        if (error.message.includes('429') || error.message.includes('rate limit')) {
            return this.formatError(
                'AI_RATE_LIMIT',
                'Hệ thống đang xử lý nhiều yêu cầu. Vui lòng đợi một chút và thử lại.',
                { retryAfter: 60 }
            );
        }

        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
            return this.formatError(
                'AI_TIMEOUT',
                'Phản hồi hơi chậm, vui lòng thử lại. Nếu vấn đề tiếp tục, hãy liên hệ trực tiếp với HSU.',
                { timeout: true }
            );
        }

        if (error.message.includes('API') || error.message.includes('network')) {
            return this.formatError(
                'AI_SERVICE_ERROR',
                'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau hoặc liên hệ hotline HSU: 1900 6929.',
                { serviceDown: true }
            );
        }

        if (error.message.includes('Invalid response') || error.message.includes('too short')) {
            return this.formatError(
                'AI_INVALID_RESPONSE',
                'Mình gặp khó khăn trong việc xử lý câu hỏi này. Bạn có thể thử diễn đạt khác hoặc liên hệ tư vấn viên HSU.',
                { invalidResponse: true }
            );
        }

        // Generic AI error
        return this.formatError(
            'AI_GENERAL_ERROR',
            'Có lỗi xảy ra với hệ thống AI. Vui lòng thử lại hoặc liên hệ HSU để được hỗ trợ trực tiếp.',
            { fallback: true }
        );
    }

    /**
     * Handle database errors
     * @param {Error} error - Database error
     * @returns {Object} Formatted error response
     */
    static handleDatabaseError(error) {
        console.error('Database Error:', error);

        if (error.name === 'MongoNetworkError' || error.message.includes('connection')) {
            return this.formatError(
                'DATABASE_CONNECTION_ERROR',
                'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.',
                { connectionError: true }
            );
        }

        if (error.name === 'ValidationError') {
            return this.formatError(
                'DATABASE_VALIDATION_ERROR',
                'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
                { validationError: true, details: error.errors }
            );
        }

        if (error.code === 11000) { // Duplicate key error
            return this.formatError(
                'DATABASE_DUPLICATE_ERROR',
                'Thông tin đã tồn tại trong hệ thống.',
                { duplicateKey: true }
            );
        }

        return this.formatError(
            'DATABASE_ERROR',
            'Có lỗi xảy ra với cơ sở dữ liệu. Vui lòng thử lại.',
            { databaseError: true }
        );
    }

    /**
     * Handle validation errors
     * @param {string} field - Field name that failed validation
     * @param {string} value - Invalid value
     * @param {string} reason - Validation failure reason
     * @returns {Object} Formatted error response
     */
    static handleValidationError(field, value, reason) {
        const messages = {
            phone: 'Số điện thoại không đúng định dạng. Vui lòng nhập theo dạng 0xxxxxxxxx hoặc +84xxxxxxxxx',
            major: 'Vui lòng chọn ngành học hợp lệ',
            firstName: 'Tên không được để trống và phải là chữ cái',
            sessionId: 'Session ID không hợp lệ',
            message: 'Tin nhắn không được để trống',
            channel: 'Vui lòng chọn kênh liên hệ hợp lệ',
            timeslot: 'Vui lòng chọn thời gian hợp lệ'
        };

        return this.formatError(
            'VALIDATION_ERROR',
            messages[field] || 'Dữ liệu không hợp lệ',
            { field, value: typeof value === 'string' ? value.substring(0, 50) : value, reason }
        );
    }

    /**
     * Express error handling middleware
     * @param {Error} err - Error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static middleware(err, req, res, next) {
        // Log error for monitoring
        console.error('Express Error Handler:', {
            error: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });

        // Handle specific error types
        if (err.name === 'ValidationError') {
            return res.status(400).json(ErrorHandler.handleValidationError('general', null, err.message));
        }

        if (err.name === 'CastError') {
            return res.status(400).json(ErrorHandler.formatError(
                'INVALID_ID',
                'ID không hợp lệ',
                { invalidId: err.value }
            ));
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json(ErrorHandler.formatError(
                'FILE_TOO_LARGE',
                'File quá lớn. Vui lòng chọn file nhỏ hơn.',
                { maxSize: '10MB' }
            ));
        }

        if (err.type === 'entity.parse.failed') {
            return res.status(400).json(ErrorHandler.formatError(
                'INVALID_JSON',
                'Dữ liệu JSON không hợp lệ',
                { parseError: true }
            ));
        }

        // Handle rate limiting errors
        if (err.status === 429) {
            return res.status(429).json(ErrorHandler.formatError(
                'RATE_LIMIT_EXCEEDED',
                'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
                { retryAfter: err.retryAfter || 60 }
            ));
        }

        // Default server error
        const statusCode = err.statusCode || err.status || 500;
        res.status(statusCode).json(ErrorHandler.formatError(
            'INTERNAL_SERVER_ERROR',
            statusCode === 500 ? 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.' : err.message,
            { statusCode }
        ));
    }

    /**
     * Handle 404 errors
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static handle404(req, res) {
        res.status(404).json(ErrorHandler.formatError(
            'NOT_FOUND',
            'Không tìm thấy tài nguyên yêu cầu',
            { path: req.path, method: req.method }
        ));
    }

    /**
     * Async error wrapper for route handlers
     * @param {Function} fn - Async route handler function
     * @returns {Function} Wrapped function with error handling
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

module.exports = ErrorHandler;