// consumers/emailConsumer.js
const emailService = require('../services/emailService');

class EmailConsumer {
  
  async start(channel) {
    const QUEUE_NAME = 'email.queue';
    
    console.log('');
    console.log('📧 EMAIL CONSUMER STARTING...');
    
    try {
      // Make absolutely sure queue exists
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      
      // Check how many messages are waiting
      const queueInfo = await channel.checkQueue(QUEUE_NAME);
      console.log(`📊 Messages in ${QUEUE_NAME}: ${queueInfo.messageCount}`);
      
      // Set prefetch
      channel.prefetch(1);
      
      console.log('✅ Starting to consume messages...');
      console.log(`👂 Listening to: ${QUEUE_NAME}`);
      console.log('');
      
      // THIS IS THE KEY PART - SIMPLE CONSUMER
      channel.consume(QUEUE_NAME, async (msg) => {
        
        if (!msg) {
          console.log('⚠️  Null message received');
          return;
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('📨 MESSAGE RECEIVED!');
        console.log('═══════════════════════════════════════════');
        
        try {
          // Parse message
          const content = msg.content.toString();
          console.log('Raw content length:', content.length, 'bytes');
          
          const event = JSON.parse(content);
          console.log('Event type:', event.eventType);
          console.log('Event ID:', event.eventId);
          
          // Process based on event type
          if (event.eventType === 'appointment.created') {
            console.log('');
            console.log('📧 Sending email to staff...');
            console.log('Staff email:', event.data.staff?.email);
            console.log('Customer:', event.data.customer?.name);
            
            const result = await emailService.sendAppointmentCreatedToStaff(event.data);
            
            if (result.success) {
              console.log('✅ EMAIL SENT SUCCESSFULLY!');
              console.log('Message ID:', result.messageId);
            } else {
              console.log('❌ Email send failed:', result.error);
            }
          } 
          else if (event.eventType === 'appointment.confirmed') {
            console.log('');
            console.log('📧 Sending confirmation email to customer...');
            console.log('Customer email:', event.data.customer?.email);
            
            const result = await emailService.sendAppointmentConfirmedToCustomer(event.data);
            
            if (result.success) {
              console.log('✅ EMAIL SENT SUCCESSFULLY!');
            } else {
              console.log('❌ Email send failed:', result.error);
            }
          }
          else if (event.eventType === 'appointment.cancelled') {
            console.log('');
            console.log('📧 Sending cancellation emails...');
            await emailService.sendAppointmentCancelled(event.data, event.data.customer);
            await emailService.sendAppointmentCancelled(event.data, event.data.staff);
            console.log('✅ EMAILS SENT!');
          }
          else {
            console.log('⚠️  Unknown event type:', event.eventType);
          }
          
          // ACKNOWLEDGE MESSAGE (removes from queue)
          channel.ack(msg);
          console.log('✅ Message acknowledged and removed from queue');
          console.log('═══════════════════════════════════════════');
          console.log('');
          
        } catch (error) {
          console.error('');
          console.error('❌ ERROR PROCESSING MESSAGE:');
          console.error(error);
          console.error('');
          
          // Reject message (don't requeue to avoid infinite loop)
          channel.nack(msg, false, false);
          console.log('❌ Message rejected');
        }
        
      }, { 
        noAck: false  // CRITICAL: We want manual acknowledgment
      });
      
      console.log('✅ EMAIL CONSUMER IS NOW RUNNING');
      console.log('⏳ Waiting for messages...');
      console.log('');
      
    } catch (error) {
      console.error('❌ Email consumer failed to start:', error);
      throw error;
    }
  }
}

module.exports = new EmailConsumer();