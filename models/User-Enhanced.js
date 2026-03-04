const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin'],
    default: 'customer'
  },
  // For staff members
  specialization: {
    type: String,
    default: null
  },
  availability: {
    type: [String], // e.g., ['Monday 9-5', 'Tuesday 9-5']
    default: []
  },
  // Staff approval system
  isApproved: {
    type: Boolean,
    default: false  // Everyone starts as NOT approved
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
