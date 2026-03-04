const express = require('express');
const router = express.Router();
const BusinessConfig = require('../models/BusinessConfig');

// @route   GET /api/config
// @desc    Get business configuration
// @access  Public
router.get('/', async (req, res) => {
  try {
    let config = await BusinessConfig.findOne({ isActive: true });
    
    // If no config exists, create default salon config
    if (!config) {
      config = new BusinessConfig({
        businessName: "Salon Booking System",
        businessType: "salon"
      });
      await config.save();
    }
    
    res.json(config);
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/config
// @desc    Update configuration (Admin only)
// @access  Private
router.put('/', async (req, res) => {
  try {
    const config = await BusinessConfig.findOneAndUpdate(
      { isActive: true },
      req.body,
      { new: true }
    );
    
    res.json({ message: 'Configuration updated', config });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;