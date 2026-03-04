const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');
const EventPublisher = require('../services/eventPublisher');

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    console.log('📅 Creating new appointment...');
    console.log('User ID:', req.user.userId);
    console.log('Request body:', req.body);

    const { service, staff, appointmentDate, startTime, endTime, paymentMethod, notes } = req.body;

    // Validate required fields
    if (!service || !staff || !appointmentDate || !startTime || !endTime || !paymentMethod) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if service exists
    const serviceData = await Service.findById(service);
    if (!serviceData) {
      return res.status(404).json({ message: 'Service not found' });
    }
    console.log('✅ Service found:', serviceData.name);

    // Check if staff exists and is approved
    const staffData = await User.findById(staff);
    if (!staffData || staffData.role !== 'staff' || !staffData.isApproved) {
      return res.status(404).json({ message: 'Staff must be approved' });
    }
    console.log('✅ Staff found:', staffData.name);

    // Check if time slot is available
    const existingAppointment = await Appointment.findOne({
      staff,
      appointmentDate,
      startTime,
      status: { $nin: ['cancelled'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    // Create appointment
    const appointment = new Appointment({
      customer: req.user.userId,
      service,
      staff,
      appointmentDate,
      startTime,
      endTime,
      paymentMethod,
      amount: serviceData.price,
      notes,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await appointment.save();
    console.log('✅ Appointment saved to database');

    // CRITICAL: Populate appointment with full details
    await appointment.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'staff', select: 'name email phone specialization' },
      { path: 'service', select: 'name duration price category' }
    ]);
    console.log('✅ Appointment populated');
    console.log('Customer email:', appointment.customer?.email);
    console.log('Staff email:', appointment.staff?.email);

    // CRITICAL: Publish event to RabbitMQ
    console.log('📤 Publishing event to RabbitMQ...');
    try {
      const published = await EventPublisher.appointmentCreated(appointment.toObject());
      if (published) {
        console.log('✅ Event published successfully');
      } else {
        console.log('⚠️ Event publishing returned false');
      }
    } catch (publishError) {
      console.error('❌ Event publishing failed:', publishError);
      // Don't fail the appointment creation, just log the error
    }

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });

  } catch (error) {
    console.error('❌ Create appointment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments based on user role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Filter based on role
    if (req.user.role === 'customer') {
      query.customer = req.user.userId;
    } else if (req.user.role === 'staff') {
      query.staff = req.user.userId;
    }
    // Admin sees all appointments (no filter)

    // Optional filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.startDate && req.query.endDate) {
      query.appointmentDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('customer', 'name email phone')
      .populate('staff', 'name email phone specialization')
      .populate('service', 'name duration price category')
      .sort({ appointmentDate: -1, startTime: -1 });

    res.json(appointments);

  } catch (error) {
    console.error('❌ Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment (confirm, cancel, complete, mark paid)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('🔄 Updating appointment:', req.params.id);
    console.log('Update data:', req.body);

    const { status, paymentStatus, paidAt } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Permission check
    const isCustomer = req.user.userId.toString() === appointment.customer.toString();
    const isStaff = req.user.userId.toString() === appointment.staff.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isStaff && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Store old status to detect changes
    const oldStatus = appointment.status;

    // Update fields
    if (status) appointment.status = status;
    if (paymentStatus) appointment.paymentStatus = paymentStatus;
    if (paidAt) appointment.paidAt = paidAt;

    await appointment.save();
    console.log('✅ Appointment updated in database');

    // CRITICAL: Populate for event
    await appointment.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'staff', select: 'name email phone specialization' },
      { path: 'service', select: 'name duration price category' }
    ]);
    console.log('✅ Appointment populated for event');

    // CRITICAL: Publish events based on status change
    try {
      if (status && status !== oldStatus) {
        console.log(`📤 Publishing event for status change: ${oldStatus} → ${status}`);
        
        if (status === 'confirmed') {
          console.log('📤 Publishing: appointment.confirmed');
          await EventPublisher.appointmentConfirmed(appointment.toObject());
          console.log('✅ Confirmed event published');
        } else if (status === 'cancelled') {
          console.log('📤 Publishing: appointment.cancelled');
          await EventPublisher.appointmentCancelled(appointment.toObject());
          console.log('✅ Cancelled event published');
        } else if (status === 'completed') {
          console.log('📤 Publishing: appointment.completed');
          await EventPublisher.appointmentCompleted(appointment.toObject());
          console.log('✅ Completed event published');
        }
      }
    } catch (publishError) {
      console.error('❌ Event publishing failed:', publishError);
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });

  } catch (error) {
    console.error('❌ Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get single appointment
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('staff', 'name email phone specialization')
      .populate('service', 'name duration price category');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);

  } catch (error) {
    console.error('❌ Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;