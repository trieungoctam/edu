/**
 * Request Logging Middleware
 * Provides comprehensive request logging and basic monitoring
 * Logs requests, responses, and performance metrics
 */

const fs = require('fs');
const path = require('path');

class RequestLogger {
    constructor() {
        // Allow overriding log directory via env; default to existing "logs" folder
        const configuredDir = process.env.LOG_DIR;
        this.logDir = configuredDir
            ? (path.isAbsolute(configuredDir) ? configuredDir : path.resolve(process.cwd(), configuredDir))
            : path.join(__dirname, '../../logs');
        this.ensureLogDirectory();
        
        // Performance tracking
        this.requestCounts = new Map();
        this.errorCounts = new Map();
        this.responseTimes = [];
        
        // Reset metrics every hour
        setInterval(() => {
            this.resetMetrics();
        }, 60 * 60 * 1000);
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Get current timestamp in ISO format
     * @returns {string} ISO timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Get client IP address from request
     * @param {Object} req - Express request object
     * @returns {string} Client IP address
     */
    getClientIP(req) {
        return req.ip || 
               (req.connection && req.connection.remoteAddress) || 
               (req.socket && req.socket.remoteAddress) ||
               (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
               'unknown';
    }

    /**
     * Sanitize sensitive data from request body
     * @param {Object} body - Request body
     * @returns {Object} Sanitized body
     */
    sanitizeRequestBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sanitized = { ...body };
        
        // Remove or mask sensitive fields
        const sensitiveFields = ['phone', 'phoneNumber', 'password', 'token', 'apiKey'];
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                if (field === 'phone' || field === 'phoneNumber') {
                    // Mask phone number (show only first 3 and last 2 digits)
                    const phone = sanitized[field].toString();
                    if (phone.length > 5) {
                        sanitized[field] = phone.substring(0, 3) + '*'.repeat(4) + phone.substring(phone.length - 2);
                    } else {
                        sanitized[field] = '*'.repeat(phone.length);
                    }
                } else {
                    sanitized[field] = '[REDACTED]';
                }
            }
        }

        return sanitized;
    }

    /**
     * Write log entry to file
     * @param {string} level - Log level (info, warn, error)
     * @param {Object} logData - Data to log
     */
    writeLog(level, logData) {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level,
            ...logData
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        
        // Write to appropriate log file
        const logFile = path.join(this.logDir, `${level}.log`);
        fs.appendFileSync(logFile, logLine);

        // Also write to combined log
        const combinedLogFile = path.join(this.logDir, 'combined.log');
        fs.appendFileSync(combinedLogFile, logLine);

        // Console output in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${JSON.stringify(logData, null, 2)}`);
        }
    }

    /**
     * Log request information
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in milliseconds
     */
    logRequest(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            userAgent: req.get('User-Agent') || 'unknown',
            clientIP: this.getClientIP(req),
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            requestBody: this.sanitizeRequestBody(req.body),
            queryParams: req.query,
            sessionId: req.body?.sessionId || req.query?.sessionId || 'none'
        };

        // Determine log level based on status code
        let level = 'info';
        if (res.statusCode >= 400 && res.statusCode < 500) {
            level = 'warn';
        } else if (res.statusCode >= 500) {
            level = 'error';
        }

        this.writeLog(level, logData);

        // Update metrics
        this.updateMetrics(req, res, responseTime);
    }

    /**
     * Log error information
     * @param {Error} error - Error object
     * @param {Object} req - Express request object
     * @param {Object} additionalInfo - Additional error context
     */
    logError(error, req, additionalInfo = {}) {
        const logData = {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            request: {
                method: req.method,
                url: req.originalUrl || req.url,
                clientIP: this.getClientIP(req),
                userAgent: req.get('User-Agent') || 'unknown',
                body: this.sanitizeRequestBody(req.body),
                query: req.query
            },
            ...additionalInfo
        };

        this.writeLog('error', logData);
    }

    /**
     * Update performance metrics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in milliseconds
     */
    updateMetrics(req, res, responseTime) {
        // Count requests by endpoint
        const endpoint = `${req.method} ${req.route?.path || req.originalUrl}`;
        this.requestCounts.set(endpoint, (this.requestCounts.get(endpoint) || 0) + 1);

        // Count errors by status code
        if (res.statusCode >= 400) {
            this.errorCounts.set(res.statusCode, (this.errorCounts.get(res.statusCode) || 0) + 1);
        }

        // Track response times (keep last 1000)
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 1000) {
            this.responseTimes.shift();
        }
    }

    /**
     * Get current metrics
     * @returns {Object} Current performance metrics
     */
    getMetrics() {
        const avgResponseTime = this.responseTimes.length > 0 
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
            : 0;

        const maxResponseTime = this.responseTimes.length > 0 
            ? Math.max(...this.responseTimes) 
            : 0;

        return {
            requestCounts: Object.fromEntries(this.requestCounts),
            errorCounts: Object.fromEntries(this.errorCounts),
            responseTimeStats: {
                average: Math.round(avgResponseTime * 100) / 100,
                maximum: maxResponseTime,
                samples: this.responseTimes.length
            },
            timestamp: this.getTimestamp()
        };
    }

    /**
     * Reset metrics (called hourly)
     */
    resetMetrics() {
        this.requestCounts.clear();
        this.errorCounts.clear();
        this.responseTimes = [];
        
        this.writeLog('info', {
            message: 'Metrics reset',
            action: 'metrics_reset'
        });
    }

    /**
     * Express middleware for request logging
     */
    middleware = (req, res, next) => {
        const startTime = Date.now();

        // Override res.end to capture response
        const originalEnd = res.end;
        res.end = (...args) => {
            const responseTime = Date.now() - startTime;
            this.logRequest(req, res, responseTime);
            originalEnd.apply(res, args);
        };

        next();
    };

    /**
     * Express middleware for error logging
     */
    errorMiddleware = (error, req, res, next) => {
        this.logError(error, req, {
            timestamp: this.getTimestamp(),
            handled: true
        });
        next(error);
    };

    /**
     * Log application startup
     * @param {number} port - Server port
     * @param {string} environment - Environment name
     */
    logStartup(port, environment) {
        this.writeLog('info', {
            message: 'HSU Chatbot server started',
            port,
            environment,
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        });
    }

    /**
     * Log application shutdown
     */
    logShutdown() {
        this.writeLog('info', {
            message: 'HSU Chatbot server shutting down',
            uptime: process.uptime(),
            pid: process.pid
        });
    }
}

module.exports = RequestLogger;