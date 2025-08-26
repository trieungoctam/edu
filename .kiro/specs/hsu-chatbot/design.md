# Design Document

## Overview

This document outlines the design for a simplified chatbot system for Hoa Sen University's admission counseling. The system will provide an automated conversation flow to collect student information and generate leads for the admission team. The architecture focuses on core functionality with a Node.js backend using Express.js, Google Gemini AI for conversation management, and a responsive frontend interface.

## Architecture

The system follows a three-tier architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │  External APIs  │
│   (React/JS)    │◄──►│   (Express.js)  │◄──►│  Google Gemini  │
│                 │    │                 │    │                 │
│ - Chat UI       │    │ - Session Mgmt  │    │ - AI Responses  │
│ - State Mgmt    │    │ - Lead Storage  │    │                 │
│ - Responsive    │    │ - Phone Valid   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    Database     │
                       │ (MongoDB/PG)    │
                       │                 │
                       │ - Sessions      │
                       │ - Leads         │
                       │ - Conversations │
                       └─────────────────┘
```

## Components and Interfaces

### 1. Frontend Components

#### Chat Interface
- **ChatContainer**: Main wrapper component managing chat state
- **MessageBubble**: Individual message display (user/bot)
- **QuickReplyButtons**: Pre-defined response options
- **InputArea**: Text input with send functionality
- **TypingIndicator**: Visual feedback during AI processing

#### State Management
```javascript
// Session state structure
const sessionState = {
  sessionId: string,
  currentStep: 'welcome' | 'major' | 'phone' | 'channel' | 'timeslot' | 'complete',
  userData: {
    firstName: string,
    major: string,
    phone: string,
    channel: string,
    timeslot: string
  },
  messages: Array<Message>,
  isTyping: boolean
}
```

### 2. Backend API Components

#### Express.js Server Structure
```javascript
// Main server setup
app.use(express.json());
app.use(cors());
app.use('/api/chat', chatRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/admin', adminRoutes);
```

#### API Endpoints
- `POST /api/chat/message` - Process user messages
- `GET /api/chat/session/:id` - Retrieve session data
- `POST /api/chat/session` - Create new session
- `POST /api/leads` - Store completed leads
- `GET /api/admin/stats` - Basic analytics

#### Session Management Service
```javascript
class SessionManager {
  async createSession(userId, firstName) {
    // Generate unique session ID
    // Initialize session state
    // Store in database
  }
  
  async updateSession(sessionId, updates) {
    // Update session data
    // Persist changes
  }
  
  async getSession(sessionId) {
    // Retrieve session from database
  }
}
```

### 3. Google Gemini AI Integration

#### Chat Service
```javascript
import { GoogleGenAI } from '@google/genai';

class GeminiChatService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  
  async processMessage(sessionId, userMessage, context) {
    const chat = this.ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    });
    
    const prompt = this.buildContextualPrompt(userMessage, context);
    const response = await chat.sendMessage({ message: prompt });
    
    return {
      reply: response.text,
      nextState: this.determineNextState(context, userMessage),
      quickReplies: this.getQuickReplies(context.currentStep)
    };
  }
  
  buildContextualPrompt(message, context) {
    const systemPrompt = `
      Bạn là chatbot tư vấn tuyển sinh của Đại học Hoa Sen.
      Luôn giữ tone thân thiện, chuyên nghiệp.
      Hiện tại đang ở bước: ${context.currentStep}
      Thông tin đã thu thập: ${JSON.stringify(context.userData)}
      
      Hướng dẫn theo flow:
      - welcome: Chào hỏi và hỏi về ngành quan tâm
      - major: Thu thập thông tin ngành học
      - phone: Yêu cầu số điện thoại
      - channel: Hỏi kênh liên hệ ưa thích
      - timeslot: Hỏi thời gian thuận tiện
      
      Tin nhắn người dùng: ${message}
    `;
    return systemPrompt;
  }
}
```

### 4. Conversation Flow Engine

#### State Machine Implementation
```javascript
class ConversationFlow {
  constructor() {
    this.states = {
      welcome: {
        message: "Chào {{first_name}} 👋 Chào mừng bạn đến với Đại học Hoa Sen! Bạn muốn nhận lộ trình học – học phí – học bổng cho ngành mình quan tâm chứ?",
        quickReplies: ['Có, mình quan tâm', 'Xem ngành đào tạo', 'Nói chuyện với người thật'],
        nextStates: ['major']
      },
      major: {
        message: "Bạn đang quan tâm ngành nào của HSU?",
        quickReplies: ['Quản trị Kinh doanh', 'CNTT', 'Thiết kế', 'Ngôn ngữ', 'Truyền thông', 'Khác'],
        nextStates: ['phone', 'major_other']
      },
      major_other: {
        message: "Bạn gõ tên ngành giúp mình nhé.",
        nextStates: ['phone']
      },
      phone: {
        message: "Để gửi brochure + học phí + suất học bổng phù hợp và sắp lịch tư vấn 1-1, mình xin số điện thoại của bạn được không? 📱\n\nHSU chỉ dùng số này để tư vấn tuyển sinh, không spam.",
        validation: this.validatePhone,
        errorMessage: "Hình như số chưa đúng 😅. Bạn nhập theo dạng 0xxxxxxxxx hoặc +84xxxxxxxxx giúp mình nhé.",
        nextStates: ['channel']
      },
      channel: {
        message: "Cảm ơn bạn! Mình đã ghi nhận số {{phone_standardized}}. Bạn muốn tư vấn qua Gọi hay Zalo?",
        quickReplies: ['Gọi điện', 'Zalo', 'Email'],
        nextStates: ['timeslot']
      },
      timeslot: {
        message: "Bạn muốn được liên hệ lúc nào thuận tiện nhất?",
        quickReplies: ['Trong hôm nay', 'Tối (19–21h)', 'Cuối tuần', 'Chọn giờ khác'],
        nextStates: ['complete', 'custom_time']
      },
      custom_time: {
        message: "Bạn gõ khung giờ thuận tiện giúp mình nhé (ví dụ: Sáng mai 9h, Chiều thứ 3...)",
        nextStates: ['complete']
      },
      complete: {
        message: "Tuyệt vời! Mình đã xếp lịch {{timeslot}} cho bạn qua {{channel}}. Tư vấn viên của HSU sẽ liên hệ để gửi brochure, học phí & thông tin học bổng ngành {{major}}.\n\nCảm ơn {{first_name}} đã tin tưởng HSU! 🎓"
      },
      nudge: {
        message: "Bạn còn muốn nhận brochure + học bổng ngành {{major}} không? Mình có thể giữ suất tư vấn cho bạn ngay hôm nay.",
        quickReplies: ['Có, giữ giúp mình', 'Để sau'],
        nextStates: ['complete']
      }
    };
  }
  
