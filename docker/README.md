# HSU Chatbot Docker Setup

Hướng dẫn sử dụng Docker để chạy HSU Chatbot với MongoDB database.

## Yêu cầu

- Docker và Docker Compose đã được cài đặt
- Port 3000 và 27017 không bị sử dụng

## Cài đặt nhanh

### 1. Setup ban đầu

```bash
# Chạy script setup
./scripts/docker-setup.sh setup
```

Script này sẽ:
- Kiểm tra Docker đã được cài đặt
- Tạo file `.env` mẫu (nếu chưa có)
- Hướng dẫn cấu hình API keys

### 2. Cấu hình API Keys

Chỉnh sửa file `.env` và thêm các API keys thật:

```bash
# Lấy Gemini API key từ: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Tạo session secret (ít nhất 32 ký tự)
SESSION_SECRET=your_secure_session_secret_here_32_chars

# Tạo encryption key (đúng 32 ký tự)
ENCRYPTION_KEY=your_32_character_encryption_key_
```

### 3. Khởi động database

```bash
# Chỉ khởi động MongoDB (để test local app)
./scripts/docker-setup.sh start-db
```

Hoặc khởi động toàn bộ hệ thống:

```bash
# Khởi động cả app và database
./scripts/docker-setup.sh start
```

## Các lệnh Docker

### Quản lý services

```bash
# Khởi động tất cả
./scripts/docker-setup.sh start

# Chỉ khởi động database
./scripts/docker-setup.sh start-db

# Dừng tất cả
./scripts/docker-setup.sh stop

# Khởi động lại
./scripts/docker-setup.sh restart

# Xem trạng thái
./scripts/docker-setup.sh status
```

### Xem logs

```bash
# Xem logs tất cả services
./scripts/docker-setup.sh logs

# Xem logs của app
./scripts/docker-setup.sh logs app

# Xem logs của MongoDB
./scripts/docker-setup.sh logs mongodb
```

### Database management

```bash
# Reset database (XÓA TẤT CẢ DỮ LIỆU)
./scripts/docker-setup.sh reset-db
```

### Testing

```bash
# Test admin endpoints
./scripts/docker-setup.sh test
```

## Endpoints khi chạy

Khi Docker containers đang chạy:

- **Application**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin.html
- **Health Check**: http://localhost:3000/health
- **API Stats**: http://localhost:3000/api/admin/stats
- **API Leads**: http://localhost:3000/api/admin/leads

## Database Connection

### Từ application
```
mongodb://hsu_user:hsu_password@localhost:27017/hsu-chatbot
```

### Admin connection (MongoDB Compass, etc.)
```
mongodb://admin:password123@localhost:27017/admin
```

## Cấu trúc Docker

### Services

1. **mongodb**: MongoDB 7.0 database
   - Port: 27017
   - Volume: `mongodb_data` (persistent storage)
   - Init script: `docker/mongo-init.js`

2. **app**: Node.js application
   - Port: 3000
   - Depends on: mongodb
   - Health check: `/health` endpoint

### Volumes

- `mongodb_data`: Lưu trữ dữ liệu MongoDB persistent

### Networks

- `hsu-network`: Bridge network cho communication giữa services

## Sample Data

MongoDB container sẽ tự động tạo sample data khi khởi động lần đầu:

- 3 sample sessions (2 completed, 1 incomplete)
- 2 sample leads với các status khác nhau
- Indexes được tạo tự động cho performance

## Troubleshooting

### Port conflicts

Nếu port 3000 hoặc 27017 đã được sử dụng:

```bash
# Kiểm tra port đang được sử dụng
lsof -i :3000
lsof -i :27017

# Dừng process đang sử dụng port hoặc thay đổi port trong docker-compose.yml
```

### Database connection issues

```bash
# Kiểm tra MongoDB logs
./scripts/docker-setup.sh logs mongodb

# Kiểm tra app logs
./scripts/docker-setup.sh logs app

# Reset database nếu cần
./scripts/docker-setup.sh reset-db
```

### Permission issues

```bash
# Đảm bảo script có quyền execute
chmod +x scripts/docker-setup.sh

# Kiểm tra Docker permissions
docker ps
```

## Development Workflow

### Chỉ sử dụng database từ Docker

Nếu bạn muốn chạy app locally nhưng sử dụng database từ Docker:

```bash
# 1. Khởi động chỉ database
./scripts/docker-setup.sh start-db

# 2. Chạy app locally
npm run dev
```

### Full Docker development

```bash
# 1. Khởi động tất cả
./scripts/docker-setup.sh start

# 2. Xem logs để debug
./scripts/docker-setup.sh logs app

# 3. Test admin interface
./scripts/docker-setup.sh test
```

## Testing với Docker

### Unit tests (không cần database)

```bash
npm run test:unit
```

### Integration tests (cần database)

```bash
# Khởi động database trước
./scripts/docker-setup.sh start-db

# Chạy integration tests
npm run test:integration
```

### Admin functionality tests

```bash
# Khởi động database
./scripts/docker-setup.sh start-db

# Test admin routes
npm run test:admin
```

## Production Deployment

File `docker-compose.yml` hiện tại được cấu hình cho development. Để deploy production:

1. Tạo `docker-compose.prod.yml` với:
   - Environment variables từ secrets
   - Resource limits
   - Restart policies
   - Health checks
   - Logging configuration

2. Sử dụng external database thay vì container MongoDB

3. Cấu hình reverse proxy (nginx) cho SSL và load balancing

## Monitoring

### Health checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Resource usage

```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```