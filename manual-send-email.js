// manual-send-email.js
require('dotenv').config();
const emailService = require('./services/emailService');

async function sendTestEmail() {
  console.log('=================================');
  console.log('MANUAL EMAIL TEST');
  console.log('=================================');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
  console.log('');

  // Test email to yourself (staff member)
  const testAppointment = {
    customer: {
      name: 'Kavi (Test Customer)',
      email: 'kavi@example.com',
      phone: '0771234567'
    },
    staff: {
      name: 'Hashini (You)',
      email: 'hehashini@gmail.com',  // Your email
      specialization: 'Hair Stylist'
    },
    service: {
      name: 'Haircut & Styling',
      price: 1500,
      duration: 60,
      category: 'Hair'
    },
    appointmentDate: new Date(),
    startTime: '10:00',
    endTime: '11:00'
  };

  console.log('Sending email to:', testAppointment.staff.email);
  console.log('Customer:', testAppointment.customer.name);
  console.log('');

  const result = await emailService.sendAppointmentCreatedToStaff(testAppointment);
  
  console.log('');
  console.log('Result:', result);
  
  if (result.success) {
    console.log('✅ SUCCESS! Check your inbox: hehashini@gmail.com');
    console.log('   (Check spam folder if not in inbox)');
  } else {
    console.log('❌ FAILED!');
    console.log('Error:', result.error);
  }
}

sendTestEmail();