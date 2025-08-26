require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const database = require('./config/database');
const ErrorHandler = require('./middleware/errorHandler');
const ValidationMiddleware = require('./middleware/validation');
const RequestLogger = require('./middleware/requestLogger');
const DataProtection = require('./utils/dataProtection');

const app = express();
const validator = new ValidationMiddleware();
const requestLogger = new RequestLogger();
const dataProtection = new DataProtection();

// Environment variable validation
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  // Only require DB URI if not using in-memory storage
  ...(process.env.IN_MEMORY_STORAGE === 'true' ? [] : ['MONGODB_URI'])
];

// Validate required environment variables on startup
console.log('🔍 Validating environment variables...');
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
  console.log(`✅ ${envVar} is configured`);
});

// Validate encryption key format
if (!DataProtection.validateEncryptionKey(process.env.ENCRYPTION_KEY)) {
  console.error('❌ ENCRYPTION_KEY must be exactly 32 characters long');
  process.exit(1);
}
console.log('✅ ENCRYPTION_KEY format is valid');

// Validate other critical configurations
if (process.env.NODE_ENV === 'production') {
  if (process.env.SESSION_SECRET.length < 32) {
    console.error('❌ SESSION_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
  console.log('✅ Production security configurations validated');
}

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60, // limit each IP to 60 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.'
    }
  }
});

// Security middleware
app.use(helmet({
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
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware (before other middleware)
app.use(requestLogger.middleware);

// Input sanitization middleware
app.use(validator.sanitizeInputs);

// Rate limiting
app.use(limiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  const metrics = requestLogger.getMetrics();
  res.json({
    success: true,
    message: 'HSU Chatbot API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: {
      averageResponseTime: metrics.responseTimeStats.average,
      totalRequests: Object.values(metrics.requestCounts).reduce((a, b) => a + b, 0),
      totalErrors: Object.values(metrics.errorCounts).reduce((a, b) => a + b, 0)
    }
  });
});

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  const metrics = requestLogger.getMetrics();
  res.json({
    success: true,
    data: metrics,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

// API routes
app.use('/api/chat', require('./routes/chat'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler - must come before error handler
app.use(ErrorHandler.handle404);

// Error logging middleware
app.use(requestLogger.errorMiddleware);

// Global error handling middleware - must be last
app.use(ErrorHandler.middleware);

const PORT = process.env.PORT || 3000;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  requestLogger.logShutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  requestLogger.logShutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  requestLogger.writeLog('error', {
    message: 'Uncaught Exception',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    fatal: true
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  requestLogger.writeLog('error', {
    message: 'Unhandled Promise Rejection',
    reason: reason,
    fatal: false
  });
});

// Initialize database connection and start server
async function startServer() {
  try {
    console.log('🔌 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 HSU Chatbot server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🎯 Admin dashboard: http://localhost:${PORT}/admin.html`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔒 Security features enabled`);
      console.log(`📝 Request logging enabled`);
      
      // Log startup
      requestLogger.logStartup(PORT, process.env.NODE_ENV);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      requestLogger.writeLog('error', {
        message: 'Server error',
        error: {
          message: error.message,
          code: error.code,
          port: PORT
        }
      });
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    requestLogger.writeLog('error', {
      message: 'Failed to start server',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
}

startServer();

module.exports = app;