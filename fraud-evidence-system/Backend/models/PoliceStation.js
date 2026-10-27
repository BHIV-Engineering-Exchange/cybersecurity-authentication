const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema({
  zoneRangeDistrict: {
    type: String,
    required: true,
    index: true
  },
  officeContact: {
    type: String,
    required: true
  },
  officeContactMobile: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
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
    default: 'General Law Enforcement'
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
policeStationSchema.index({ zoneRangeDistrict: 'text', officeContact: 'text', state: 'text', city: 'text' });

// Virtual for full location
policeStationSchema.virtual('fullLocation').get(function() {
  return `${this.city || ''} ${this.state || ''}`.trim();
});

// Method to get contact summary
policeStationSchema.methods.getContactSummary = function() {
  return {
    id: this._id,
    zoneRangeDistrict: this.zoneRangeDistrict,
    officeContact: this.officeContact,
    officeContactMobile: this.officeContactMobile,
    email: this.email,
    state: this.state,
    city: this.city,
    specialization: this.specialization,
    priority: this.priority
  };
};

// Static method to search by location
policeStationSchema.statics.findByLocation = function(location) {
  return this.find({
    $or: [
      { zoneRangeDistrict: { $regex: location, $options: 'i' } },
      { state: { $regex: location, $options: 'i' } },
      { city: { $regex: location, $options: 'i' } },
      { officeContact: { $regex: location, $options: 'i' } }
    ],
    isActive: true
  });
};

// Static method to get all states
policeStationSchema.statics.getStates = function() {
  return this.distinct('state', { isActive: true });
};

// Static method to get all cities
policeStationSchema.statics.getCities = function() {
  return this.distinct('city', { isActive: true });
};

module.exports = mongoose.model('PoliceStation', policeStationSchema);
