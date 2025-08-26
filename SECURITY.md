# HSU Chatbot Security Implementation

This document outlines the comprehensive security measures implemented in the HSU Chatbot application.

## Security Features Overview

### 1. Data Protection & Encryption

#### Phone Number Encryption
- **Algorithm**: AES-256-CBC encryption
- **Key Management**: 32-character encryption key stored in environment variables
- **Implementation**: Automatic encryption/decryption in database models
- **Storage**: Encrypted phone numbers stored alongside original for compatibility

#### Key Features:
- Unique IV (Initialization Vector) for each encryption operation
- Secure key validation on startup
- Automatic encryption in model pre-save hooks
- Masked phone numbers in JSON responses
- Decryption methods for authorized access

### 2. Input Sanitization & Validation

#### Comprehensive Input Sanitization
- **XSS Prevention**: Removes script tags and HTML content
- **Character Escaping**: Escapes dangerous characters (`<`, `>`, `&`, `"`, `'`)
- **Length Limits**: Enforces maximum lengths for all input fields
- **Type Validation**: Ensures correct data types for all inputs

#### Field-Specific Validation
- **Names**: Vietnamese character support, length validation
- **Phone Numbers**: Vietnamese format validation with standardization
- **Messages**: Content filtering and length limits
- **Session IDs**: Alphanumeric validation with length constraints

### 3. Request Logging & Monitoring

#### Comprehensive Request Logging
- **Request Details**: Method, URL, IP address, user agent
- **Response Metrics**: Status codes, response times
- **Error Tracking**: Detailed error logging with context
- **Sensitive Data Protection**: Automatic masking of phone numbers and passwords

#### Performance Monitoring
- **Metrics Collection**: Request counts, error rates, response times
- **Health Checks**: System health and performance endpoints
- **Log Rotation**: Automatic log management and cleanup

### 4. Security Headers & Middleware

#### Helmet Security Headers
- **Content Security Policy**: Restricts resource loading
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

#### Rate Limiting
- **Request Limits**: 60 requests per minute per IP
- **Configurable**: Environment-based rate limit settings
- **Error Handling**: Graceful rate limit exceeded responses

### 5. Environment Security

#### Environment Variable Validation
- **Startup Validation**: Checks all required environment variables
- **Key Format Validation**: Ensures encryption keys meet requirements
- **Production Checks**: Additional security validations in production mode

#### Required Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://connection_string
SESSION_SECRET=minimum_32_character_secret
ENCRYPTION_KEY=exactly_32_character_key
```

## Security Implementation Details

### Data Protection Class

```javascript
// Encrypt sensitive data
const dataProtection = new DataProtection();
const encrypted = dataProtection.encrypt('sensitive_data');
const decrypted = dataProtection.decrypt(encrypted);

// Phone-specific encryption
const phoneResult = dataProtection.encryptPhone('0901234567');
```

### Model-Level Encryption

```javascript
// Automatic encryption in Lead model
const lead = new Lead({
  phone: '0901234567',
  phoneStandardized: '0901234567'
});
// Phone numbers are automatically encrypted before saving
await lead.save();

// Decryption when needed
const decryptedPhones = lead.getDecryptedPhones();
```

### Request Validation Middleware

```javascript
// Automatic input sanitization
app.use(validator.sanitizeInputs);

// Endpoint-specific validation
app.post('/api/chat/message', validator.validateMessageRequest, handler);
app.post('/api/leads', validator.validateLeadRequest, handler);
```

### Request Logging

```javascript
// Automatic request logging
app.use(requestLogger.middleware);

// Error logging
app.use(requestLogger.errorMiddleware);

// Access metrics
const metrics = requestLogger.getMetrics();
```

## Security Best Practices Implemented

### 1. Defense in Depth
- Multiple layers of security validation
- Input sanitization at multiple levels
- Encryption for sensitive data storage
- Comprehensive error handling

### 2. Principle of Least Privilege
- Minimal data exposure in API responses
- Masked sensitive information in logs
- Environment-based feature flags
- Secure default configurations

### 3. Data Protection
- Encryption at rest for phone numbers
- Secure key management
- Data masking in outputs
- Automatic cleanup of sensitive data

### 4. Monitoring & Logging
- Comprehensive request logging
- Performance metrics tracking
- Error monitoring and alerting
- Security event logging

### 5. Input Validation
- Server-side validation for all inputs
- Type checking and format validation
- Length limits and content filtering
- SQL injection prevention

## Security Configuration

### Production Security Settings

```javascript
// config/production.js
module.exports = {
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS.split(','),
      credentials: true
    },
    rateLimit: {
      windowMs: 60000,
      max: 60
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      }
    }
  }
};
```

### Environment Validation

```javascript
// Startup validation
const requiredVars = [
  'GEMINI_API_KEY',
  'MONGODB_URI',
  'SESSION_SECRET',
  'ENCRYPTION_KEY'
];

requiredVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing: ${envVar}`);
    process.exit(1);
  }
});
```

## Security Testing

### Comprehensive Test Suite
- **Encryption/Decryption Tests**: Verify data protection functionality
- **Input Sanitization Tests**: Ensure XSS and injection prevention
- **Validation Tests**: Check all input validation rules
- **Logging Tests**: Verify secure logging practices

### Test Coverage
- 39 security-focused test cases
- Input validation scenarios
- Encryption/decryption workflows
- Error handling validation
- Performance monitoring tests

## Deployment Security

### PM2 Process Management
- **Process Isolation**: Separate process instances
- **Automatic Restart**: Recovery from failures
- **Log Management**: Secure log handling
- **Health Monitoring**: Process health checks

### Production Checklist
- [ ] Environment variables configured
- [ ] Encryption keys generated (32 characters)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured with specific origins
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Database access secured
- [ ] Log files protected
- [ ] Firewall rules configured
- [ ] Monitoring systems active

## Security Monitoring

### Key Metrics to Monitor
- **Request Volume**: Unusual traffic patterns
- **Error Rates**: Security-related errors
- **Response Times**: Performance degradation
- **Failed Validations**: Potential attack attempts
- **Database Access**: Unusual query patterns

### Log Analysis
- **Security Events**: Authentication failures, validation errors
- **Performance Issues**: Slow responses, high memory usage
- **Error Patterns**: Recurring errors or exceptions
- **Access Patterns**: Unusual user behavior

## Incident Response

### Security Event Handling
1. **Detection**: Automated monitoring and alerting
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore normal operations
5. **Analysis**: Post-incident review and improvements

### Emergency Procedures
- **Service Shutdown**: Graceful application shutdown
- **Database Isolation**: Secure database access
- **Log Preservation**: Maintain audit trails
- **Communication**: Stakeholder notification

## Compliance & Standards

### Security Standards Followed
- **OWASP Top 10**: Protection against common vulnerabilities
- **Data Protection**: Encryption and secure storage practices
- **Input Validation**: Comprehensive sanitization and validation
- **Logging Standards**: Secure and comprehensive logging

### Privacy Considerations
- **Data Minimization**: Collect only necessary information
- **Encryption**: Protect sensitive data at rest
- **Access Control**: Limit data access to authorized users
- **Retention**: Automatic cleanup of old data

This security implementation provides comprehensive protection for the HSU Chatbot application while maintaining usability and performance.