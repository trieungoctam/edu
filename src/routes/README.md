# Chat API Endpoints

This document describes the chat API endpoints implemented for the HSU Chatbot system.

## Base URL
```
http://localhost:3000/api/chat
```

## Rate Limiting
- **Limit**: 60 requests per minute per IP address
- **Response**: 429 Too Many Requests with error message in Vietnamese

## Endpoints

### 1. Create New Session
**POST** `/session`

Creates a new conversation session and returns a welcome message.

#### Request Body
```json
{
  "firstName": "string" // Required, user's first name (2-100 characters)
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4-string",
    "message": "Chào [firstName] 👋 Chào mừng bạn đến với Đại học Hoa Sen!...",
    "quickReplies": ["Có, mình quan tâm", "Xem ngành đào tạo", "Nói chuyện với người thật"],
    "currentState": "welcome"
  }
}
```

#### Error Responses
- **400 Bad Request**: Missing or invalid firstName
- **500 Internal Server Error**: Database or service error

---

### 2. Process Message
**POST** `/message`

Processes a user message and returns the bot's response.

#### Request Body
```json
{
  "sessionId": "string", // Required, valid session ID
  "message": "string"    // Required, user's message (non-empty)
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Bot response message",
    "quickReplies": ["Option 1", "Option 2", "Option 3"],
    "currentState": "major|phone|channel|timeslot|complete",
    "isComplete": false
  }
}
```

#### Error Responses
- **400 Bad Request**: Missing sessionId or message
- **404 Not Found**: Session not found or expired
- **503 Service Unavailable**: AI service temporarily unavailable
- **500 Internal Server Error**: Processing error

---

### 3. Get Session Data
**GET** `/session/:id`

Retrieves session information and conversation history.

#### Parameters
- `id` (path): Session ID (required)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-string",
    "firstName": "User Name",
    "currentState": "major",
    "conversationHistory": [
      {
        "role": "assistant|user",
        "content": "Message content",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "quickReplies": ["Option 1", "Option 2"]
      }
    ],
    "isCompleted": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid session ID format
- **404 Not Found**: Session not found
- **500 Internal Server Error**: Database error

## Error Response Format

All error responses follow this standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message in Vietnamese"
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `SESSION_NOT_FOUND`: Session doesn't exist or expired
- `AI_SERVICE_ERROR`: Gemini AI service unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Conversation Flow States

The chatbot follows these conversation states:

1. **welcome**: Initial greeting and introduction
2. **major**: Collecting user's area of interest
3. **major_other**: Custom major input (if user selects "Khác")
4. **phone**: Phone number collection and validation
5. **channel**: Communication channel preference
6. **timeslot**: Preferred contact timing
7. **custom_time**: Custom timing input (if user selects "Chọn giờ khác")
8. **complete**: Conversation completed, lead generated
9. **nudge**: Re-engagement message for inactive users

## Input Validation

### Phone Number Validation
- Accepts Vietnamese formats: `0xxxxxxxxx` or `+84xxxxxxxxx`
- Automatically standardizes to `0xxxxxxxxx` format
- Provides user-friendly error messages in Vietnamese

### Input Sanitization
- All text inputs are trimmed of whitespace
- Special characters are handled safely
- Prevents basic injection attacks

## Integration

The endpoints integrate with:
- **SessionManager**: Session lifecycle management
- **ConversationFlow**: State machine and validation
- **GeminiChatService**: AI-powered responses
- **MongoDB**: Data persistence

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern=chat-routes.test.js
```

## Example Usage

```javascript
// Create a new session
const sessionResponse = await fetch('/api/chat/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName: 'Minh' })
});

const { sessionId } = sessionResponse.data;

// Send a message
const messageResponse = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    sessionId, 
    message: 'Có, mình quan tâm' 
  })
});
```