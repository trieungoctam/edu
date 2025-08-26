# 🔧 HƯỚNG DẪN KHẮC PHỤC NHANH

## 1. Sửa Database Authentication (5 phút)

### Vấn đề
```
MongoServerError: Command delete requires authentication
```

### Giải pháp
Cập nhật file `.env`:

```bash
# Thay thế dòng hiện tại
MONGODB_URI=mongodb://localhost:27017/hsu-chatbot

# Bằng một trong các options sau:

# Option 1: Local MongoDB không auth
MONGODB_URI=mongodb://127.0.0.1:27017/hsu-chatbot

# Option 2: Local MongoDB có auth
MONGODB_URI=mongodb://username:password@localhost:27017/hsu-chatbot

# Option 3: MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hsu-chatbot
```

## 2. Chạy Tests (2 phút)

```bash
# Test core components
npm test -- --testPathPattern="phoneValidation|ConversationFlow|frontend"

# Test toàn bộ (sau khi sửa DB)
npm test
```

## 3. Khởi động Server (1 phút)

```bash
# Development
npm run dev

# Production
npm start
```

## 4. Kiểm tra Health (30 giây)

```bash
# Mở browser hoặc curl
curl http://localhost:3000/health
```

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "HSU Chatbot API is running",
  "environment": "development"
}
```

## 5. Test Frontend (1 phút)

Mở browser: `http://localhost:3000`

Kiểm tra:
- ✅ Chat interface hiển thị
- ✅ Có thể gửi tin nhắn
- ✅ Quick replies hoạt động
- ✅ Responsive trên mobile

## 6. Optional: Cải thiện Code Quality

```bash
# Thêm TypeScript types
npm install --save-dev @types/express @types/cors @types/mongoose

# Format code
npm install --save-dev prettier
npx prettier --write "src/**/*.js"
```

---

## 🚨 Nếu vẫn gặp lỗi

### Database Connection Issues
```bash
# Kiểm tra MongoDB đang chạy
brew services list | grep mongodb
# hoặc
sudo systemctl status mongod

# Khởi động MongoDB
brew services start mongodb-community
# hoặc
sudo systemctl start mongod
```

### Port Conflicts
```bash
# Kiểm tra port 3000
lsof -i :3000

# Thay đổi port trong .env
PORT=3001
```

### Permission Issues
```bash
# Fix permissions
sudo chown -R $(whoami) node_modules
npm install
```

---

**Thời gian tổng:** ~10 phút  
**Kết quả:** Hệ thống hoạt động hoàn chỉnh