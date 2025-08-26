# Database Implementation

This document describes the database models and services implemented for the HSU Chatbot system.

## Overview

The database layer consists of:
- **MongoDB** as the primary database
- **Mongoose** for object modeling and schema validation
- **Session Model** for storing conversation data
- **Lead Model** for storing completed conversations as leads
- **Service Classes** for database operations

## Database Connection

### Configuration
The database connection is managed by `src/config/database.js`:

```javascript
const DatabaseConnection = require('./src/config/database');

// Connect to database
await DatabaseConnection.connect();

// Check connection status
const status = DatabaseConnection.getConnectionStatus();

// Disconnect
await DatabaseConnection.disconnect();
```

### Environment Variables
Set the MongoDB connection string in your `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/hsu-chatbot
```

## Models

### Session Model (`src/models/Session.js`)

Stores conversation sessions with user data and chat history.

**Schema:**
- `sessionId`: Unique session identifier
- `userId`: User identifier
- `firstName`: User's first name
- `currentState`: Current conversation state
- `userData`: Object containing collected user information
- `conversationHistory`: Array of messages
- `isCompleted`: Boolean indicating if session is complete
- `createdAt`, `updatedAt`: Timestamps

**States:**
- `welcome`: Initial greeting
- `major`: Collecting major interest
- `major_other`: Custom major input
- `phone`: Phone number collection
- `channel`: Communication channel preference
- `timeslot`: Preferred contact time
- `custom_time`: Custom time input
- `complete`: Session completed
- `nudge`: Re-engagement message

### Lead Model (`src/models/Lead.js`)

Stores completed conversations as leads for follow-up.

**Schema:**
- `leadId`: Unique lead identifier
- `sessionId`: Reference to original session
- `firstName`: User's first name
- `major`: Selected major
- `phone`: Raw phone number
- `phoneStandardized`: Standardized phone format
- `channel`: Preferred communication channel
- `timeslot`: Preferred contact time
- `status`: Lead status (`new`, `contacted`, `converted`)
- `createdAt`: Creation timestamp

## Services

### SessionService (`src/services/SessionService.js`)

Handles all session-related database operations.

**Methods:**
- `createSession(userId, firstName)`: Create new session
- `getSession(sessionId)`: Retrieve session by ID
- `updateSession(sessionId, updates)`: Update session data
- `addMessage(sessionId, role, content, quickReplies)`: Add message to conversation
- `updateUserData(sessionId, userData)`: Update user data
- `completeSession(sessionId)`: Mark session as completed
- `cleanupOldSessions(hoursOld)`: Remove old inactive sessions
- `getSessionsByUser(userId)`: Get all sessions for a user

**Example Usage:**
```javascript
const SessionService = require('./src/services/SessionService');
const sessionService = new SessionService();

// Create session
const session = await sessionService.createSession('user123', 'John');

// Add message
await sessionService.addMessage(
  session.sessionId,
  'user',
  'I want to know about CNTT program'
);

// Update user data
await sessionService.updateUserData(session.sessionId, {
  major: 'CNTT',
  phone: '0901234567'
});
```

### LeadService (`src/services/LeadService.js`)

Handles lead management and analytics.

**Methods:**
- `createLead(sessionData)`: Create lead from session
- `getLead(leadId)`: Retrieve lead by ID
- `getLeads(filters, options)`: Get leads with filtering/pagination
- `updateLeadStatus(leadId, status)`: Update lead status
- `getLeadStats()`: Get lead statistics
- `deleteLead(leadId)`: Delete lead
- `getLeadBySession(sessionId)`: Get lead by session ID

**Example Usage:**
```javascript
const LeadService = require('./src/services/LeadService');
const leadService = new LeadService();

// Create lead from completed session
const lead = await leadService.createLead(completedSession);

// Update status
await leadService.updateLeadStatus(lead.leadId, 'contacted');

// Get statistics
const stats = await leadService.getLeadStats();
```

## Database Indexes

For optimal performance, the following indexes are created:

**Session Collection:**
- `sessionId`: Unique index for fast lookups
- `userId`: Index for user-based queries
- `createdAt`: Index for time-based queries
- `isCompleted`: Index for filtering completed sessions

**Lead Collection:**
- `leadId`: Unique index for fast lookups
- `sessionId`: Index for session-based queries
- `status`: Index for status filtering
- `createdAt`: Index for time-based queries
- `phone`: Index for phone-based searches

## Error Handling

All service methods include comprehensive error handling:

```javascript
try {
  const session = await sessionService.createSession('user123', 'John');
} catch (error) {
  console.error('Failed to create session:', error.message);
  // Handle error appropriately
}
```

## Testing

Run the database tests:
```bash
npm test -- --testPathPattern=database.test.js
```

The tests verify:
- Model schema structure
- Service class instantiation
- Data validation rules
- Enum value validation

## Demo Script

Run the database demonstration:
```bash
node src/examples/database-demo.js
```

This script demonstrates:
1. Database connection
2. Session creation and management
3. Message handling
4. User data updates
5. Lead creation and management
6. Statistics retrieval

## Requirements Satisfied

This implementation satisfies the following requirements:

**Requirement 5.1**: Lead information is automatically captured and stored in MongoDB with proper schema validation.

**Requirement 5.2**: Lead data includes all collected information (name, major, phone, contact method, timing) with unique lead IDs and timestamps.

## Next Steps

The database layer is now ready for integration with:
1. Conversation flow state machine (Task 3)
2. Google Gemini AI service (Task 4)
3. Chat API endpoints (Task 6)
4. Lead management system (Task 7)