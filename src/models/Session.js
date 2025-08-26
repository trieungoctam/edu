const mongoose = require('mongoose');
const DataProtection = require('../utils/dataProtection');

const conversationHistorySchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  quickReplies: [{
    type: String
  }]
}, { _id: false });

const userDataSchema = new mongoose.Schema({
  major: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  phoneEncrypted: {
    type: String,
    default: ''
  },
  phoneStandardized: {
    type: String,
    default: ''
  },
  phoneStandardizedEncrypted: {
    type: String,
    default: ''
  },
  channel: {
    type: String,
    default: ''
  },
  timeslot: {
    type: String,
    default: ''
  }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  currentState: {
    type: String,
    enum: ['welcome', 'major', 'major_other', 'phone', 'channel', 'timeslot', 'custom_time', 'complete', 'nudge'],
    default: 'welcome'
  },
  previousState: {
    type: String,
    enum: ['welcome', 'major', 'major_other', 'phone', 'channel', 'timeslot', 'custom_time', 'complete', 'nudge'],
    default: null
  },
  userData: {
    type: userDataSchema,
    default: () => ({})
  },
  conversationHistory: [conversationHistorySchema],
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field and encrypt phone numbers before saving
sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Encrypt phone numbers if they've been modified
  if (this.isModified('userData.phone') || this.isModified('userData.phoneStandardized')) {
    try {
      const dataProtection = new DataProtection();
      
      // Encrypt original phone
      if (this.userData.phone) {
        this.userData.phoneEncrypted = dataProtection.encrypt(this.userData.phone);
      }
      
      // Encrypt standardized phone
      if (this.userData.phoneStandardized) {
        this.userData.phoneStandardizedEncrypted = dataProtection.encrypt(this.userData.phoneStandardized);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Method to decrypt phone numbers
sessionSchema.methods.getDecryptedPhones = function() {
  try {
    const dataProtection = new DataProtection();
    return {
      phone: this.userData.phoneEncrypted ? dataProtection.decrypt(this.userData.phoneEncrypted) : this.userData.phone,
      phoneStandardized: this.userData.phoneStandardizedEncrypted ? dataProtection.decrypt(this.userData.phoneStandardizedEncrypted) : this.userData.phoneStandardized
    };
  } catch (error) {
    throw new Error(`Failed to decrypt phone numbers: ${error.message}`);
  }
};

// Transform function to handle JSON output
sessionSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove encrypted fields from JSON output
  if (obj.userData) {
    delete obj.userData.phoneEncrypted;
    delete obj.userData.phoneStandardizedEncrypted;
    
    // If we need to show decrypted phones, decrypt them
    if (process.env.SHOW_DECRYPTED_PHONES === 'true') {
      try {
        const decrypted = this.getDecryptedPhones();
        obj.userData.phone = decrypted.phone;
        obj.userData.phoneStandardized = decrypted.phoneStandardized;
      } catch (error) {
        // Keep original values if decryption fails
        console.error('Failed to decrypt phones for JSON output:', error.message);
      }
    } else {
      // Mask phone numbers in JSON output for security
      if (obj.userData.phone) {
        obj.userData.phone = obj.userData.phone.substring(0, 3) + '*'.repeat(obj.userData.phone.length - 5) + obj.userData.phone.substring(obj.userData.phone.length - 2);
      }
      if (obj.userData.phoneStandardized) {
        obj.userData.phoneStandardized = obj.userData.phoneStandardized.substring(0, 3) + '*'.repeat(obj.userData.phoneStandardized.length - 5) + obj.userData.phoneStandardized.substring(obj.userData.phoneStandardized.length - 2);
      }
    }
  }
  
  return obj;
};

// Add indexes for better query performance
sessionSchema.index({ userId: 1 });
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ isCompleted: 1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;