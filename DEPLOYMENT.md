# HSU Chatbot Deployment Guide

This guide covers the deployment of the HSU Chatbot application with security measures and production-ready configuration.

## Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- PM2 (for process management)
- SSL certificate (for HTTPS)
- Domain name

## Environment Setup

### 1. Environment Variables

Create a `.env` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
MONGODB_URI=mongodb://username:password@host:port/database

# Security Configuration
SESSION_SECRET=your_secure_session_secret_minimum_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key_

# AI Service Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging Configuration
LOG_LEVEL=info
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m

# Performance Configuration
BODY_LIMIT=1mb
COMPRESSION_LEVEL=6

# Feature Flags
ENABLE_REQUEST_LOGGING=true
ENABLE_METRICS_ENDPOINT=true
ENABLE_ADMIN_INTERFACE=true
ENABLE_PHONE_ENCRYPTION=true
SHOW_DECRYPTED_PHONES=false

# Data Protection
DATA_RETENTION_DAYS=365
SESSION_EXPIRY_HOURS=24

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
METRICS_RESET_INTERVAL=3600000

# Optional: Startup Notifications
STARTUP_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

### 2. Security Considerations

#### Encryption Key Generation
Generate a secure 32-character encryption key:

```bash
# Using OpenSSL
openssl rand -base64 32 | cut -c1-32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### Session Secret Generation
Generate a secure session secret:

```bash
# Using OpenSSL
openssl rand -base64 64

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd hsu-chatbot
npm install
```

### 2. Install PM2 Globally

```bash
npm install -g pm2
```

### 3. Create Required Directories

```bash
mkdir -p logs temp uploads
chmod 755 logs temp uploads
```

## Database Setup

### 1. MongoDB Configuration

Ensure MongoDB is running and accessible. For production, use MongoDB Atlas or a properly secured MongoDB instance.

```bash
# Test database connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

### 2. Database Indexes

The application will create necessary indexes automatically, but you can create them manually:

```javascript
// Connect to your database
use hsu_chatbot

// Create indexes for sessions
db.sessions.createIndex({ "sessionId": 1 }, { unique: true })
db.sessions.createIndex({ "userId": 1 })
db.sessions.createIndex({ "createdAt": -1 })
db.sessions.createIndex({ "isCompleted": 1 })

// Create indexes for leads
db.leads.createIndex({ "leadId": 1 }, { unique: true })
db.leads.createIndex({ "sessionId": 1 })
db.leads.createIndex({ "status": 1 })
db.leads.createIndex({ "createdAt": -1 })
db.leads.createIndex({ "phoneEncrypted": 1 })
```

## Deployment Options

### Option 1: PM2 Deployment (Recommended)

#### 1. Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### 2. Monitor the Application

```bash
# View logs
pm2 logs hsu-chatbot

# Monitor processes
pm2 monit

# View process status
pm2 status

# Restart application
pm2 restart hsu-chatbot

# Reload application (zero-downtime)
pm2 reload hsu-chatbot
```

### Option 2: Docker Deployment

#### 1. Build Docker Image

```bash
docker build -t hsu-chatbot .
```

#### 2. Run with Docker Compose

```bash
docker-compose up -d
```

#### 3. Monitor Docker Containers

```bash
# View logs
docker-compose logs -f

# Check container status
docker-compose ps

# Restart services
docker-compose restart
```

## SSL/HTTPS Setup

### Using Nginx as Reverse Proxy

Create `/etc/nginx/sites-available/hsu-chatbot`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hsu-chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Maintenance

### 1. Health Checks

The application provides several monitoring endpoints:

- `GET /health` - Basic health check
- `GET /metrics` - Detailed metrics and performance data

### 2. Log Management

Logs are stored in the `logs/` directory:

- `combined.log` - All log entries
- `info.log` - Info level logs
- `warn.log` - Warning level logs  
- `error.log` - Error level logs
- `startup.log` - Application startup logs

#### Log Rotation

Set up logrotate for log management:

```bash
sudo nano /etc/logrotate.d/hsu-chatbot
```

```
/path/to/hsu-chatbot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload hsu-chatbot
    endscript
}
```

### 3. Database Maintenance

#### Regular Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backups/hsu-chatbot-$DATE"
```

#### Data Cleanup

Set up a cron job to clean old sessions:

```bash
# Add to crontab
0 2 * * * /usr/bin/node /path/to/hsu-chatbot/scripts/cleanup-sessions.js
```

### 4. Performance Monitoring

Monitor key metrics:

- Response times
- Error rates
- Memory usage
- Database performance
- Request volume

Use tools like:
- PM2 monitoring
- MongoDB Compass
- Custom metrics endpoint (`/metrics`)

## Security Checklist

- [ ] Environment variables are properly set
- [ ] Encryption key is 32 characters long
- [ ] Session secret is at least 32 characters
- [ ] HTTPS is enabled with valid SSL certificate
- [ ] CORS is configured with specific origins
- [ ] Rate limiting is enabled
- [ ] Input sanitization is working
- [ ] Phone number encryption is enabled
- [ ] Security headers are set (via Helmet)
- [ ] Database access is secured
- [ ] Logs don't contain sensitive information
- [ ] File permissions are properly set
- [ ] Firewall rules are configured

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check environment variables
pm2 logs hsu-chatbot --lines 50

# Validate configuration
node -e "require('./config/production.js')"
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Check database logs
tail -f /var/log/mongodb/mongod.log
```

#### 3. High Memory Usage

```bash
# Monitor memory usage
pm2 monit

# Restart if needed
pm2 restart hsu-chatbot
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Test SSL configuration
nginx -t
```

### Performance Optimization

1. **Enable compression** in Nginx
2. **Use CDN** for static assets
3. **Optimize database queries** with proper indexes
4. **Monitor and tune** PM2 cluster size
5. **Implement caching** for frequently accessed data

## Backup and Recovery

### 1. Database Backup

```bash
# Full backup
mongodump --uri="$MONGODB_URI" --out="/backups/$(date +%Y%m%d)"

# Restore from backup
mongorestore --uri="$MONGODB_URI" /backups/20240101
```

### 2. Application Backup

```bash
# Backup application files
tar -czf hsu-chatbot-backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=temp \
    /path/to/hsu-chatbot
```

### 3. Configuration Backup

```bash
# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 /backups/pm2-$(date +%Y%m%d).backup
```

## Support

For deployment issues or questions:

1. Check the logs first: `pm2 logs hsu-chatbot`
2. Verify configuration: Review environment variables
3. Test connectivity: Database, external APIs
4. Monitor resources: CPU, memory, disk space
5. Review security: SSL, firewall, permissions

Remember to keep your dependencies updated and monitor security advisories for the packages used in this application.