/**
 * Phone Validation Demo
 * Demonstrates the phone validation functionality
 */

const PhoneValidator = require('../utils/phoneValidation');

function runPhoneValidationDemo() {
  console.log('=== Phone Validation Demo ===\n');
  
  const validator = new PhoneValidator();
  
  // Test cases
  const testCases = [
    // Valid cases
    { phone: '0901234567', description: 'Standard Mobifone number' },
    { phone: '+84901234567', description: 'International format Mobifone' },
    { phone: '090 123 4567', description: 'Formatted Mobifone number' },
    { phone: '0351234567', description: 'Viettel number' },
    { phone: '0811234567', description: 'Vinaphone number' },
    { phone: '0521234567', description: 'Vietnamobile number' },
    { phone: '0591234567', description: 'Gmobile number' },
    
    // Invalid cases
    { phone: '0121234567', description: 'Invalid prefix (012)' },
    { phone: '090123456', description: 'Too short' },
    { phone: '09012345678', description: 'Too long' },
    { phone: '+8490123456', description: 'Too short +84 format' },
    { phone: 'abc123456789', description: 'Contains letters' },
    { phone: '', description: 'Empty string' }
  ];
  
  console.log('1. Basic Validation Tests:');
  console.log('=' .repeat(50));
  
  testCases.forEach(({ phone, description }) => {
    const result = validator.validate(phone);
    console.log(`\nPhone: "${phone}" (${description})`);
    console.log(`Valid: ${result.isValid}`);
    
    if (result.isValid) {
      console.log(`Network: ${result.network}`);
      console.log(`Standardized: ${result.standardizedPhone}`);
      console.log(`Display format: ${validator.formatPhone(phone, 'display')}`);
      console.log(`International: ${validator.formatPhone(phone, 'international')}`);
    } else {
      console.log(`Error: ${result.error}`);
      console.log(`Error Code: ${result.errorCode}`);
    }
  });
  
  console.log('\n\n2. Real-time Validation Demo:');
  console.log('=' .repeat(50));
  
  const realtimeTests = [
    '0',
    '09',
    '090',
    '0901',
    '09012',
    '090123',
    '0901234',
    '09012345',
    '090123456',
    '0901234567',
    '09012345678'
  ];
  
  realtimeTests.forEach(input => {
    const result = validator.validateRealTime(input);
    console.log(`\nInput: "${input}"`);
    console.log(`Status: ${result.isValid === null ? 'Neutral' : result.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`Message: ${result.message}`);
    if (result.showError && result.suggestions) {
      console.log(`Suggestions: ${result.suggestions.join(', ')}`);
    }
  });
  
  console.log('\n\n3. Network Provider Detection:');
  console.log('=' .repeat(50));
  
  const networkTests = [
    '0321234567', // Viettel
    '0811234567', // Vinaphone  
    '0901234567', // Mobifone
    '0521234567', // Vietnamobile
    '0591234567'  // Gmobile
  ];
  
  networkTests.forEach(phone => {
    const result = validator.validate(phone);
    if (result.isValid) {
      console.log(`${phone} -> ${result.network.charAt(0).toUpperCase() + result.network.slice(1)}`);
    }
  });
  
  console.log('\n\n4. Error Handling Demo:');
  console.log('=' .repeat(50));
  
  const errorTests = [
    { phone: '', expectedError: 'EMPTY_PHONE' },
    { phone: 'abc123', expectedError: 'INVALID_CHARACTERS' },
    { phone: '090123456', expectedError: 'INVALID_LENGTH_ZERO' },
    { phone: '+8490123456', expectedError: 'INVALID_LENGTH_PLUS84' },
    { phone: '0121234567', expectedError: 'INVALID_NETWORK_PREFIX' }
  ];
  
  errorTests.forEach(({ phone, expectedError }) => {
    const result = validator.validate(phone);
    const errorDetails = validator.getValidationError(phone);
    
    console.log(`\nPhone: "${phone}"`);
    console.log(`Expected Error: ${expectedError}`);
    console.log(`Actual Error: ${result.errorCode}`);
    console.log(`Error Message: ${result.error}`);
    
    if (errorDetails && errorDetails.suggestions) {
      console.log(`Suggestions:`);
      errorDetails.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    }
  });
  
  console.log('\n\n5. Performance Test:');
  console.log('=' .repeat(50));
  
  const performanceTestPhones = [
    '0901234567', '0351234567', '0811234567', '0521234567', '0591234567'
  ];
  
  const iterations = 1000;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    performanceTestPhones.forEach(phone => {
      validator.validate(phone);
      validator.formatPhone(phone, 'display');
      validator.validateRealTime(phone);
    });
  }
  
  const endTime = Date.now();
  const totalValidations = iterations * performanceTestPhones.length * 3; // 3 operations per phone
  const avgTimePerValidation = (endTime - startTime) / totalValidations;
  
  console.log(`Total validations: ${totalValidations}`);
  console.log(`Total time: ${endTime - startTime}ms`);
  console.log(`Average time per validation: ${avgTimePerValidation.toFixed(3)}ms`);
  
  console.log('\n=== Demo Complete ===');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runPhoneValidationDemo();
}

module.exports = { runPhoneValidationDemo };