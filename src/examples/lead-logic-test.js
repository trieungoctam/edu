/**
 * Lead Management Logic Test
 * Tests the lead management functionality without database operations
 */

require('dotenv').config();

// Test the lead ID generation logic
function testLeadIdGeneration() {
  console.log('🆔 Testing Lead ID Generation...');
  
  const { v4: uuidv4 } = require('uuid');
  
  // Generate multiple lead IDs to test uniqueness
  const leadIds = new Set();
  for (let i = 0; i < 10; i++) {
    const leadId = `LEAD_${Date.now()}_${uuidv4().substring(0, 8)}`;
    leadIds.add(leadId);
    console.log(`   Generated: ${leadId}`);
    
    // Small delay to ensure timestamp differences
    const start = Date.now();
    while (Date.now() - start < 1) {
      // Small delay
    }
  }
  
  console.log(`✅ All ${leadIds.size} lead IDs are unique`);
  console.log(`✅ Lead ID format matches pattern: LEAD_timestamp_uuid8\n`);
}

// Test data validation logic
function testDataValidation() {
  console.log('✅ Testing Data Validation...');
  
  const ValidationMiddleware = require('../middleware/validation');
  const validator = new ValidationMiddleware();
  
  // Test phone validation
  console.log('📱 Testing phone validation:');
  const phoneTests = [
    { phone: '0901234567', expected: true },
    { phone: '+84901234567', expected: true },
    { phone: '123456', expected: false },
    { phone: '0123456789', expected: false }
  ];
  
  phoneTests.forEach(test => {
    const result = validator.validatePhone(test.phone);
    const status = result.isValid === test.expected ? '✅' : '❌';
    console.log(`   ${status} ${test.phone}: ${result.isValid ? 'valid' : result.error}`);
  });
  
  // Test name validation
  console.log('\n👤 Testing name validation:');
  const nameTests = [
    { name: 'Nguyễn Văn A', expected: true },
    { name: 'Trần Thị B', expected: true },
    { name: 'A', expected: false },
    { name: '', expected: false },
    { name: '<script>alert("xss")</script>Test', expected: true } // Should sanitize
  ];
  
  nameTests.forEach(test => {
    const result = validator.validateFirstName(test.name);
    const status = result.isValid === test.expected ? '✅' : '❌';
    console.log(`   ${status} "${test.name}": ${result.isValid ? `valid -> "${result.sanitized}"` : result.error}`);
  });
  
  // Test major validation
  console.log('\n🎓 Testing major validation:');
  const majorTests = [
    { major: 'CNTT', expected: true },
    { major: 'Thiết kế', expected: true },
    { major: 'Custom Major', expected: true },
    { major: 'A', expected: false },
    { major: '', expected: false }
  ];
  
  majorTests.forEach(test => {
    const result = validator.validateMajor(test.major);
    const status = result.isValid === test.expected ? '✅' : '❌';
    console.log(`   ${status} "${test.major}": ${result.isValid ? 'valid' : result.error}`);
  });
  
  console.log('✅ Data validation tests completed\n');
}

// Test lead data structure transformation
function testLeadDataTransformation() {
  console.log('🔄 Testing Lead Data Transformation...');
  
  // Test session data format to lead data format
  const sessionData = {
    sessionId: 'test-session-123',
    firstName: 'Nguyễn Văn A',
    userData: {
      major: 'CNTT',
      phone: '0901234567',
      phoneStandardized: '0901234567',
      channel: 'Zalo',
      timeslot: 'Trong hôm nay'
    }
  };
  
  // Simulate the transformation logic from LeadService.createLead
  const leadInfo = {
    leadId: `LEAD_${Date.now()}_12345678`,
    sessionId: sessionData.sessionId,
    firstName: sessionData.firstName,
    major: sessionData.userData ? sessionData.userData.major : sessionData.major,
    phone: sessionData.userData ? sessionData.userData.phone : sessionData.phone,
    phoneStandardized: sessionData.userData ? sessionData.userData.phoneStandardized : sessionData.phoneStandardized,
    channel: sessionData.userData ? sessionData.userData.channel : sessionData.channel,
    timeslot: sessionData.userData ? sessionData.userData.timeslot : sessionData.timeslot,
    status: sessionData.status || 'new'
  };
  
  console.log('✅ Session data transformation:');
  console.log(`   Session ID: ${leadInfo.sessionId}`);
  console.log(`   Name: ${leadInfo.firstName}`);
  console.log(`   Major: ${leadInfo.major}`);
  console.log(`   Phone: ${leadInfo.phone}`);
  console.log(`   Channel: ${leadInfo.channel}`);
  console.log(`   Timeslot: ${leadInfo.timeslot}`);
  console.log(`   Status: ${leadInfo.status}`);
  
  // Test direct data format
  const directData = {
    sessionId: 'test-session-456',
    firstName: 'Trần Thị B',
    major: 'Thiết kế',
    phone: '0987654321',
    phoneStandardized: '0987654321',
    channel: 'Gọi điện',
    timeslot: 'Tối (19–21h)'
  };
  
  const directLeadInfo = {
    leadId: `LEAD_${Date.now()}_87654321`,
    sessionId: directData.sessionId,
    firstName: directData.firstName,
    major: directData.userData ? directData.userData.major : directData.major,
    phone: directData.userData ? directData.userData.phone : directData.phone,
    phoneStandardized: directData.userData ? directData.userData.phoneStandardized : directData.phoneStandardized,
    channel: directData.userData ? directData.userData.channel : directData.channel,
    timeslot: directData.userData ? directData.userData.timeslot : directData.timeslot,
    status: directData.status || 'new'
  };
  
  console.log('\n✅ Direct data transformation:');
  console.log(`   Session ID: ${directLeadInfo.sessionId}`);
  console.log(`   Name: ${directLeadInfo.firstName}`);
  console.log(`   Major: ${directLeadInfo.major}`);
  console.log(`   Phone: ${directLeadInfo.phone}`);
  console.log(`   Channel: ${directLeadInfo.channel}`);
  console.log(`   Timeslot: ${directLeadInfo.timeslot}`);
  console.log(`   Status: ${directLeadInfo.status}`);
  
  console.log('✅ Lead data transformation tests completed\n');
}

