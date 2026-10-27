const mongoose = require('mongoose');

const cybercrimeContactSchema = new mongoose.Schema({
  regionalOffice: {
    type: String,
    required: true,
    index: true
  },
  officerDesignation: {
    type: String,
    required: true,
    index: true
  },
  address: {
    type: String,
    required: true
  },
  email: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  }],
  mobile: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Invalid mobile number format'
    }
  }],
  telephone: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Invalid telephone number format'
    }
  }],
  fax: [{
    type: String
  }],
  // Additional fields for better organization
  state: {
    type: String,
    index: true
  },
  city: {
    type: String,
    index: true
  },
  specialization: {
    type: String,
    default: 'Cybercrime Investigation'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient searching
cybercrimeContactSchema.index({ officerDesignation: 'text', address: 'text', state: 'text', city: 'text' });

// Virtual for full location
cybercrimeContactSchema.virtual('fullLocation').get(function() {
  return `${this.city || ''} ${this.state || ''}`.trim();
});

// Method to get contact summary
cybercrimeContactSchema.methods.getContactSummary = function() {
  return {
    id: this._id,
    officerDesignation: this.officerDesignation,
    address: this.address,
    primaryEmail: this.email[0] || null,
    primaryMobile: this.mobile[0] || null,
    primaryTelephone: this.telephone[0] || null,
    state: this.state,
    city: this.city,
    specialization: this.specialization,
    priority: this.priority
  };
};

// Static method to search by location
cybercrimeContactSchema.statics.findByLocation = function(location) {
  return this.find({
    $or: [
      { officerDesignation: { $regex: location, $options: 'i' } },
      { state: { $regex: location, $options: 'i' } },
      { city: { $regex: location, $options: 'i' } },
      { address: { $regex: location, $options: 'i' } }
    ],
    isActive: true
  });
};

// Static method to get all states
cybercrimeContactSchema.statics.getStates = function() {
  return this.distinct('state', { isActive: true });
};

// Static method to get all cities
cybercrimeContactSchema.statics.getCities = function() {
  return this.distinct('city', { isActive: true });
};

module.exports = mongoose.model('CybercrimeContact', cybercrimeContactSchema);
