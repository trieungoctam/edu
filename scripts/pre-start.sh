#!/bin/bash

# Pre-start script for HSU Chatbot
# Runs before the application starts

echo "🚀 HSU Chatbot Pre-Start Script"
echo "================================"

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
mkdir -p logs

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p temp
mkdir -p uploads

# Check environment variables
echo "🔍 Checking environment variables..."
required_vars=("GEMINI_API_KEY" "MONGODB_URI" "SESSION_SECRET" "ENCRYPTION_KEY")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate encryption key length
if [ ${#ENCRYPTION_KEY} -ne 32 ]; then
    echo "❌ Error: ENCRYPTION_KEY must be exactly 32 characters long"
    exit 1
else
    echo "✅ ENCRYPTION_KEY has correct length"
fi

# Check database connectivity
echo "🔍 Checking database connectivity..."
if command -v mongosh &> /dev/null; then
    if mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" --quiet; then
        echo "✅ Database connection successful"
    else
        echo "⚠️  Warning: Database connection failed, but continuing startup"
    fi
else
    echo "⚠️  Warning: mongosh not found, skipping database check"
fi

# Set proper file permissions
echo "🔒 Setting file permissions..."
chmod +x scripts/*.sh
chmod 644 logs/*.log 2>/dev/null || true

# Clear old temporary files
echo "🧹 Cleaning up temporary files..."
find temp -type f -mtime +7 -delete 2>/dev/null || true

# Log startup attempt
echo "📝 Logging startup attempt..."
echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") [INFO] Pre-start script completed successfully" >> logs/startup.log

echo "✅ Pre-start script completed successfully"
echo "================================"