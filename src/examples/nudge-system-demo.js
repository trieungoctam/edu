/**
 * Nudge System Demo
 * Demonstrates the nudge functionality for inactive users
 */

const NudgeService = require('../services/NudgeService');
const SessionManager = require('../services/SessionManager');
const ConversationFlow = require('../services/ConversationFlow');

async function demonstrateNudgeSystem() {
  console.log('🔔 Nudge System Demo Starting...\n');

  try {
    // Initialize services
    const nudgeService = new NudgeService();
    const sessionManager = new SessionManager();
    const conversationFlow = new ConversationFlow();

    // Demo 1: Create a session and start nudge timer
    console.log('📝 Demo 1: Creating session and starting nudge timer');
    console.log('=' .repeat(50));

    const session = await sessionManager.createSession('demo-user-1', 'Minh');
    console.log(`✅ Created session: ${session.sessionId}`);

    // Start nudge timer
    await nudgeService.startNudgeTimer(session.sessionId);
    console.log('⏰ Nudge timer started (2 minutes)');

    // Simulate user activity - this should reset the timer
    console.log('\n🔄 Simulating user activity (resets timer)...');
    await nudgeService.onUserActivity(session.sessionId);
    console.log('✅ Timer reset due to user activity');

    // Demo 2: Simulate nudge trigger
    console.log('\n📝 Demo 2: Simulating nudge trigger');
    console.log('=' .repeat(50));

    // Update session to have some user data
    await sessionManager.updateUserData(session.sessionId, { major: 'CNTT' });
    await sessionManager.updateSessionState(session.sessionId, 'phone');

    // Manually trigger nudge (normally happens after timeout)
    const nudgeResult = await nudgeService.triggerNudge(session.sessionId);
    console.log('🔔 Nudge triggered:');
    console.log(`   Message: ${nudgeResult.message}`);
    console.log(`   Quick Replies: ${nudgeResult.quickReplies.join(', ')}`);
    console.log(`   State: ${nudgeResult.state}`);

    // Demo 3: Handle positive nudge response
    console.log('\n📝 Demo 3: Handling positive nudge response');
    console.log('=' .repeat(50));

    const positiveResponse = await nudgeService.handleNudgeResponse(
      session.sessionId, 
      'Có, giữ giúp mình'
    );
    console.log('✅ Positive response handled:');
    console.log(`   Continued: ${positiveResponse.continued}`);
    console.log(`   New State: ${positiveResponse.state}`);
    console.log(`   Message: ${positiveResponse.message}`);

    // Demo 4: Create another session for negative response
    console.log('\n📝 Demo 4: Handling negative nudge response');
    console.log('=' .repeat(50));

    const session2 = await sessionManager.createSession('demo-user-2', 'Lan');
    await sessionManager.updateUserData(session2.sessionId, { major: 'Thiết kế' });
    await sessionManager.updateSessionState(session2.sessionId, 'nudge');

    const negativeResponse = await nudgeService.handleNudgeResponse(
      session2.sessionId, 
      'Để sau'
    );
    console.log('✅ Negative response handled:');
    console.log(`   Continued: ${negativeResponse.continued}`);
    console.log(`   New State: ${negativeResponse.state}`);
    console.log(`   Message: ${negativeResponse.message}`);

    // Demo 5: Show nudge statistics
    console.log('\n📝 Demo 5: Nudge system statistics');
    console.log('=' .repeat(50));

    const stats = nudgeService.getNudgeStats();
    console.log('📊 Nudge Statistics:');
    console.log(`   Active Timers: ${stats.activeNudgeTimers}`);
    console.log(`   Timeout Duration: ${stats.nudgeTimeout} seconds`);

    // Demo 6: Test shouldHaveNudgeTimer logic
    console.log('\n📝 Demo 6: Testing nudge timer conditions');
    console.log('=' .repeat(50));

    const testSessions = [
      { name: 'Active session in major state', isCompleted: false, currentState: 'major' },
      { name: 'Completed session', isCompleted: true, currentState: 'complete' },
      { name: 'Session in nudge state', isCompleted: false, currentState: 'nudge' },
      { name: 'Session in complete state', isCompleted: false, currentState: 'complete' }
    ];

    testSessions.forEach(testSession => {
      const shouldHave = nudgeService.shouldHaveNudgeTimer(testSession);
      console.log(`   ${testSession.name}: ${shouldHave ? '✅ Should have timer' : '❌ Should not have timer'}`);
    });

    // Demo 7: Test message generation
    console.log('\n📝 Demo 7: Testing message generation');
    console.log('=' .repeat(50));

    const testSession = { 
      firstName: 'Minh', 
      currentState: 'phone', 
      userData: { major: 'CNTT' } 
    };

    const continuationMsg = nudgeService.generateContinuationMessage(testSession);
    const completionMsg = nudgeService.generateCompletionMessage(testSession);

    console.log('💬 Generated Messages:');
    console.log(`   Continuation: ${continuationMsg}`);
    console.log(`   Completion: ${completionMsg}`);

    // Cleanup
    console.log('\n🧹 Cleaning up demo sessions...');
    await sessionManager.deleteSession(session.sessionId);
    await sessionManager.deleteSession(session2.sessionId);
    console.log('✅ Demo sessions cleaned up');

    console.log('\n🎉 Nudge System Demo Completed Successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Demo scenarios for different nudge situations
async function demonstrateNudgeScenarios() {
  console.log('\n🎭 Nudge Scenarios Demo');
  console.log('=' .repeat(50));

  const nudgeService = new NudgeService();
  const sessionManager = new SessionManager();

  try {
    // Scenario 1: User in middle of conversation gets nudged
    console.log('\n📋 Scenario 1: User stops at phone collection');
    const session1 = await sessionManager.createSession('scenario-1', 'Hoa');
    await sessionManager.updateUserData(session1.sessionId, { major: 'Quản trị Kinh doanh' });
    await sessionManager.updateSessionState(session1.sessionId, 'phone');

    const nudge1 = await nudgeService.triggerNudge(session1.sessionId);
    console.log(`   Nudge: ${nudge1.message}`);

    const response1 = await nudgeService.handleNudgeResponse(session1.sessionId, 'Có, giữ giúp mình');
    console.log(`   Response: ${response1.message}`);
    console.log(`   Resumed at: ${response1.state}`);

    // Scenario 2: User at beginning gets nudged
    console.log('\n📋 Scenario 2: User stops at major selection');
    const session2 = await sessionManager.createSession('scenario-2', 'Nam');
    await sessionManager.updateSessionState(session2.sessionId, 'major');

    const nudge2 = await nudgeService.triggerNudge(session2.sessionId);
    console.log(`   Nudge: ${nudge2.message}`);

    const response2 = await nudgeService.handleNudgeResponse(session2.sessionId, 'Để sau');
    console.log(`   Response: ${response2.message}`);
    console.log(`   Conversation ended: ${!response2.continued}`);

    // Scenario 3: User near end gets nudged
    console.log('\n📋 Scenario 3: User stops at timeslot selection');
    const session3 = await sessionManager.createSession('scenario-3', 'Linh');
    await sessionManager.updateUserData(session3.sessionId, { 
      major: 'Thiết kế', 
      phone: '0901234567',
      channel: 'Zalo'
    });
    await sessionManager.updateSessionState(session3.sessionId, 'timeslot');

    const nudge3 = await nudgeService.triggerNudge(session3.sessionId);
    console.log(`   Nudge: ${nudge3.message}`);

    const response3 = await nudgeService.handleNudgeResponse(session3.sessionId, 'Có, giữ giúp mình');
    console.log(`   Response: ${response3.message}`);
    console.log(`   Resumed at: ${response3.state}`);

    // Cleanup scenarios
    await sessionManager.deleteSession(session1.sessionId);
    await sessionManager.deleteSession(session2.sessionId);
    await sessionManager.deleteSession(session3.sessionId);

    console.log('\n✅ All scenarios completed successfully!');

  } catch (error) {
    console.error('❌ Scenario demo failed:', error.message);
  }
}

// Run the demos
async function runAllDemos() {
  console.log('🚀 Starting Nudge System Demonstrations\n');
  
  await demonstrateNudgeSystem();
  await demonstrateNudgeScenarios();
  
  console.log('\n🏁 All demonstrations completed!');
  
  // Exit the process since we're not in a web server context
  process.exit(0);
}

// Only run if this file is executed directly
if (require.main === module) {
  runAllDemos().catch(error => {
    console.error('❌ Demo execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  demonstrateNudgeSystem,
  demonstrateNudgeScenarios
};