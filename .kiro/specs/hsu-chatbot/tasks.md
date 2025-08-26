# Implementation Plan

- [x] 1. Set up project structure and core dependencies
  - Create Node.js project with Express.js framework
  - Install required dependencies: express, mongoose, @google/genai, cors, dotenv, express-rate-limit
  - Set up basic folder structure: /src, /public, /routes, /models, /services, /middleware
  - Configure environment variables and basic Express server
  - _Requirements: 7.3, 10.3_

- [x] 2. Implement database models and connection
  - Set up MongoDB connection with Mongoose
  - Create Session schema with conversation history and user data fields
  - Create Lead schema for storing completed conversations
  - Implement database connection utilities with error handling
  - Write basic CRUD operations for sessions and leads
  - _Requirements: 5.1, 5.2_

- [x] 3. Create conversation flow state machine
  - Implement ConversationFlow class with predefined states and messages
  - Define state transitions based on user input and validation rules
  - Create message templating system for dynamic content ({{first_name}}, {{major}}, etc.)
  - Implement phone number validation function for Vietnamese formats
  - Add state progression logic and error handling
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2_

- [x] 4. Integrate Google Gemini AI service
  - Set up Google Gemini AI client with API key configuration
  - Create GeminiChatService class for processing user messages
  - Implement contextual prompt building based on conversation state
  - Add fallback responses for AI service failures
  - Configure AI parameters (temperature: 0.3, maxOutputTokens: 1024)
  - _Requirements: 1.2, 1.3_

- [x] 5. Build session management system
  - Create SessionManager class for handling user sessions
  - Implement session creation, retrieval, and update operations
  - Add session cleanup for inactive sessions (24-hour expiry)
  - Create unique session ID generation
  - Store conversation history with timestamps and roles
  - _Requirements: 1.1, 5.1, 10.4_

- [ ] 6. Implement chat API endpoints
  - Create POST /api/chat/message endpoint for processing user messages
  - Create POST /api/chat/session endpoint for starting new conversations
  - Create GET /api/chat/session/:id endpoint for retrieving session data
  - Add request validation and error handling middleware
  - Implement rate limiting (60 requests per minute per IP)
  - _Requirements: 1.2, 7.4, 10.2_

- [x] 7. Build lead management system
  - Create POST /api/leads endpoint for storing completed conversations
  - Implement lead data extraction from completed sessions
  - Add lead status tracking (new, contacted, converted)
  - Create unique lead ID generation with timestamp
  - Store standardized phone numbers and contact preferences
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 8. Create nudge system for inactive users
  - Implement timer-based nudge functionality (2-minute inactivity)
  - Add nudge message handling in conversation flow
  - Create nudge state with appropriate quick replies
  - Handle nudge responses and conversation resumption
  - Clear nudge timers on user activity
  - _Requirements: 1.4_

- [x] 9. Build frontend chat interface
  - Create React components: ChatContainer, MessageBubble, QuickReplyButtons, InputArea
  - Implement responsive design with mobile-first approach (breakpoints: 480px, 768px, 1024px)
  - Add typing indicator and smooth scrolling animations
  - Create state management for chat session and messages
  - Implement touch-friendly buttons (minimum 44px) for mobile devices
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 10. Implement phone number validation and standardization
  - Create client-side phone validation with real-time feedback
  - Implement server-side validation for Vietnamese phone formats (0xxxxxxxxx, +84xxxxxxxxx)
  - Add phone number standardization (convert +84 to 0 format)
  - Display appropriate error messages for invalid formats
  - Store both raw and standardized phone numbers
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 11. Add basic admin interface for lead viewing
  - Create GET /api/admin/stats endpoint for basic metrics (total conversations, leads)
  - Create GET /api/admin/leads endpoint with date filtering
  - Build simple admin dashboard showing lead list with timestamps
  - Add lead export functionality (JSON format)
  - Display conversation completion rates and popular majors
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12. Implement error handling and validation
  - Add comprehensive error handling for all API endpoints
  - Create standardized error response format
  - Implement input sanitization to prevent basic security issues
  - Add validation for all user inputs (major selection, phone, timing)
  - Handle Gemini AI service errors with fallback messages
  - _Requirements: 10.1, 10.2_

- [x] 13. Add accessibility features
  - Implement ARIA labels for all interactive elements
  - Add keyboard navigation support for chat interface
  - Ensure high contrast mode compatibility
  - Make interface scalable for different font sizes
  - Test with screen reader compatibility
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14. Create comprehensive test suite
  - Write unit tests for phone validation functions
  - Test conversation flow state transitions
  - Create integration tests for API endpoints
  - Test database operations and session management
  - Add tests for Gemini AI integration with mocked responses
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 15. Implement security measures and deployment preparation
  - Add input sanitization middleware for all endpoints
  - Implement basic data protection for stored phone numbers
  - Set up environment variable validation on startup
  - Add request logging and basic monitoring
  - Create production-ready configuration with PM2 process management
  - _Requirements: 10.1, 10.2, 10.3, 10.4_