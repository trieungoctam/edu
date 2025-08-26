/**
 * Admin Interface Demo
 * 
 * This demo shows how the admin interface works with mock data
 * Run: node src/examples/admin-demo.js
 */

const express = require('express');
const path = require('path');

// Create a simple demo server without database dependency
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Mock data for demonstration
const mockLeads = [
  {
    leadId: 'LEAD_20241201_001',
    sessionId: 'session-001',
    firstName: 'Nguyễn Văn An',
    major: 'Công nghệ Thông tin',
    phone: '0901234567',
    phoneStandardized: '0901234567',
    channel: 'Zalo',
    timeslot: 'Trong hôm nay',
    status: 'new',
    createdAt: new Date('2024-12-01T09:30:00Z')
  },
  {
    leadId: 'LEAD_20241201_002',
    sessionId: 'session-002',
    firstName: 'Trần Thị Bình',
    major: 'Quản trị Kinh doanh',
    phone: '0987654321',
    phoneStandardized: '0987654321',
    channel: 'Gọi điện',
    timeslot: 'Tối (19–21h)',
    status: 'contacted',
    createdAt: new Date('2024-12-01T10:15:00Z')
  },
  {
    leadId: 'LEAD_20241201_003',
    sessionId: 'session-003',
    firstName: 'Lê Minh Cường',
    major: 'Thiết kế Đồ họa',
    phone: '0912345678',
    phoneStandardized: '0912345678',
    channel: 'Email',
    timeslot: 'Cuối tuần',
    status: 'converted',
    createdAt: new Date('2024-12-01T14:20:00Z')
  },
  {
    leadId: 'LEAD_20241202_004',
    sessionId: 'session-004',
    firstName: 'Phạm Thị Dung',
    major: 'Ngôn ngữ Anh',
    phone: '0923456789',
    phoneStandardized: '0923456789',
    channel: 'Zalo',
    timeslot: 'Chọn giờ khác - Sáng thứ 3',
    status: 'new',
    createdAt: new Date('2024-12-02T08:45:00Z')
  },
  {
    leadId: 'LEAD_20241202_005',
    sessionId: 'session-005',
    firstName: 'Hoàng Văn Em',
    major: 'Truyền thông Đa phương tiện',
    phone: '0934567890',
    phoneStandardized: '0934567890',
    channel: 'Gọi điện',
    timeslot: 'Trong hôm nay',
    status: 'contacted',
    createdAt: new Date('2024-12-02T11:30:00Z')
  }
];

const mockSessions = [
  { sessionId: 'session-001', isCompleted: true, createdAt: new Date('2024-12-01T09:30:00Z') },
  { sessionId: 'session-002', isCompleted: true, createdAt: new Date('2024-12-01T10:15:00Z') },
  { sessionId: 'session-003', isCompleted: true, createdAt: new Date('2024-12-01T14:20:00Z') },
  { sessionId: 'session-004', isCompleted: true, createdAt: new Date('2024-12-02T08:45:00Z') },
  { sessionId: 'session-005', isCompleted: true, createdAt: new Date('2024-12-02T11:30:00Z') },
  { sessionId: 'session-006', isCompleted: false, createdAt: new Date('2024-12-02T12:00:00Z') },
  { sessionId: 'session-007', isCompleted: false, createdAt: new Date('2024-12-02T13:15:00Z') }
];

// Helper functions
function filterLeadsByDate(leads, dateFrom, dateTo) {
  return leads.filter(lead => {
    const leadDate = new Date(lead.createdAt);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59Z') : null;
    
    if (from && leadDate < from) return false;
    if (to && leadDate > to) return false;
    return true;
  });
}

function filterLeadsByStatus(leads, status) {
  if (!status) return leads;
  return leads.filter(lead => lead.status === status);
}

