/**
 * Lead Management System Demo
 * Demonstrates the lead management functionality
 */

require('dotenv').config();
const LeadService = require('../services/LeadService');
const database = require('../config/database');

async function demonstrateLeadManagement() {
  console.log('🚀 Starting Lead Management Demo...\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected\n');

    const leadService = new LeadService();

    // Demo 1: Create a lead from session data format
    console.log('📝 Demo 1: Creating lead from session data format');
    const sessionData = {
      sessionId: 'demo-session-001',
      firstName: 'Nguyễn Văn A',
      userData: {
        major: 'CNTT',
        phone: '0901234567',
        phoneStandardized: '0901234567',
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      }
    };

    const lead1 = await leadService.createLead(sessionData);
    console.log(`✅ Lead created: ${lead1.leadId}`);
    console.log(`   Name: ${lead1.firstName}`);
    console.log(`   Major: ${lead1.major}`);
    console.log(`   Channel: ${lead1.channel}`);
    console.log(`   Status: ${lead1.status}\n`);

    // Demo 2: Create a lead from direct data format
    console.log('📝 Demo 2: Creating lead from direct data format');
    const leadData = {
      sessionId: 'demo-session-002',
      firstName: 'Trần Thị B',
      major: 'Thiết kế',
      phone: '0987654321',
      phoneStandardized: '0987654321',
      channel: 'Gọi điện',
      timeslot: 'Tối (19–21h)'
    };

    const lead2 = await leadService.createLead(leadData);
    console.log(`✅ Lead created: ${lead2.leadId}`);
    console.log(`   Name: ${lead2.firstName}`);
    console.log(`   Major: ${lead2.major}`);
    console.log(`   Channel: ${lead2.channel}`);
    console.log(`   Status: ${lead2.status}\n`);

    // Demo 3: Retrieve lead by ID
    console.log('🔍 Demo 3: Retrieving lead by ID');
    const retrievedLead = await leadService.getLeadById(lead1.leadId);
    if (retrievedLead) {
      console.log(`✅ Lead found: ${retrievedLead.firstName}`);
      console.log(`   Created: ${retrievedLead.createdAt}`);
    } else {
      console.log('❌ Lead not found');
    }
    console.log();

    // Demo 4: Update lead status
    console.log('📝 Demo 4: Updating lead status');
    const updatedLead = await leadService.updateLeadStatus(lead1.leadId, 'contacted');
    if (updatedLead) {
      console.log(`✅ Lead status updated: ${updatedLead.status}`);
    } else {
      console.log('❌ Failed to update lead status');
    }
    console.log();

    // Demo 5: Update lead with notes
    console.log('📝 Demo 5: Adding notes to lead');
    const leadWithNotes = await leadService.updateLead(lead2.leadId, {
      status: 'contacted',
      notes: 'Đã liên hệ qua điện thoại, sinh viên quan tâm đến chương trình học bổng'
    });
    if (leadWithNotes) {
      console.log(`✅ Lead updated with notes`);
      console.log(`   Status: ${leadWithNotes.status}`);
      console.log(`   Notes: ${leadWithNotes.notes}`);
    }
    console.log();

    // Demo 6: Create more leads for statistics
    console.log('📝 Demo 6: Creating additional leads for statistics');
    const additionalLeads = [
      {
        sessionId: 'demo-session-003',
        firstName: 'Lê Văn C',
        major: 'CNTT',
        phone: '0912345678',
        phoneStandardized: '0912345678',
        channel: 'Email',
        timeslot: 'Cuối tuần'
      },
      {
        sessionId: 'demo-session-004',
        firstName: 'Phạm Thị D',
        major: 'Quản trị Kinh doanh',
        phone: '0923456789',
        phoneStandardized: '0923456789',
        channel: 'Zalo',
        timeslot: 'Chọn giờ khác'
      }
    ];

    for (const leadData of additionalLeads) {
      const lead = await leadService.createLead(leadData);
      console.log(`✅ Additional lead created: ${lead.firstName} - ${lead.major}`);
    }
    console.log();

    // Demo 7: Get all leads
    console.log('📋 Demo 7: Retrieving all leads');
    const allLeads = await leadService.getLeads();
    console.log(`✅ Total leads found: ${allLeads.length}`);
    allLeads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.firstName} - ${lead.major} (${lead.status})`);
    });
    console.log();

    // Demo 8: Filter leads by status
    console.log('🔍 Demo 8: Filtering leads by status');
    const newLeads = await leadService.getLeads({ status: 'new' });
    const contactedLeads = await leadService.getLeads({ status: 'contacted' });
    console.log(`✅ New leads: ${newLeads.length}`);
    console.log(`✅ Contacted leads: ${contactedLeads.length}`);
    console.log();

    // Demo 9: Get lead statistics
    console.log('📊 Demo 9: Getting lead statistics');
    const stats = await leadService.getLeadStats();
    console.log('✅ Lead Statistics:');
    console.log(`   Total leads: ${stats.totalLeads}`);
    console.log(`   Leads today: ${stats.leadsToday}`);
    console.log(`   Leads this week: ${stats.leadsThisWeek}`);
    console.log('   Status breakdown:', stats.statusBreakdown);
    console.log('   Popular majors:');
    stats.popularMajors.forEach((major, index) => {
      console.log(`     ${index + 1}. ${major._id}: ${major.count} leads`);
    });
    console.log('   Channel preferences:', stats.channelPreferences);
    console.log();

    // Demo 10: Test phone number encryption
    console.log('🔒 Demo 10: Testing phone number encryption');
    const leadWithPhone = await leadService.getLeadById(lead1.leadId);
    if (leadWithPhone) {
      console.log('✅ Phone number encryption test:');
      console.log(`   Lead ID: ${leadWithPhone.leadId}`);
      console.log(`   Phone (masked in JSON): ${leadWithPhone.phone}`);
      console.log(`   Phone standardized (masked): ${leadWithPhone.phoneStandardized}`);
      
      // Test decryption method
      try {
        const decryptedPhones = leadWithPhone.getDecryptedPhones();
        console.log(`   Phone (decrypted): ${decryptedPhones.phone}`);
        console.log(`   Phone standardized (decrypted): ${decryptedPhones.phoneStandardized}`);
      } catch (error) {
        console.log(`   ❌ Decryption error: ${error.message}`);
      }
    }
    console.log();

    // Demo 11: Test lead ID generation uniqueness
    console.log('🆔 Demo 11: Testing lead ID uniqueness');
    const leadIds = new Set();
    for (let i = 0; i < 5; i++) {
      const testLead = await leadService.createLead({
        sessionId: `unique-test-${i}`,
        firstName: `Test User ${i}`,
        major: 'CNTT',
        phone: `090123456${i}`,
        phoneStandardized: `090123456${i}`,
        channel: 'Zalo',
        timeslot: 'Trong hôm nay'
      });
      leadIds.add(testLead.leadId);
      console.log(`   Generated ID ${i + 1}: ${testLead.leadId}`);
    }
    console.log(`✅ All ${leadIds.size} lead IDs are unique`);
    console.log();

    console.log('🎉 Lead Management Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Disconnect from database
    console.log('\n📊 Disconnecting from database...');
    await database.disconnect();
    console.log('✅ Database disconnected');
  }
}

// Run the demo
if (require.main === module) {
  demonstrateLeadManagement();
}

module.exports = { demonstrateLeadManagement };