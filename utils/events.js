// utils/events.js
const { QUEUE_EMAIL, QUEUE_SMS } = require('../config/rabbitmq');

const EVENT_TYPES = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  PAYMENT_COMPLETED: 'payment.completed',
  STAFF_APPROVED: 'staff.approved'
};

const QUEUES = {
  EMAIL: QUEUE_EMAIL,
  SMS: QUEUE_SMS
};

module.exports = { EVENT_TYPES, QUEUES };