function getLeadStats(leads, sessions) {
  const totalLeads = leads.length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.isCompleted).length;
  const completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(2) : 0;
  
  // Get today's data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const leadsToday = leads.filter(lead => {
    const leadDate = new Date(lead.createdAt);
    return leadDate >= today && leadDate < tomorrow;
  }).length;
  
  const sessionsToday = sessions.filter(session => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= today && sessionDate < tomorrow;
  }).length;
  
  // Get this week's data
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const leadsThisWeek = leads.filter(lead => new Date(lead.createdAt) >= weekAgo).length;
  const sessionsThisWeek = sessions.filter(session => new Date(session.createdAt) >= weekAgo).length;
  
  // Status breakdown
  const statusBreakdown = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  
  // Popular majors
  const majorCounts = leads.reduce((acc, lead) => {
    acc[lead.major] = (acc[lead.major] || 0) + 1;
    return acc;
  }, {});
  
  const popularMajors = Object.entries(majorCounts)
    .map(([major, count]) => ({ _id: major, count }))
    .sort((a, b) => b.count - a.count);
  
  // Channel preferences
  const channelCounts = leads.reduce((acc, lead) => {
    acc[lead.channel] = (acc[lead.channel] || 0) + 1;
    return acc;
  }, {});
  
  return {
    conversations: {
      total: totalSessions,
      completed: completedSessions,
      completionRate: parseFloat(completionRate),
      today: sessionsToday,
      thisWeek: sessionsThisWeek
    },
    leads: {
      total: totalLeads,
      today: leadsToday,
      thisWeek: leadsThisWeek,
      statusBreakdown
    },
    popularMajors,
    channelPreferences: channelCounts
  };
}

// API Routes
app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = getLeadStats(mockLeads, mockSessions);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Không thể lấy thống kê'
      }
    });
  }
});

app.get('/api/admin/leads', (req, res) => {
  try {
    const { dateFrom, dateTo, status, limit = 50, page = 1, export: exportFormat } = req.query;
    
    // Apply filters
    let filteredLeads = mockLeads;
    
    if (dateFrom || dateTo) {
      filteredLeads = filterLeadsByDate(filteredLeads, dateFrom, dateTo);
    }
    
    if (status) {
      filteredLeads = filterLeadsByStatus(filteredLeads, status);
    }
    
    // Sort by creation date (newest first)
    filteredLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // For export, return all matching leads
    if (exportFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="hsu-leads-${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.json({
        exportDate: new Date().toISOString(),
        totalLeads: filteredLeads.length,
        filters: { dateFrom, dateTo, status },
        leads: filteredLeads
      });
    }
    
    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    const paginatedLeads = filteredLeads.slice(skip, skip + limitNum);
    
    const totalPages = Math.ceil(filteredLeads.length / limitNum);
    
    res.json({
      success: true,
      data: {
        leads: paginatedLeads,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalLeads: filteredLeads.length,
          leadsPerPage: limitNum
        },
        filters: { dateFrom, dateTo, status }
      }
    });
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEADS_ERROR',
        message: 'Không thể lấy danh sách leads'
      }
    });
  }
});

app.put('/api/admin/leads/:leadId/status', (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required'
        }
      });
    }
    
    const validStatuses = ['new', 'contacted', 'converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }
      });
    }
    
    const leadIndex = mockLeads.findIndex(lead => lead.leadId === leadId);
    
    if (leadIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }
    
    // Update the lead status
    mockLeads[leadIndex].status = status;
    
    res.json({
      success: true,
      data: mockLeads[leadIndex]
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Không thể cập nhật trạng thái lead'
      }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HSU Chatbot Admin Demo is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('🎯 HSU Chatbot Admin Demo');
  console.log(`📊 Server running on: http://localhost:${PORT}`);
  console.log(`🎛️  Admin dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`💡 This demo uses mock data - no database required`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/admin/stats - Get statistics`);
  console.log(`   GET  /api/admin/leads - Get leads (with filtering)`);
  console.log(`   PUT  /api/admin/leads/:id/status - Update lead status`);
  console.log('');
  console.log('🔍 Try these sample requests:');
  console.log(`   curl http://localhost:${PORT}/api/admin/stats`);
  console.log(`   curl http://localhost:${PORT}/api/admin/leads`);
  console.log(`   curl http://localhost:${PORT}/api/admin/leads?status=new`);
  console.log(`   curl http://localhost:${PORT}/api/admin/leads?export=json`);
});

module.exports = app;