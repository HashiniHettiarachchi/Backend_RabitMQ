const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendAppointmentCreatedToStaff(appointment) {
    const { customer, staff, service, appointmentDate, startTime, endTime } = appointment;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: staff.email,
      subject: '🔔 New Appointment Booking',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">New Appointment Booking</h1>
            <p>Hi ${staff.name},</p>
            <p>You have a new appointment:</p>
            
            <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Customer:</strong> ${customer.name}</p>
              <p><strong>Email:</strong> ${customer.email}</p>
              <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
              <p><strong>Service:</strong> ${service.name}</p>
              <p><strong>Price:</strong> $${service.price}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
            </div>
            
            <p>Please log in to confirm or reject this appointment.</p>
            <a href="${process.env.FRONTEND_URL}/appointments" 
               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px;">
              Confirm Appointment
            </a>
          </div>
        </div>
      `
    };

    return await this.sendMail(mailOptions);
  }

  async sendAppointmentConfirmedToCustomer(appointment) {
    const { customer, staff, service, appointmentDate, startTime, endTime } = appointment;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: customer.email,
      subject: '✅ Appointment Confirmed!',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #28a745;">✅ Appointment Confirmed!</h1>
            <p>Hi ${customer.name},</p>
            <p>Your appointment has been confirmed!</p>
            
            <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Service:</strong> ${service.name}</p>
              <p><strong>Staff:</strong> ${staff.name}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
              <p><strong>Price:</strong> $${service.price}</p>
            </div>
            
            <p>Looking forward to seeing you!</p>
          </div>
        </div>
      `
    };

    return await this.sendMail(mailOptions);
  }

  async sendAppointmentCancelled(appointment, recipient) {
    const { customer, staff, service, appointmentDate, startTime } = appointment;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: recipient.email,
      subject: '❌ Appointment Cancelled',
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Appointment Cancelled</h2>
          <p>Hi ${recipient.name},</p>
          <p>This appointment has been cancelled:</p>
          <p><strong>Customer:</strong> ${customer.name}</p>
          <p><strong>Staff:</strong> ${staff.name}</p>
          <p><strong>Service:</strong> ${service.name}</p>
          <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${startTime}</p>
        </div>
      `
    };

    return await this.sendMail(mailOptions);
  }

  async sendMail(mailOptions) {
  try {
    console.log('📧 Attempting to send email...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    const info = await this.transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    console.log('Response:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email failed:', error);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
}
}

module.exports = new EmailService();