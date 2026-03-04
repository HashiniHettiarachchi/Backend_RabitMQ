const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { auth, isAdmin } = require('../middleware/auth');

// @route   GET /api/services
// @desc    Get all active services
// @access  Public
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/:id
// @desc    Get service by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services
// @desc    Create new service (Admin only)
// @access  Private (Admin)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, duration, price, category } = req.body;

    const service = new Service({
      name,
      description,
      duration,
      price,
      category
    });

    await service.save();
    res.status(201).json({ message: 'Service created successfully', service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/services/:id
// @desc    Update service (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, duration, price, category, isActive } = req.body;

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, duration, price, category, isActive },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service updated successfully', service });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete service (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
