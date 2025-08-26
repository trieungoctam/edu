/**
 * Input Validation Middleware
 * Provides comprehensive validation for all user inputs
 * Implements input sanitization to prevent security issues
 */

const PhoneValidator = require('../utils/phoneValidation');
const ErrorHandler = require('./errorHandler');

class ValidationMiddleware {
    constructor() {
        this.phoneValidator = new PhoneValidator();
        
        // Valid major options
        this.validMajors = [
            'Quản trị Kinh doanh',
            'CNTT',
            'Thiết kế', 
            'Ngôn ngữ',
            'Truyền thông',
            'Khác'
        ];

        // Valid communication channels
        this.validChannels = ['Gọi điện', 'Zalo', 'Email'];

        // Valid timeslot options
        this.validTimeslots = [
            'Trong hôm nay',
            'Tối (19–21h)',
            'Cuối tuần',
            'Chọn giờ khác'
        ];

        // Valid conversation states
        this.validStates = [
            'welcome',
            'major',
            'major_other',
            'phone',
            'channel',
            'timeslot',
            'custom_time',
            'complete',
            'nudge'
        ];
    }

    /**
     * Sanitize string input to prevent XSS and injection attacks
     * @param {string} input - Input string to sanitize
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} Sanitized string
     */
    sanitizeString(input, maxLength = 1000) {
        if (typeof input !== 'string') {
            return '';
        }

        let sanitized = input.trim();
        
        // Remove script tags and content first
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Escape potentially dangerous characters first
        sanitized = sanitized.replace(/[<>'"&]/g, (match) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[match];
        });
        
        // Remove all HTML tags after escaping
        sanitized = sanitized.replace(/&lt;[^&]*&gt;/g, '');
        
        // Limit length after sanitization
        return sanitized.substring(0, maxLength);
    }

    /**
     * Validate and sanitize first name
     * @param {string} firstName - First name to validate
     * @returns {Object} Validation result
     */
    validateFirstName(firstName) {
        if (!firstName || typeof firstName !== 'string') {
            return {
                isValid: false,
                error: 'Tên không được để trống',
                code: 'EMPTY_FIRST_NAME'
            };
        }

        const sanitized = this.sanitizeString(firstName, 50);
        
        if (sanitized.length === 0) {
            return {
                isValid: false,
                error: 'Tên không hợp lệ',
                code: 'INVALID_FIRST_NAME'
            };
        }

        if (sanitized.length < 2) {
            return {
                isValid: false,
                error: 'Tên phải có ít nhất 2 ký tự',
                code: 'FIRST_NAME_TOO_SHORT'
            };
        }

        // Check for valid name characters (Vietnamese + English letters, spaces, common punctuation)
        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s\-\.]+$/;
        
