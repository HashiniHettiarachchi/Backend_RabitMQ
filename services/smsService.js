const twilio = require('twilio');

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
      this.enabled = true;
      console.log('✅ SMS Service enabled');
    } else {
      this.enabled = false;
      console.warn('⚠️ SMS disabled (no Twilio credentials)');
    }
  }

  async sendSMS(to, message) {
    if (!this.enabled) {
      console.log('📱 SMS disabled');
      return { success: false };
    }

    if (!to) {
      console.log('⚠️ No phone number');
      return { success: false };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log('✅ SMS sent:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('❌ SMS failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAppointmentCreatedToCustomer(appointment) {
    const { customer, service, appointmentDate, startTime } = appointment;

    const message = `🔔 Appointment Booked!\n\nService: ${service.name}\nDate: ${new Date(appointmentDate).toLocaleDateString()}\nTime: ${startTime}\n\nWaiting for staff confirmation.`;

    return await this.sendSMS(customer.phone, message);
  }

  async sendAppointmentConfirmedToCustomer(appointment) {
    const { customer, staff, service, appointmentDate, startTime } = appointment;

    const message = `✅ Confirmed!\n\nService: ${service.name}\nStaff: ${staff.name}\nDate: ${new Date(appointmentDate).toLocaleDateString()}\nTime: ${startTime}\n\nSee you soon!`;

    return await this.sendSMS(customer.phone, message);
  }

  async sendAppointmentCancelled(appointment, recipient) {
    const { service, appointmentDate, startTime } = appointment;

    const message = `❌ Cancelled\n\nService: ${service.name}\nDate: ${new Date(appointmentDate).toLocaleDateString()}\nTime: ${startTime}`;

    return await this.sendSMS(recipient.phone, message);
  }
}

module.exports = new SMSService();