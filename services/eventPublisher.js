// services/eventPublisher.js
const { v4: uuidv4 } = require('uuid');
const { getChannel } = require('../config/rabbitmq');
const { QUEUES } = require('../utils/events');

class EventPublisher {
  
  static async publish(eventType, data, queues = [QUEUES.EMAIL]) {
    try {
      const channel = await getChannel();
      
      if (!channel) {
        console.warn('⚠️  RabbitMQ not available. Event will not be published:', eventType);
        console.warn('   This is normal on Vercel. Deploy consumers to Railway to process events.');
        return false;
      }

      const event = {
        eventId: uuidv4(),
        eventType,
        timestamp: new Date().toISOString(),
        data
      };

      const message = Buffer.from(JSON.stringify(event));

      for (const queue of queues) {
        await channel.sendToQueue(queue, message, { persistent: true });
        console.log(`📤 Published to ${queue}:`, eventType);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to publish event:', error.message);
      console.error('   Event type:', eventType);
      console.error('   This is OK on Vercel. Events will be processed when consumers are running on Railway.');
      return false;
    }
  }

  static async appointmentCreated(appointment) {
    return await this.publish(
      'appointment.created',
      appointment,
      [QUEUES.EMAIL, QUEUES.SMS]
    );
  }

  static async appointmentConfirmed(appointment) {
    return await this.publish(
      'appointment.confirmed',
      appointment,
      [QUEUES.EMAIL, QUEUES.SMS]
    );
  }

  static async appointmentCancelled(appointment) {
    return await this.publish(
      'appointment.cancelled',
      appointment,
      [QUEUES.EMAIL, QUEUES.SMS]
    );
  }

  static async appointmentCompleted(appointment) {
    return await this.publish(
      'appointment.completed',
      appointment,
      [QUEUES.EMAIL]
    );
  }
}

module.exports = EventPublisher;