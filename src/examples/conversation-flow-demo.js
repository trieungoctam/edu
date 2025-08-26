/**
 * Demonstration of ConversationFlow functionality
 * Shows how to use the conversation state machine
 */

const ConversationFlow = require('../services/ConversationFlow');

function demonstrateConversationFlow() {
  console.log('=== HSU Chatbot Conversation Flow Demo ===\n');
  
  const flow = new ConversationFlow();
  let currentState = 'welcome';
  let userData = { first_name: 'Minh' };
  
  console.log('Starting conversation...\n');
  
  // Simulate a complete conversation flow
  const conversationSteps = [
    { input: 'Có, mình quan tâm', description: 'User shows interest' },
    { input: 'CNTT', description: 'User selects IT major' },
    { input: '0901234567', description: 'User provides phone number' },
    { input: 'Zalo', description: 'User selects Zalo as contact method' },
    { input: 'Tối (19–21h)', description: 'User selects evening time slot' }
  ];
  
  conversationSteps.forEach((step, index) => {
    console.log(`--- Step ${index + 1}: ${step.description} ---`);
    console.log(`Current State: ${currentState}`);
    console.log(`Bot Message: ${flow.generateMessage(currentState, userData)}`);
    
    const quickReplies = flow.getQuickReplies(currentState);
    if (quickReplies.length > 0) {
      console.log(`Quick Replies: [${quickReplies.join(', ')}]`);
    }
    
    console.log(`User Input: "${step.input}"`);
    
    const result = flow.processInput(currentState, step.input, userData);
    
    if (result.success) {
      currentState = result.nextState;
      userData = { ...userData, ...result.userData };
      console.log(`✓ Success! Next State: ${currentState}`);
    } else {
      console.log(`✗ Error: ${result.error}`);
    }
    
    console.log(`Updated User Data:`, userData);
    console.log('');
  });
  
  // Show final completion message
  if (flow.isConversationComplete(currentState)) {
    console.log('--- Conversation Complete ---');
    console.log(`Final Message: ${flow.generateMessage(currentState, userData)}`);
    console.log('✓ Lead successfully collected!');
  }
}

function demonstratePhoneValidation() {
  console.log('\n=== Phone Number Validation Demo ===\n');
  
  const flow = new ConversationFlow();
  const testPhones = [
    '0901234567',      // Valid
    '+84901234567',    // Valid with +84
    '0 90 123 4567',   // Valid with spaces
    '123456789',       // Invalid - wrong format
    '0123456789',      // Invalid - wrong prefix
    '+841234567890'    // Invalid - wrong +84 format
  ];
  
  testPhones.forEach(phone => {
    const result = flow.validatePhone(phone, {});
    console.log(`Phone: "${phone}"`);
    console.log(`Valid: ${result.isValid}`);
    
    if (result.isValid) {
      console.log(`Standardized: ${result.processedData.phone_standardized}`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    console.log('');
  });
}

function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Demo ===\n');
  
  const flow = new ConversationFlow();
  
  // Test invalid phone number with retry logic
  console.log('Testing invalid phone number with retries:');
  let userData = { retryCount: 0 };
  
  for (let i = 0; i < 4; i++) {
    const result = flow.processInput('phone', 'invalid_phone', userData);
    console.log(`Attempt ${i + 1}:`);
    console.log(`Success: ${result.success}`);
    console.log(`Retry Count: ${result.retryCount || 0}`);
    
    if (!result.success) {
      console.log(`Error: ${result.error}`);
      userData.retryCount = result.retryCount;
    }
    
    // Test error handling after max retries
    if (result.retryCount >= 3) {
      const errorResult = flow.handleError('phone', result.error, result.retryCount);
      console.log(`Max retries reached. Fallback: ${errorResult.shouldRestart}`);
      console.log(`Fallback message: ${errorResult.message}`);
    }
    console.log('');
  }
}

// Run demonstrations
if (require.main === module) {
  demonstrateConversationFlow();
  demonstratePhoneValidation();
  demonstrateErrorHandling();
}

module.exports = {
  demonstrateConversationFlow,
  demonstratePhoneValidation,
  demonstrateErrorHandling
};