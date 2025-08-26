// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the hsu-chatbot database
db = db.getSiblingDB('hsu-chatbot');

// Create application user
db.createUser({
  user: 'hsu_user',
  pwd: 'hsu_password',
  roles: [
    {
      role: 'readWrite',
      db: 'hsu-chatbot'
    }
  ]
});

// Create collections with indexes
db.createCollection('sessions');
db.createCollection('leads');

// Create indexes for sessions collection
db.sessions.createIndex({ "sessionId": 1 }, { unique: true });
db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "createdAt": -1 });
db.sessions.createIndex({ "isCompleted": 1 });

// Create indexes for leads collection
db.leads.createIndex({ "leadId": 1 }, { unique: true });
db.leads.createIndex({ "sessionId": 1 });
db.leads.createIndex({ "status": 1 });
db.leads.createIndex({ "createdAt": -1 });
db.leads.createIndex({ "phone": 1 });

// Insert sample data for testing
print('Inserting sample data...');

// Sample sessions
const sampleSessions = [
  {
    sessionId: 'session_demo_001',
    userId: 'user_001',
    firstName: 'Nguyễn Văn An',
    currentState: 'complete',
    userData: {
      major: 'Công nghệ Thông tin',
      phone: '0901234567',
      phoneStandardized: '0901234567',
      channel: 'Zalo',
      timeslot: 'Trong hôm nay'
    },
    conversationHistory: [
      {
        role: 'assistant',
        content: 'Chào An 👋 Chào mừng bạn đến với Đại học Hoa Sen!',
        timestamp: new Date('2024-12-01T09:30:00Z')
      },
      {
        role: 'user',
        content: 'Có, mình quan tâm',
        timestamp: new Date('2024-12-01T09:30:30Z')
      }
    ],
    isCompleted: true,
    createdAt: new Date('2024-12-01T09:30:00Z'),
    updatedAt: new Date('2024-12-01T09:35:00Z')
  },
  {
    sessionId: 'session_demo_002',
    userId: 'user_002',
    firstName: 'Trần Thị Bình',
    currentState: 'complete',
    userData: {
      major: 'Quản trị Kinh doanh',
      phone: '0987654321',
      phoneStandardized: '0987654321',
      channel: 'Gọi điện',
      timeslot: 'Tối (19–21h)'
    },
    conversationHistory: [
      {
        role: 'assistant',
        content: 'Chào Bình 👋 Chào mừng bạn đến với Đại học Hoa Sen!',
        timestamp: new Date('2024-12-01T10:15:00Z')
      }
    ],
    isCompleted: true,
    createdAt: new Date('2024-12-01T10:15:00Z'),
    updatedAt: new Date('2024-12-01T10:20:00Z')
  },
  {
    sessionId: 'session_demo_003',
    userId: 'user_003',
    firstName: 'Lê Minh Cường',
    currentState: 'phone',
    userData: {
      major: 'Thiết kế Đồ họa'
    },
    conversationHistory: [
      {
        role: 'assistant',
        content: 'Chào Cường 👋 Chào mừng bạn đến với Đại học Hoa Sen!',
        timestamp: new Date('2024-12-02T08:45:00Z')
      }
    ],
    isCompleted: false,
    createdAt: new Date('2024-12-02T08:45:00Z'),
    updatedAt: new Date('2024-12-02T08:50:00Z')
  }
];

db.sessions.insertMany(sampleSessions);

// Sample leads
const sampleLeads = [
  {
    leadId: 'LEAD_20241201_001',
    sessionId: 'session_demo_001',
    firstName: 'Nguyễn Văn An',
    major: 'Công nghệ Thông tin',
    phone: '0901234567',
    phoneStandardized: '0901234567',
    channel: 'Zalo',
    timeslot: 'Trong hôm nay',
    status: 'new',
    createdAt: new Date('2024-12-01T09:35:00Z')
  },
  {
    leadId: 'LEAD_20241201_002',
    sessionId: 'session_demo_002',
    firstName: 'Trần Thị Bình',
    major: 'Quản trị Kinh doanh',
    phone: '0987654321',
    phoneStandardized: '0987654321',
    channel: 'Gọi điện',
    timeslot: 'Tối (19–21h)',
    status: 'contacted',
    createdAt: new Date('2024-12-01T10:20:00Z')
  }
];

db.leads.insertMany(sampleLeads);

print('Sample data inserted successfully!');
print('Database initialization completed.');