        if (!nameRegex.test(sanitized)) {
            return {
                isValid: false,
                error: 'Tên chỉ được chứa chữ cái, dấu cách và dấu gạch ngang',
                code: 'INVALID_NAME_CHARACTERS'
            };
        }

        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    /**
     * Validate major selection
     * @param {string} major - Selected major
     * @returns {Object} Validation result
     */
    validateMajor(major) {
        if (!major || typeof major !== 'string') {
            return {
                isValid: false,
                error: 'Vui lòng chọn ngành học',
                code: 'EMPTY_MAJOR'
            };
        }

        // Check length before sanitization to catch overly long inputs
        if (major.length > 100) {
            return {
                isValid: false,
                error: 'Tên ngành quá dài (tối đa 100 ký tự)',
                code: 'MAJOR_TOO_LONG'
            };
        }

        const sanitized = this.sanitizeString(major, 100);

        // If it's a predefined major, validate against the list
        if (this.validMajors.includes(sanitized)) {
            return {
                isValid: true,
                sanitized: sanitized
            };
        }

        // If it's "Khác" or custom major, allow free text but with validation
        if (sanitized.length < 2) {
            return {
                isValid: false,
                error: 'Tên ngành phải có ít nhất 2 ký tự',
                code: 'MAJOR_TOO_SHORT'
            };
        }

        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    /**
     * Validate phone number using PhoneValidator
     * @param {string} phone - Phone number to validate
     * @returns {Object} Validation result
     */
    validatePhone(phone) {
        const result = this.phoneValidator.validate(phone);
        
        if (!result.isValid) {
            return {
                isValid: false,
                error: result.error,
                code: result.errorCode
            };
        }

        return {
            isValid: true,
            sanitized: result.standardizedPhone,
            original: result.originalPhone,
            network: result.network
        };
    }

    /**
     * Validate communication channel
     * @param {string} channel - Selected channel
     * @returns {Object} Validation result
     */
    validateChannel(channel) {
        if (!channel || typeof channel !== 'string') {
            return {
                isValid: false,
                error: 'Vui lòng chọn kênh liên hệ',
                code: 'EMPTY_CHANNEL'
            };
        }

        const sanitized = this.sanitizeString(channel, 50);

        if (!this.validChannels.includes(sanitized)) {
            return {
                isValid: false,
                error: 'Kênh liên hệ không hợp lệ',
                code: 'INVALID_CHANNEL'
            };
        }

        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    /**
     * Validate timeslot selection
     * @param {string} timeslot - Selected timeslot
     * @returns {Object} Validation result
     */
    validateTimeslot(timeslot) {
        if (!timeslot || typeof timeslot !== 'string') {
            return {
                isValid: false,
                error: 'Vui lòng chọn thời gian',
                code: 'EMPTY_TIMESLOT'
            };
        }

        // Check length before sanitization to catch overly long inputs
        if (timeslot.length > 200) {
            return {
                isValid: false,
                error: 'Mô tả thời gian quá dài (tối đa 200 ký tự)',
                code: 'TIMESLOT_TOO_LONG'
            };
        }

        const sanitized = this.sanitizeString(timeslot, 200);

        // If it's a predefined timeslot, validate against the list
        if (this.validTimeslots.includes(sanitized)) {
            return {
                isValid: true,
                sanitized: sanitized
            };
        }

        // If it's custom time, allow free text but with validation
        if (sanitized.length < 3) {
            return {
                isValid: false,
                error: 'Thời gian phải có ít nhất 3 ký tự',
                code: 'TIMESLOT_TOO_SHORT'
            };
        }

        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    /**
     * Validate chat message
     * @param {string} message - User message
     * @returns {Object} Validation result
     */
    validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return {
                isValid: false,
                error: 'Tin nhắn không được để trống',
                code: 'EMPTY_MESSAGE'
            };
        }

        // Check length before sanitization to catch overly long inputs
        if (message.length > 1000) {
            return {
                isValid: false,
                error: 'Tin nhắn quá dài (tối đa 1000 ký tự)',
                code: 'MESSAGE_TOO_LONG'
            };
        }

        const sanitized = this.sanitizeString(message, 1000);

        if (sanitized.length === 0) {
            return {
                isValid: false,
                error: 'Tin nhắn không hợp lệ',
                code: 'INVALID_MESSAGE'
            };
        }

        return {
            isValid: true,
            sanitized: sanitized
        };
    }

    /**
     * Validate session ID
     * @param {string} sessionId - Session ID to validate
     * @returns {Object} Validation result
     */
    validateSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            return {
                isValid: false,
                error: 'Session ID không được để trống',
                code: 'EMPTY_SESSION_ID'
            };
        }

        // Session ID should be alphanumeric with underscores and hyphens
        const sessionIdRegex = /^[a-zA-Z0-9_-]+$/;
        
        if (!sessionIdRegex.test(sessionId)) {
            return {
                isValid: false,
                error: 'Session ID không hợp lệ',
                code: 'INVALID_SESSION_ID'
            };
        }

        if (sessionId.length < 10 || sessionId.length > 100) {
            return {
                isValid: false,
                error: 'Session ID có độ dài không hợp lệ',
                code: 'INVALID_SESSION_ID_LENGTH'
            };
        }