  validatePhone(phone) {
    const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|(\+84)[3|5|7|8|9][0-9]{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
  
  getNextState(currentState, userInput) {
    // Logic to determine next state based on current state and input
  }
}
```

## Data Models

### Session Schema (MongoDB)
```javascript
const sessionSchema = {
  _id: ObjectId,
  sessionId: String, // unique
  userId: String,
  firstName: String,
  currentState: String,
  userData: {
    major: String,
    phone: String,
    phoneStandardized: String,
    channel: String,
    timeslot: String
  },
  conversationHistory: [{
    role: String, // 'user' | 'assistant'
    content: String,
    timestamp: Date,
    quickReplies: [String]
  }],
  isCompleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Lead Schema (MongoDB)
```javascript
const leadSchema = {
  _id: ObjectId,
  leadId: String, // unique
  sessionId: String,
  firstName: String,
  major: String,
  phone: String,
  phoneStandardized: String,
  channel: String,
  timeslot: String,
  status: String, // 'new' | 'contacted' | 'converted'
  createdAt: Date
}
```

## Error Handling

### API Error Responses
```javascript
// Standardized error response format
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid phone number format',
    details: {}
  }
}
```

### Error Categories
1. **Validation Errors**: Invalid phone numbers, missing required fields
2. **AI Service Errors**: Gemini API failures, timeout issues
3. **Database Errors**: Connection issues, query failures
4. **Session Errors**: Invalid session ID, expired sessions

### Error Handling Strategy
```javascript
class ErrorHandler {
  static handleGeminiError(error) {
    if (error.status === 429) {
      return { message: 'Hệ thống đang bận, vui lòng thử lại sau.' };
    }
    return { message: 'Có lỗi xảy ra, vui lòng thử lại.' };
  }
  
  static handleValidationError(field, value) {
    const messages = {
      phone: 'Số điện thoại không đúng định dạng. Vui lòng nhập theo dạng 0xxxxxxxxx',
      major: 'Vui lòng chọn ngành học hợp lệ'
    };
    return { message: messages[field] || 'Dữ liệu không hợp lệ' };
  }
}
```

## Testing Strategy

### Unit Tests
- **Phone validation functions**: Test various phone number formats
- **State transition logic**: Verify correct flow progression
- **Gemini API integration**: Mock API responses and test error handling
- **Database operations**: Test CRUD operations for sessions and leads

### Integration Tests
- **Complete conversation flows**: Test end-to-end user journeys
- **API endpoint testing**: Verify request/response handling
- **Database integration**: Test data persistence and retrieval
- **Error scenarios**: Test graceful error handling

### Test Structure
```javascript
// Example test for phone validation
describe('Phone Validation', () => {
  test('should accept valid Vietnamese phone numbers', () => {
    expect(validatePhone('0901234567')).toBe(true);
    expect(validatePhone('+84901234567')).toBe(true);
  });
  
  test('should reject invalid phone numbers', () => {
    expect(validatePhone('123456')).toBe(false);
    expect(validatePhone('0123456789')).toBe(false);
  });
});

// Example test for conversation flow
describe('Conversation Flow', () => {
  test('should progress from welcome to major selection', async () => {
    const session = await createTestSession();
    const response = await processMessage(session.id, 'Có, mình quan tâm');
    
    expect(response.nextState).toBe('major');
    expect(response.quickReplies).toContain('Quản trị Kinh doanh');
  });
});
```

### Performance Testing
- **Concurrent user simulation**: Test with 20 simultaneous users
- **Response time measurement**: Ensure API responses under 3 seconds
- **Database performance**: Monitor query execution times
- **Memory usage**: Track memory consumption during extended sessions

## Security Considerations

### Data Protection
- **Input sanitization**: Sanitize all user inputs to prevent injection attacks
- **Phone number encryption**: Encrypt stored phone numbers using AES-256
- **Session security**: Use secure session tokens with expiration
- **API key protection**: Store Gemini API key in environment variables

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.'
});

app.use('/api/chat', chatLimiter);
```

### Environment Configuration
```javascript
// Required environment variables
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'MONGODB_URI',
  'SESSION_SECRET',
  'ENCRYPTION_KEY'
];

// Validate environment on startup
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## Deployment Architecture

### Development Environment
- **Local MongoDB**: For development and testing
- **Environment variables**: Stored in `.env` file
- **Hot reload**: Using nodemon for backend development
- **Frontend dev server**: React development server with proxy to backend

### Production Considerations
- **Database**: MongoDB Atlas or PostgreSQL on cloud provider
- **Environment variables**: Secure environment variable management
- **Process management**: PM2 for Node.js process management
- **Logging**: Structured logging with Winston
- **Monitoring**: Basic health checks and error tracking

### Scalability Design
- **Stateless API**: All session data stored in database, not in memory
- **Database indexing**: Proper indexes on sessionId, leadId, and timestamps
- **Connection pooling**: Efficient database connection management
- **Caching**: Optional Redis for session caching if needed

This design provides a solid foundation for the simplified HSU chatbot while maintaining flexibility for future enhancements. The architecture emphasizes simplicity, reliability, and maintainability over complex enterprise features.