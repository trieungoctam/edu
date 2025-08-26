/**
 * Production Configuration for HSU Chatbot
 * Security-focused configuration for production deployment
 */

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    timeout: parseInt(process.env.SERVER_TIMEOUT) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      bufferMaxEntries: 0,
      retryWrites: true,
      w: 'majority'
    }
  },

  // Security configuration
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    sessionSecret: process.env.SESSION_SECRET,
    
    // CORS settings
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },

    // Rate limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.'
        }
      }
    },

    // Helmet security headers
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    datePattern: 'YYYY-MM-DD',
    
    // Log rotation
    rotation: {
      frequency: 'daily',
      maxFiles: '7d'
    }
  },

  // Monitoring configuration
  monitoring: {
    healthCheck: {
      enabled: true,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    },
    
    metrics: {
      enabled: true,
      resetInterval: parseInt(process.env.METRICS_RESET_INTERVAL) || 3600000 // 1 hour
    }
  },

  // AI service configuration
  ai: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.3,
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 1024,
      timeout: parseInt(process.env.GEMINI_TIMEOUT) || 10000
    }
  },

  // Session configuration
  session: {
    expiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS) || 24,
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 3600000 // 1 hour
  },

  // Data protection
  dataProtection: {
    showDecryptedPhones: process.env.SHOW_DECRYPTED_PHONES === 'true',
    phoneEncryption: true,
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 365
  },

  // Performance settings
  performance: {
    bodyLimit: process.env.BODY_LIMIT || '1mb',
    parameterLimit: parseInt(process.env.PARAMETER_LIMIT) || 1000,
    compression: {
      enabled: true,
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
    }
  },

  // Feature flags
  features: {
    requestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    metricsEndpoint: process.env.ENABLE_METRICS_ENDPOINT !== 'false',
    adminInterface: process.env.ENABLE_ADMIN_INTERFACE !== 'false',
    phoneEncryption: process.env.ENABLE_PHONE_ENCRYPTION !== 'false'
  },

  // Validation settings
  validation: {
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 1000,
    maxNameLength: parseInt(process.env.MAX_NAME_LENGTH) || 50,
    maxTimeslotLength: parseInt(process.env.MAX_TIMESLOT_LENGTH) || 200,
    maxMajorLength: parseInt(process.env.MAX_MAJOR_LENGTH) || 100
  }
};

// Validate critical configuration
function validateConfig(config) {
  const errors = [];

  // Check required environment variables
  const requiredVars = [
    'GEMINI_API_KEY',
    'MONGODB_URI', 
    'SESSION_SECRET',
    'ENCRYPTION_KEY'
  ];

  requiredVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  });

  // Validate encryption key
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Validate session secret in production
  if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters in production');
  }

  // Validate database URI
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✅ Production configuration validated successfully');
}

// Auto-validate when loaded
if (process.env.NODE_ENV === 'production') {
  validateConfig(module.exports);
}