        return {
            isValid: true,
            sanitized: sessionId
        };
    }

    /**
     * Middleware for validating chat message requests
     */
    validateMessageRequest = (req, res, next) => {
        const { sessionId, message } = req.body;

        // Validate session ID
        const sessionValidation = this.validateSessionId(sessionId);
        if (!sessionValidation.isValid) {
            return res.status(400).json(
                ErrorHandler.handleValidationError('sessionId', sessionId, sessionValidation.error)
            );
        }

        // Validate message
        const messageValidation = this.validateMessage(message);
        if (!messageValidation.isValid) {
            return res.status(400).json(
                ErrorHandler.handleValidationError('message', message, messageValidation.error)
            );
        }

        // Sanitize and update request body
        req.body.sessionId = sessionValidation.sanitized;
        req.body.message = messageValidation.sanitized;

        next();
    };

    /**
     * Middleware for validating session creation requests
     */
    validateSessionRequest = (req, res, next) => {
        const { firstName } = req.body;

        // Validate first name
        const nameValidation = this.validateFirstName(firstName);
        if (!nameValidation.isValid) {
            return res.status(400).json(
                ErrorHandler.handleValidationError('firstName', firstName, nameValidation.error)
            );
        }

        // Sanitize and update request body
        req.body.firstName = nameValidation.sanitized;

        next();
    };

    /**
     * Middleware for validating lead creation requests
     */
    validateLeadRequest = (req, res, next) => {
        const { sessionId, firstName, major, phone, channel, timeslot } = req.body;

        const validations = [
            { field: 'sessionId', value: sessionId, validator: this.validateSessionId.bind(this) },
            { field: 'firstName', value: firstName, validator: this.validateFirstName.bind(this) },
            { field: 'major', value: major, validator: this.validateMajor.bind(this) },
            { field: 'phone', value: phone, validator: this.validatePhone.bind(this) },
            { field: 'channel', value: channel, validator: this.validateChannel.bind(this) },
            { field: 'timeslot', value: timeslot, validator: this.validateTimeslot.bind(this) }
        ];

        for (const { field, value, validator } of validations) {
            const result = validator(value);
            if (!result.isValid) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError(field, value, result.error)
                );
            }
            // Update request body with sanitized value
            req.body[field] = result.sanitized;
        }

        next();
    };

    /**
     * Middleware for validating admin requests
     */
    validateAdminRequest = (req, res, next) => {
        const { dateFrom, dateTo, status, limit, page } = req.query;

        // Validate date parameters if provided
        if (dateFrom) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateFrom) || isNaN(Date.parse(dateFrom))) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError('dateFrom', dateFrom, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)')
                );
            }
        }

        if (dateTo) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateTo) || isNaN(Date.parse(dateTo))) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError('dateTo', dateTo, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)')
                );
            }
        }

        // Validate status if provided
        if (status) {
            const validStatuses = ['new', 'contacted', 'converted'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError('status', status, 'Trạng thái không hợp lệ')
                );
            }
        }

        // Validate pagination parameters
        if (limit) {
            const limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError('limit', limit, 'Limit phải là số từ 1 đến 100')
                );
            }
        }

        if (page) {
            const pageNum = parseInt(page);
            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json(
                    ErrorHandler.handleValidationError('page', page, 'Page phải là số lớn hơn 0')
                );
            }
        }

        next();
    };

    /**
     * General input sanitization middleware
     */
    sanitizeInputs = (req, res, next) => {
        // Sanitize all string inputs in request body
        if (req.body && typeof req.body === 'object') {
            for (const [key, value] of Object.entries(req.body)) {
                if (typeof value === 'string') {
                    req.body[key] = this.sanitizeString(value);
                }
            }
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            for (const [key, value] of Object.entries(req.query)) {
                if (typeof value === 'string') {
                    req.query[key] = this.sanitizeString(value, 200);
                }
            }
        }

        next();
    };
}

module.exports = ValidationMiddleware;