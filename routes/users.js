const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// @route   GET /api/users/staff
// @desc    Get all APPROVED staff members (for booking)
// @access  Public
router.get('/staff', async (req, res) => {
  try {
    const staff = await User.find({ 
      role: 'staff',
      isApproved: true  // Only show approved staff
    }).select('name email specialization availability');
    res.json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/staff/pending
// @desc    Get all PENDING staff members (for approval)
// @access  Private (Admin only)
router.get('/staff/pending', auth, isAdmin, async (req, res) => {
  try {
    const pendingStaff = await User.find({ 
      role: 'staff',
      isApproved: false
    }).select('name email phone specialization createdAt');
    
    res.json(pendingStaff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/staff/all
// @desc    Get ALL staff members (approved and pending)
// @access  Private (Admin only)
router.get('/staff/all', auth, isAdmin, async (req, res) => {
  try {
    const allStaff = await User.find({ 
      role: 'staff'
    }).select('name email phone specialization isApproved approvedAt createdAt');
    
    res.json(allStaff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/staff/:id/approve
// @desc    Approve staff member and set specialization
// @access  Private (Admin only)
router.put('/staff/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const { specialization } = req.body;

    // Validate specialization is provided
    if (!specialization) {
      return res.status(400).json({ message: 'Specialization is required for approval' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    // Update user with approval
    user.isApproved = true;
    user.specialization = specialization;
    user.approvedBy = req.user.userId;
    user.approvedAt = new Date();

    await user.save();

    res.json({ 
      message: 'Staff member approved successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        specialization: user.specialization,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/staff/:id/reject
// @desc    Reject/Remove staff member
// @access  Private (Admin only)
router.put('/staff/:id/reject', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    // Option 1: Delete the user completely
    await User.findByIdAndDelete(req.params.id);

    // Option 2: Change role back to customer (uncomment if preferred)
    // user.role = 'customer';
    // user.specialization = null;
    // user.isApproved = true;
    // await user.save();

    res.json({ message: 'Staff member rejected and removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/staff/:id/specialization
// @desc    Update staff specialization (can be used before or after approval)
// @access  Private (Admin only)
router.put('/staff/:id/specialization', auth, isAdmin, async (req, res) => {
  try {
    const { specialization } = req.body;

    if (!specialization) {
      return res.status(400).json({ message: 'Specialization is required' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    user.specialization = specialization;
    await user.save();

    res.json({ 
      message: 'Specialization updated successfully',
      user: {
        id: user._id,
        name: user.name,
        specialization: user.specialization
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin or own profile)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is updating their own profile or is admin
    if (req.user.userId !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, phone, specialization, availability } = req.body;

    const updateData = { name, phone };
    
    // Only update staff-specific fields if user is staff
    if (req.user.role === 'staff' || req.user.role === 'admin') {
      if (specialization) updateData.specialization = specialization;
      if (availability) updateData.availability = availability;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
