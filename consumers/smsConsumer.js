// consumers/smsConsumer.js
const smsService = require('../services/smsService');

class SMSConsumer {
  
  async start(channel) {
    const QUEUE_NAME = 'sms.queue';
    
    console.log('');
    console.log('📱 SMS CONSUMER STARTING...');
    
    try {
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      
      const queueInfo = await channel.checkQueue(QUEUE_NAME);
      console.log(`📊 Messages in ${QUEUE_NAME}: ${queueInfo.messageCount}`);
      
      channel.prefetch(1);
      
      console.log('✅ Starting to consume messages...');
      console.log(`👂 Listening to: ${QUEUE_NAME}`);
      console.log('');
      
      channel.consume(QUEUE_NAME, async (msg) => {
        
        if (!msg) return;
        
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('📲 SMS MESSAGE RECEIVED!');
        console.log('═══════════════════════════════════════════');
        
        try {
          const event = JSON.parse(msg.content.toString());
          console.log('Event type:', event.eventType);
          
          // Check if customer has phone
          if (!event.data.customer?.phone) {
            console.log('⚠️  No customer phone number, skipping SMS');
            channel.ack(msg);
            return;
          }
          
          // Send SMS based on event type
          if (event.eventType === 'appointment.created') {
            await smsService.sendAppointmentCreatedToCustomer(event.data);
          } 
          else if (event.eventType === 'appointment.confirmed') {
            await smsService.sendAppointmentConfirmedToCustomer(event.data);
          }
          else if (event.eventType === 'appointment.cancelled') {
            await smsService.sendAppointmentCancelled(event.data, event.data.customer);
          }
          
          channel.ack(msg);
          console.log('✅ Message acknowledged');
          console.log('═══════════════════════════════════════════');
          console.log('');
          
        } catch (error) {
          console.error('❌ SMS consumer error:', error);
          channel.nack(msg, false, false);
        }
        
      }, { noAck: false });
      
      console.log('✅ SMS CONSUMER IS NOW RUNNING');
      console.log('');
      
    } catch (error) {
      console.error('❌ SMS consumer failed to start:', error);
      throw error;
    }
  }
}

module.exports = new SMSConsumer();