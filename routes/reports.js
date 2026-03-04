const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// @route   GET /api/reports/weekly
// @desc    Get weekly report data
// @access  Private (Admin only)
router.get('/weekly', auth, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log('Generating weekly report...');
    console.log('Date range:', weekAgo, 'to', today);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: weekAgo, $lte: today }
    })
      .populate('customer', 'name email phone')
      .populate('staff', 'name specialization')
      .populate('service', 'name price duration category')
      .sort({ appointmentDate: -1, startTime: -1 });

    console.log(`Found ${appointments.length} appointments in date range`);

    // Calculate statistics
    const totalAppointments = appointments.length;
    const totalRevenue = appointments
      .filter(apt => apt.paymentStatus === 'paid')
      .reduce((sum, apt) => sum + (apt.amount || apt.service?.price || 0), 0);
    
    const pendingPayments = appointments
      .filter(apt => apt.paymentStatus === 'pending')
      .reduce((sum, apt) => sum + (apt.amount || apt.service?.price || 0), 0);

    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;

    // Payment breakdown
    const cashPayments = appointments.filter(apt => 
      (apt.paymentMethod === 'cash' || !apt.paymentMethod) && apt.paymentStatus === 'paid'
    ).length;
    const onlinePayments = appointments.filter(apt => 
      apt.paymentMethod === 'online' && apt.paymentStatus === 'paid'
    ).length;

    // Service breakdown
    const serviceBreakdown = {};
    appointments.forEach(apt => {
      const serviceName = apt.service?.name || 'Unknown';
      if (!serviceBreakdown[serviceName]) {
        serviceBreakdown[serviceName] = { count: 0, revenue: 0 };
      }
      serviceBreakdown[serviceName].count++;
      if (apt.paymentStatus === 'paid') {
        serviceBreakdown[serviceName].revenue += apt.amount || apt.service?.price || 0;
      }
    });

    console.log('Report summary:', {
      totalAppointments,
      totalRevenue,
      completedAppointments
    });

    res.json({
      period: 'Weekly',
      startDate: weekAgo.toISOString(),
      endDate: today.toISOString(),
      summary: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        pendingPayments,
        cashPayments,
        onlinePayments
      },
      serviceBreakdown,
      appointments
    });

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/monthly
// @desc    Get monthly report data
// @access  Private (Admin only)
router.get('/monthly', auth, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: monthAgo, $lte: today }
    })
      .populate('customer', 'name email phone')
      .populate('staff', 'name specialization')
      .populate('service', 'name price duration category')
      .sort({ appointmentDate: -1, startTime: -1 });

    // Calculate statistics
    const totalAppointments = appointments.length;
    const totalRevenue = appointments
      .filter(apt => apt.paymentStatus === 'paid')
      .reduce((sum, apt) => sum + (apt.amount || 0), 0);
    
    const pendingPayments = appointments
      .filter(apt => apt.paymentStatus === 'pending')
      .reduce((sum, apt) => sum + (apt.amount || 0), 0);

    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;

    // Payment breakdown
    const cashPayments = appointments.filter(apt => apt.paymentMethod === 'cash' && apt.paymentStatus === 'paid').length;
    const onlinePayments = appointments.filter(apt => apt.paymentMethod === 'online' && apt.paymentStatus === 'paid').length;

    // Service breakdown
    const serviceBreakdown = {};
    appointments.forEach(apt => {
      const serviceName = apt.service?.name || 'Unknown';
      if (!serviceBreakdown[serviceName]) {
        serviceBreakdown[serviceName] = { count: 0, revenue: 0 };
      }
      serviceBreakdown[serviceName].count++;
      if (apt.paymentStatus === 'paid') {
        serviceBreakdown[serviceName].revenue += apt.amount || 0;
      }
    });

    // Staff performance
    const staffPerformance = {};
    appointments.forEach(apt => {
      const staffName = apt.staff?.name || 'Unknown';
      if (!staffPerformance[staffName]) {
        staffPerformance[staffName] = { 
          appointments: 0, 
          completed: 0,
          revenue: 0 
        };
      }
      staffPerformance[staffName].appointments++;
      if (apt.status === 'completed') {
        staffPerformance[staffName].completed++;
      }
      if (apt.paymentStatus === 'paid') {
        staffPerformance[staffName].revenue += apt.amount || 0;
      }
    });

    res.json({
      period: 'Monthly',
      startDate: monthAgo.toISOString(),
      endDate: today.toISOString(),
      summary: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        pendingPayments,
        cashPayments,
        onlinePayments
      },
      serviceBreakdown,
      staffPerformance,
      appointments
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/custom
// @desc    Get custom date range report
// @access  Private (Admin only)
router.get('/custom', auth, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: start, $lte: end }
    })
      .populate('customer', 'name email phone')
      .populate('staff', 'name specialization')
      .populate('service', 'name price duration category')
      .sort({ appointmentDate: -1, startTime: -1 });

    // Calculate statistics
    const totalAppointments = appointments.length;
    const totalRevenue = appointments
      .filter(apt => apt.paymentStatus === 'paid')
      .reduce((sum, apt) => sum + (apt.amount || 0), 0);
    
    const pendingPayments = appointments
      .filter(apt => apt.paymentStatus === 'pending')
      .reduce((sum, apt) => sum + (apt.amount || 0), 0);

    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;

    // Payment breakdown
    const cashPayments = appointments.filter(apt => apt.paymentMethod === 'cash' && apt.paymentStatus === 'paid').length;
    const onlinePayments = appointments.filter(apt => apt.paymentMethod === 'online' && apt.paymentStatus === 'paid').length;

    // Service breakdown
    const serviceBreakdown = {};
    appointments.forEach(apt => {
      const serviceName = apt.service?.name || 'Unknown';
      if (!serviceBreakdown[serviceName]) {
        serviceBreakdown[serviceName] = { count: 0, revenue: 0 };
      }
      serviceBreakdown[serviceName].count++;
      if (apt.paymentStatus === 'paid') {
        serviceBreakdown[serviceName].revenue += apt.amount || 0;
      }
    });

    res.json({
      period: 'Custom',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        pendingPayments,
        cashPayments,
        onlinePayments
      },
      serviceBreakdown,
      appointments
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
