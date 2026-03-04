const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const { auth } = require('../middleware/auth');

// Note: Install stripe with: npm install stripe
// For now, this is a basic implementation
// You'll need to add your Stripe secret key to .env

// @route   POST /api/payments/create-intent
// @desc    Create a payment intent for online payment
// @access  Private
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { serviceId } = req.body;

    // Get service price
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // In a real implementation, initialize Stripe here
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: service.price * 100, // Stripe uses cents
    //   currency: 'usd',
    //   metadata: { serviceId: service._id.toString() }
    // });

    // For now, return mock payment intent
    const mockPaymentIntent = {
      id: 'pi_' + Math.random().toString(36).substr(2, 9),
      client_secret: 'secret_' + Math.random().toString(36).substr(2, 20),
      amount: service.price,
      status: 'requires_payment_method'
    };

    res.json({
      clientSecret: mockPaymentIntent.client_secret,
      paymentIntentId: mockPaymentIntent.id,
      amount: service.price
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment and update appointment
// @access  Private
router.post('/confirm', auth, async (req, res) => {
  try {
    const { appointmentId, paymentId, paymentMethod } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Update appointment with payment info
    if (paymentMethod === 'online') {
      appointment.paymentStatus = 'paid';
      appointment.paymentId = paymentId;
      appointment.paidAt = new Date();
    } else {
      // Cash payment - mark as pending until customer pays at salon
      appointment.paymentStatus = 'pending';
    }

    await appointment.save();

    res.json({
      message: 'Payment confirmed successfully',
      appointment: appointment
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/appointment/:id
// @desc    Get payment status for an appointment
// @access  Private
router.get('/appointment/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service', 'name price')
      .select('paymentMethod paymentStatus amount paidAt');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
