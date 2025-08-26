/**
 * Database Models and Services Demo
 * 
 * This script demonstrates how to use the database models and services.
 * Note: This requires a running MongoDB instance to work properly.
 */

const DatabaseConnection = require('../config/database');
const SessionService = require('../services/SessionService');
const LeadService = require('../services/LeadService');

async function demonstrateDatabase() {
  try {
    console.log('🚀 Starting database demonstration...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await DatabaseConnection.connect();
    console.log('✅ Connected successfully!\n');

    // Initialize services
    const sessionService = new SessionService();
    const leadService = new LeadService();

    // 1. Create a new session
    console.log('👤 Creating a new session...');
    const session = await sessionService.createSession('user123', 'Nguyen Van A');
    console.log(`✅ Session created: ${session.sessionId}`);
    console.log(`   User: ${session.firstName}`);
    console.log(`   State: ${session.currentState}\n`);

    // 2. Add messages to conversation
    console.log('💬 Adding messages to conversation...');
    await sessionService.addMessage(
      session.sessionId,
      'assistant',
      'Chào Nguyen Van A! Chào mừng bạn đến với Đại học Hoa Sen!',
      ['Có, mình quan tâm', 'Xem ngành đào tạo']
    );

    await sessionService.addMessage(
      session.sessionId,
      'user',
      'Có, mình quan tâm'
    );

    console.log('✅ Messages added to conversation\n');

    // 3. Update user data
    console.log('📝 Updating user data...');
    const updatedSession = await sessionService.updateUserData(session.sessionId, {
      major: 'CNTT',
      phone: '0901234567',
      phoneStandardized: '0901234567',
      channel: 'Zalo',
      timeslot: 'Tối (19–21h)'
    });

    console.log('✅ User data updated:');
    console.log(`   Major: ${updatedSession.userData.major}`);
    console.log(`   Phone: ${updatedSession.userData.phone}`);
    console.log(`   Channel: ${updatedSession.userData.channel}\n`);

    // 4. Complete the session
    console.log('✅ Completing session...');
    const completedSession = await sessionService.completeSession(session.sessionId);
    console.log(`✅ Session completed: ${completedSession.isCompleted}\n`);

    // 5. Create a lead from the completed session
    console.log('🎯 Creating lead from session...');
    const lead = await leadService.createLead(completedSession);
    console.log(`✅ Lead created: ${lead.leadId}`);
    console.log(`   Name: ${lead.firstName}`);
    console.log(`   Major: ${lead.major}`);
    console.log(`   Status: ${lead.status}\n`);

    // 6. Update lead status
    console.log('📞 Updating lead status...');
    await leadService.updateLeadStatus(lead.leadId, 'contacted');
    console.log('✅ Lead status updated to "contacted"\n');

    // 7. Get lead statistics
    console.log('📊 Getting lead statistics...');
    const stats = await leadService.getLeadStats();
    console.log('✅ Lead Statistics:');
    console.log(`   Total leads: ${stats.totalLeads}`);
    console.log(`   Leads today: ${stats.leadsToday}`);
    console.log(`   Status breakdown:`, stats.statusBreakdown);
    console.log(`   Popular majors:`, stats.popularMajors);
    console.log(`   Channel preferences:`, stats.channelPreferences);

    console.log('\n🎉 Database demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error.message);
  } finally {
    // Disconnect from database
    console.log('\n📡 Disconnecting from MongoDB...');
    await DatabaseConnection.disconnect();
    console.log('✅ Disconnected successfully!');
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateDatabase().catch(console.error);
}

module.exports = { demonstrateDatabase };