/**
 * Demo script for GeminiChatService
 * Shows how to integrate and use the Gemini AI service for chatbot conversations
 */

require('dotenv').config();
const GeminiChatService = require('../services/GeminiChatService');

async function runGeminiDemo() {
  console.log('🤖 HSU Chatbot - Gemini AI Integration Demo\n');

  try {
    // Initialize the service
    const geminiService = new GeminiChatService();
    
    // Check service health
    const health = geminiService.getHealthStatus();
    console.log('📊 Service Health:', health);
    
    // Test connection (only if API key is available)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      console.log('\n🔗 Testing connection...');
      const connectionTest = await geminiService.testConnection();
      console.log('Connection test result:', connectionTest ? '✅ Success' : '❌ Failed');
    } else {
      console.log('\n⚠️  No valid API key found. Skipping connection test.');
    }

    // Demo conversation contexts
    const demoContexts = [
      {
        name: 'Welcome State',
        context: {
          sessionId: 'demo-session-1',
          currentState: 'welcome',
          userData: { firstName: 'Nam' },
          conversationHistory: []
        },
        userMessage: 'Chào bạn!'
      },
      {
        name: 'Major Selection State',
        context: {
          sessionId: 'demo-session-2',
          currentState: 'major',
          userData: { firstName: 'Linh' },
          conversationHistory: [
            { role: 'assistant', content: 'Chào Linh! Bạn quan tâm ngành nào?' },
            { role: 'user', content: 'Mình muốn tìm hiểu về các ngành' }
          ]
        },
        userMessage: 'Tôi quan tâm về CNTT'
      },
      {
        name: 'Phone Collection State',
        context: {
          sessionId: 'demo-session-3',
          currentState: 'phone',
          userData: { 
            firstName: 'Minh',
            major: 'CNTT'
          },
          conversationHistory: [
            { role: 'assistant', content: 'Tuyệt! CNTT là ngành rất hot hiện nay.' },
            { role: 'user', content: 'Vậy học phí như thế nào?' }
          ]
        },
        userMessage: 'Số điện thoại của mình là 0901234567'
      }
    ];

    // Process demo conversations
    for (const demo of demoContexts) {
      console.log(`\n📱 Demo: ${demo.name}`);
      console.log('─'.repeat(50));
      
      try {
        // Build and show the contextual prompt (for educational purposes)
        const prompt = geminiService.buildContextualPrompt(demo.userMessage, demo.context);
        console.log('🎯 Contextual Prompt Preview:');
        console.log(prompt.substring(0, 200) + '...\n');
        
        // Process the message
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
          console.log('💬 Processing with Gemini AI...');
          const result = await geminiService.processMessage(
            demo.context.sessionId,
            demo.userMessage,
            demo.context
          );
          
          console.log('📤 User:', demo.userMessage);
          console.log('📥 Bot:', result.reply);
          console.log('🔄 Next State:', result.nextState);
          console.log('⚡ Quick Replies:', result.quickReplies);
          console.log('✅ Success:', result.success);
          
          if (result.fallback) {
            console.log('🔄 Fallback Response Used');
          }
        } else {
          // Simulate response without API call
          console.log('📤 User:', demo.userMessage);
          console.log('📥 Bot: [Simulated] Cảm ơn bạn! Mình sẽ xử lý thông tin này.');
          console.log('🔄 Next State:', geminiService.determineNextStateFromAI(
            demo.context.currentState, 
            demo.userMessage, 
            demo.context.userData
          ));
          console.log('⚡ Quick Replies:', geminiService.getQuickRepliesForState(
            geminiService.determineNextStateFromAI(
              demo.context.currentState, 
              demo.userMessage, 
              demo.context.userData
            )
          ));
        }
        
      } catch (error) {
        console.log('❌ Error:', error.message);
        
        // Show error handling
        const errorResponse = geminiService.handleServiceError(error, demo.context);
        console.log('🔄 Fallback Response:', errorResponse.reply);
      }
    }

    // Demo error handling scenarios
    console.log('\n🚨 Error Handling Demo');
    console.log('─'.repeat(50));
    
    const errorScenarios = [
      { error: new Error('Request timeout'), type: 'Timeout' },
      { error: new Error('429 rate limit exceeded'), type: 'Rate Limit' },
      { error: new Error('API connection failed'), type: 'API Error' },
      { error: new Error('Unknown error'), type: 'General Error' }
    ];
    
    const errorContext = { currentState: 'welcome', sessionId: 'error-demo' };
    
    for (const scenario of errorScenarios) {
      const response = geminiService.handleServiceError(scenario.error, errorContext);
      console.log(`${scenario.type}: ${response.reply.substring(0, 50)}...`);
    }

    // Show state guidance examples
    console.log('\n📋 State Guidance Examples');
    console.log('─'.repeat(50));
    
    const states = ['welcome', 'major', 'phone', 'channel', 'complete'];
    for (const state of states) {
      const guidance = geminiService.getStateGuidance(state);
      console.log(`${state}: ${guidance.substring(0, 60)}...`);
    }

    console.log('\n✅ Demo completed successfully!');
    console.log('\n💡 Tips for integration:');
    console.log('- Always handle errors gracefully with fallback responses');
    console.log('- Use contextual prompts to maintain conversation flow');
    console.log('- Monitor API usage and implement rate limiting');
    console.log('- Test thoroughly with various conversation scenarios');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    
    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('\n💡 To run with actual AI responses:');
      console.log('1. Get a Gemini API key from Google AI Studio');
      console.log('2. Add it to your .env file: GEMINI_API_KEY=your_key_here');
      console.log('3. Run the demo again');
    }
  }
}

// Run the demo
if (require.main === module) {
  runGeminiDemo().catch(console.error);
}

module.exports = { runGeminiDemo };