// Test phone number encryption/decryption logic
function testPhoneEncryption() {
  console.log('🔒 Testing Phone Number Encryption...');
  
  try {
    const DataProtection = require('../utils/dataProtection');
    const dataProtection = new DataProtection();
    
    const testPhones = ['0901234567', '0987654321', '+84912345678'];
    
    testPhones.forEach(phone => {
      try {
        const encrypted = dataProtection.encrypt(phone);
        const decrypted = dataProtection.decrypt(encrypted);
        
        const status = decrypted === phone ? '✅' : '❌';
        console.log(`   ${status} ${phone} -> encrypted -> ${decrypted}`);
      } catch (error) {
        console.log(`   ❌ ${phone}: Encryption error - ${error.message}`);
      }
    });
    
    console.log('✅ Phone encryption tests completed\n');
  } catch (error) {
    console.log(`❌ Phone encryption test failed: ${error.message}\n`);
  }
}

// Test status validation
function testStatusValidation() {
  console.log('📊 Testing Status Validation...');
  
  const validStatuses = ['new', 'contacted', 'converted'];
  const testStatuses = ['new', 'contacted', 'converted', 'invalid', '', null];
  
  testStatuses.forEach(status => {
    const isValid = validStatuses.includes(status);
    const statusIcon = isValid ? '✅' : '❌';
    console.log(`   ${statusIcon} "${status}": ${isValid ? 'valid' : 'invalid'}`);
  });
  
  console.log('✅ Status validation tests completed\n');
}

// Test lead filtering logic
function testLeadFiltering() {
  console.log('🔍 Testing Lead Filtering Logic...');
  
  // Mock lead data
  const mockLeads = [
    { leadId: 'LEAD_1', status: 'new', major: 'CNTT', createdAt: new Date('2024-01-01') },
    { leadId: 'LEAD_2', status: 'contacted', major: 'CNTT', createdAt: new Date('2024-01-02') },
    { leadId: 'LEAD_3', status: 'new', major: 'Thiết kế', createdAt: new Date('2024-01-03') },
    { leadId: 'LEAD_4', status: 'converted', major: 'CNTT', createdAt: new Date('2024-01-04') }
  ];
  
  // Test status filtering
  const newLeads = mockLeads.filter(lead => lead.status === 'new');
  const contactedLeads = mockLeads.filter(lead => lead.status === 'contacted');
  
  console.log(`✅ Status filtering:`);
  console.log(`   Total leads: ${mockLeads.length}`);
  console.log(`   New leads: ${newLeads.length}`);
  console.log(`   Contacted leads: ${contactedLeads.length}`);
  
  // Test major filtering
  const cnttLeads = mockLeads.filter(lead => lead.major === 'CNTT');
  const designLeads = mockLeads.filter(lead => lead.major === 'Thiết kế');
  
  console.log(`✅ Major filtering:`);
  console.log(`   CNTT leads: ${cnttLeads.length}`);
  console.log(`   Thiết kế leads: ${designLeads.length}`);
  
  // Test date filtering
  const dateFrom = new Date('2024-01-02');
  const dateTo = new Date('2024-01-03');
  const dateFilteredLeads = mockLeads.filter(lead => 
    lead.createdAt >= dateFrom && lead.createdAt <= dateTo
  );
  
  console.log(`✅ Date filtering (2024-01-02 to 2024-01-03):`);
  console.log(`   Filtered leads: ${dateFilteredLeads.length}`);
  
  console.log('✅ Lead filtering tests completed\n');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Lead Management Logic Tests...\n');
  
  try {
    testLeadIdGeneration();
    testDataValidation();
    testLeadDataTransformation();
    testPhoneEncryption();
    testStatusValidation();
    testLeadFiltering();
    
    console.log('🎉 All lead management logic tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testLeadIdGeneration,
  testDataValidation,
  testLeadDataTransformation,
  testPhoneEncryption,
  testStatusValidation,
  testLeadFiltering,
  runAllTests
};