const mongoose = require('mongoose');
const DataProtection = require('../utils/dataProtection');

const leadSchema = new mongoose.Schema({
  leadId: {
    type: String,
    required: true,
    unique: true
  },
  sessionId: {
    type: String,
    required: true,
    ref: 'Session'
  },
  firstName: {
    type: String,
    required: true
  },
  major: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  phoneEncrypted: {
    type: String,
    required: false // Will be set by pre-save middleware
  },
  phoneStandardized: {
    type: String,
    required: true
  },
  phoneStandardizedEncrypted: {
    type: String,
    required: false // Will be set by pre-save middleware
  },
  channel: {
    type: String,
    required: true,
    enum: ['Gọi điện', 'Zalo', 'Email']
  },
  timeslot: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted'],
    default: 'new'
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
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

// Pre-save middleware to encrypt phone numbers and update timestamps
leadSchema.pre('save', function(next) {
  // Update timestamp on any modification
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }

  // Always encrypt phone numbers if they exist
  if (this.phone || this.phoneStandardized) {
    try {
      const dataProtection = new DataProtection();
      
      // Encrypt original phone
      if (this.phone && !this.phoneEncrypted) {
        this.phoneEncrypted = dataProtection.encrypt(this.phone);
      }
      
      // Encrypt standardized phone
      if (this.phoneStandardized && !this.phoneStandardizedEncrypted) {
        this.phoneStandardizedEncrypted = dataProtection.encrypt(this.phoneStandardized);
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
leadSchema.methods.getDecryptedPhones = function() {
  try {
    const dataProtection = new DataProtection();
    return {
      phone: this.phoneEncrypted ? dataProtection.decrypt(this.phoneEncrypted) : this.phone,
      phoneStandardized: this.phoneStandardizedEncrypted ? dataProtection.decrypt(this.phoneStandardizedEncrypted) : this.phoneStandardized
    };
  } catch (error) {
    throw new Error(`Failed to decrypt phone numbers: ${error.message}`);
  }
};

// Static method to find by encrypted phone
leadSchema.statics.findByPhone = async function(phone) {
  try {
    const dataProtection = new DataProtection();
    const encryptedPhone = dataProtection.encrypt(phone);
    return await this.findOne({ phoneEncrypted: encryptedPhone });
  } catch (error) {
    throw new Error(`Failed to search by phone: ${error.message}`);
  }
};

// Transform function to handle JSON output
leadSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Remove encrypted fields from JSON output
  delete obj.phoneEncrypted;
  delete obj.phoneStandardizedEncrypted;
  
  // If we need to show decrypted phones, decrypt them
  if (process.env.SHOW_DECRYPTED_PHONES === 'true') {
    try {
      const decrypted = this.getDecryptedPhones();
      obj.phone = decrypted.phone;
      obj.phoneStandardized = decrypted.phoneStandardized;
    } catch (error) {
      // Keep original values if decryption fails
      console.error('Failed to decrypt phones for JSON output:', error.message);
    }
  } else {
    // Mask phone numbers in JSON output for security
    if (obj.phone) {
      obj.phone = obj.phone.substring(0, 3) + '*'.repeat(obj.phone.length - 5) + obj.phone.substring(obj.phone.length - 2);
    }
    if (obj.phoneStandardized) {
      obj.phoneStandardized = obj.phoneStandardized.substring(0, 3) + '*'.repeat(obj.phoneStandardized.length - 5) + obj.phoneStandardized.substring(obj.phoneStandardized.length - 2);
    }
  }
  
  return obj;
};

// Add indexes for better query performance
leadSchema.index({ sessionId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ phoneEncrypted: 1 });
leadSchema.index({ phoneStandardizedEncrypted: 1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;