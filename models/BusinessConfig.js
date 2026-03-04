const mongoose = require('mongoose');

const businessConfigSchema = new mongoose.Schema({
  // Business Identity
  businessName: {
    type: String,
    required: true,
    default: "My Booking System"
  },
  
  businessType: {
    type: String,
    enum: ['salon', 'hospital', 'hotel', 'restaurant', 'gym', 'spa', 'clinic'],
    default: 'salon'
  },
  
  // Branding
  logo: String,
  primaryColor: { type: String, default: '#667eea' },
  secondaryColor: { type: String, default: '#764ba2' },
  
  // Terminology (Dynamic Labels)
  terminology: {
    service: {
      singular: { type: String, default: 'Service' },
      plural: { type: String, default: 'Services' }
    },
    provider: {
      singular: { type: String, default: 'Staff' },
      plural: { type: String, default: 'Staff Members' }
    },
    booking: {
      singular: { type: String, default: 'Appointment' },
      plural: { type: String, default: 'Appointments' }
    },
    customer: {
      singular: { type: String, default: 'Customer' },
      plural: { type: String, default: 'Customers' }
    }
  },
  
  // Feature Toggles
  features: {
    requireStaffApproval: { type: Boolean, default: true },
    enableOnlinePayment: { type: Boolean, default: true },
    enableCashPayment: { type: Boolean, default: true }
  },
  
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusinessConfig', businessConfigSchema);