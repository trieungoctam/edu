#!/bin/bash

# HSU Chatbot Docker Setup Script
# This script helps manage the Docker environment for the HSU Chatbot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create .env file if it doesn't exist
create_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating a sample .env file..."
        cat > .env << EOF
# HSU Chatbot Environment Variables
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=your_session_secret_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_32_characters_long

# Database Configuration
MONGODB_URI=mongodb://hsu_user:hsu_password@localhost:27017/hsu-chatbot

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

# Server Configuration
PORT=3000
EOF
        print_warning "Please update the .env file with your actual API keys and secrets"
        print_warning "You can get a Gemini API key from: https://makersuite.google.com/app/apikey"
    else
        print_success ".env file already exists"
    fi
}

# Start only MongoDB
start_database() {
    print_status "Starting MongoDB container..."
    docker-compose up -d mongodb
    
    print_status "Waiting for MongoDB to be ready..."
    sleep 10
    
    # Check if MongoDB is ready
    if docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB is ready!"
        print_status "MongoDB connection string: mongodb://hsu_user:hsu_password@localhost:27017/hsu-chatbot"
        print_status "Admin connection: mongodb://admin:password123@localhost:27017/admin"
    else
        print_error "MongoDB failed to start properly"
        exit 1
    fi
}

# Start all services
start_all() {
    print_status "Starting all services..."
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    # Check if app is ready
    if curl -s http://localhost:3000/health > /dev/null; then
        print_success "All services are ready!"
        print_status "Application: http://localhost:3000"
        print_status "Admin Dashboard: http://localhost:3000/admin.html"
        print_status "Health Check: http://localhost:3000/health"
    else
        print_warning "Application might still be starting up..."
        print_status "Check logs with: docker-compose logs app"
    fi
}

# Stop all services
stop_all() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped"
}

# View logs
view_logs() {
    if [ -z "$1" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $1..."
        docker-compose logs -f "$1"
    fi
}

# Reset database
reset_database() {
    print_warning "This will delete all data in the database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing database container..."
        docker-compose stop mongodb
        docker-compose rm -f mongodb
        docker volume rm hsu-chatbot_mongodb_data 2>/dev/null || true
        
        print_status "Starting fresh database..."
        start_database
        print_success "Database reset completed"
    else
        print_status "Database reset cancelled"
    fi
}

# Show status
show_status() {
    print_status "Service status:"
    docker-compose ps
    
    echo
    print_status "Available endpoints:"
    echo "  Application: http://localhost:3000"
    echo "  Admin Dashboard: http://localhost:3000/admin.html"
    echo "  Health Check: http://localhost:3000/health"
    echo "  API Stats: http://localhost:3000/api/admin/stats"
    echo "  API Leads: http://localhost:3000/api/admin/leads"
    
    echo
    print_status "Database connection:"
    echo "  App connection: mongodb://hsu_user:hsu_password@localhost:27017/hsu-chatbot"
    echo "  Admin connection: mongodb://admin:password123@localhost:27017/admin"
}

# Test admin endpoints
test_admin() {
    print_status "Testing admin endpoints..."
    
    echo
    print_status "1. Health check:"
    curl -s http://localhost:3000/health | jq '.' || echo "Failed to connect"
    
    echo
    print_status "2. Admin stats:"
    curl -s http://localhost:3000/api/admin/stats | jq '.' || echo "Failed to get stats"
    
    echo
    print_status "3. Admin leads:"
    curl -s http://localhost:3000/api/admin/leads | jq '.data.leads | length' || echo "Failed to get leads"
    
    echo
    print_success "Admin endpoint testing completed"
}

# Main script logic
case "$1" in
    "setup")
        print_status "Setting up HSU Chatbot Docker environment..."
        check_docker
        create_env_file
        print_success "Setup completed! Run './scripts/docker-setup.sh start-db' to start the database"
        ;;
    "start-db")
        check_docker
        start_database
        ;;
    "start")
        check_docker
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        stop_all
        sleep 2
        start_all
        ;;
    "logs")
        view_logs "$2"
        ;;
    "reset-db")
        reset_database
        ;;
    "status")
        show_status
        ;;
    "test")
        test_admin
        ;;
    *)
        echo "HSU Chatbot Docker Management Script"
        echo
        echo "Usage: $0 {setup|start-db|start|stop|restart|logs|reset-db|status|test}"
        echo
        echo "Commands:"
        echo "  setup     - Initial setup (create .env, check Docker)"
        echo "  start-db  - Start only MongoDB database"
        echo "  start     - Start all services (database + app)"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  logs      - View logs (optionally specify service: logs mongodb)"
        echo "  reset-db  - Reset database (WARNING: deletes all data)"
        echo "  status    - Show service status and endpoints"
        echo "  test      - Test admin endpoints"
        echo
        echo "Examples:"
        echo "  $0 setup                 # Initial setup"
        echo "  $0 start-db              # Start only database"
        echo "  $0 start                 # Start all services"
        echo "  $0 logs app              # View app logs"
        echo "  $0 test                  # Test admin endpoints"
        exit 1
        ;;
esac