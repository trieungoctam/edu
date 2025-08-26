/**
 * SessionManager Demo
 * Demonstrates the functionality of the SessionManager class
 */

const SessionManager = require('../services/SessionManager');
const mongoose = require('mongoose');
require('dotenv').config();

async function runSessionManagerDemo() {
  try {
    console.log('🚀 Starting SessionManager Demo...\n');

    // Connect to database
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create SessionManager instance
    const sessionManager = new SessionManager();
    console.log('✅ SessionManager created\n');

    // Demo 1: Create a new session
    console.log('📝 Demo 1: Creating a new session...');
    const session = await sessionManager.createSession('demo-user-123', 'Alice');
    console.log('✅ Session created:', {
      sessionId: session.sessionId,
      userId: session.userId,
      firstName: session.firstName,
      currentState: session.currentState
    });
    console.log();

    // Demo 2: Add messages to conversation history
    console.log('💬 Demo 2: Adding messages to conversation...');
    
    await sessionManager.addMessage(
      session.sessionId, 
      'assistant', 
      'Chào Alice! Chào mừng bạn đến với Đại học Hoa Sen!',
      ['Có, mình quan tâm', 'Xem ngành đào tạo']
    );
    console.log('✅ Added assistant message with quick replies');

    await sessionManager.addMessage(
      session.sessionId,
      'user',
      'Có, mình quan tâm'
    );
    console.log('✅ Added user message');
    console.log();

    // Demo 3: Update session state and user data
    console.log('🔄 Demo 3: Updating session state and user data...');
    
    await sessionManager.updateSessionState(session.sessionId, 'major');
    console.log('✅ Updated session state to "major"');

    await sessionManager.updateUserData(session.sessionId, {
      major: 'CNTT',
      phone: '0901234567',
      phoneStandardized: '0901234567'
    });
    console.log('✅ Updated user data with major and phone');
    console.log();

    // Demo 4: Retrieve updated session
    console.log('📖 Demo 4: Retrieving updated session...');
    const updatedSession = await sessionManager.getSession(session.sessionId);
    console.log('✅ Retrieved session:', {
      sessionId: updatedSession.sessionId,
      currentState: updatedSession.currentState,
      userData: updatedSession.userData,
      messageCount: updatedSession.conversationHistory.length
    });
    console.log();

    // Demo 5: Session statistics
    console.log('📊 Demo 5: Getting session statistics...');
    const stats = await sessionManager.getSessionStats();
    console.log('✅ Session statistics:', stats);
    console.log();

    // Demo 6: Complete session
    console.log('✅ Demo 6: Completing session...');
    await sessionManager.completeSession(session.sessionId);
    console.log('✅ Session marked as completed');
    console.log();

    // Demo 7: Generate unique session IDs
    console.log('🆔 Demo 7: Generating unique session IDs...');
    const id1 = sessionManager.generateUniqueSessionId();
    const id2 = sessionManager.generateUniqueSessionId();
    const id3 = sessionManager.generateUniqueSessionId();
    console.log('✅ Generated unique IDs:');
    console.log('  ID 1:', id1);
    console.log('  ID 2:', id2);
    console.log('  ID 3:', id3);
    console.log('  All different:', id1 !== id2 && id2 !== id3 && id1 !== id3);
    console.log();

    // Demo 8: Session expiry check
    console.log('⏰ Demo 8: Testing session expiry...');
    const currentSession = { updatedAt: new Date() };
    const oldSession = { updatedAt: new Date(Date.now() - (25 * 60 * 60 * 1000)) }; // 25 hours ago
    
    console.log('✅ Current session expired:', sessionManager.isSessionExpired(currentSession));
    console.log('✅ Old session expired:', sessionManager.isSessionExpired(oldSession));
    console.log();

    // Demo 9: Cleanup test (create old session and clean it up)
    console.log('🧹 Demo 9: Testing session cleanup...');
    
    // Create a session and manually set it as old
    const oldSessionForCleanup = await sessionManager.createSession('old-user', 'Bob');
    
    // Manually update the session to be old (simulate old session)
    await sessionManager.updateSession(oldSessionForCleanup.sessionId, {
      updatedAt: new Date(Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
    });
    
    const cleanedCount = await sessionManager.cleanupInactiveSessions(24);
    console.log('✅ Cleaned up sessions:', cleanedCount);
    console.log();

    // Demo 10: Final statistics
    console.log('📊 Demo 10: Final session statistics...');
    const finalStats = await sessionManager.getSessionStats();
    console.log('✅ Final statistics:', finalStats);
    console.log();

    // Stop cleanup interval
    sessionManager.stopCleanupInterval();
    console.log('🛑 Stopped automatic cleanup interval');

    console.log('🎉 SessionManager demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runSessionManagerDemo();
}

module.exports = runSessionManagerDemo;