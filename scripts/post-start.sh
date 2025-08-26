#!/bin/bash

# Post-start script for HSU Chatbot
# Runs after the application starts successfully

echo "🎉 HSU Chatbot Post-Start Script"
echo "================================"

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 5

# Health check
echo "🏥 Performing health check..."
PORT=${PORT:-3000}
HEALTH_URL="http://localhost:$PORT/health"

max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "🔍 Health check attempt $attempt/$max_attempts..."
    
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Health check passed"
        break
    else
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Health check failed after $max_attempts attempts"
            echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") [ERROR] Health check failed after startup" >> logs/startup.log
            exit 1
        fi
        echo "⏳ Health check failed, retrying in 3 seconds..."
        sleep 3
    fi
    
    ((attempt++))
done

# Log successful startup
echo "📝 Logging successful startup..."
echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") [INFO] Application started successfully on port $PORT" >> logs/startup.log

# Send startup notification (if configured)
if [ -n "$STARTUP_WEBHOOK_URL" ]; then
    echo "📢 Sending startup notification..."
    curl -X POST "$STARTUP_WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d "{\"message\": \"HSU Chatbot started successfully\", \"port\": $PORT, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"}" \
         2>/dev/null || echo "⚠️  Warning: Failed to send startup notification"
fi

# Display startup information
echo "📊 Startup Information:"
echo "  - Port: $PORT"
echo "  - Environment: ${NODE_ENV:-development}"
echo "  - Process ID: $$"
echo "  - Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"

echo "✅ Post-start script completed successfully"
echo "🚀 HSU Chatbot is now running!"
echo "================================"