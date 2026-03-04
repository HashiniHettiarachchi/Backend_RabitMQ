// config/rabbitmq.js
const amqp = require('amqplib');

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_EMAIL = 'email.queue';
const QUEUE_SMS = 'sms.queue';

const connectRabbitMQ = async () => {
  try {
    // If already connected, return existing connection
    if (connection && channel) {
      console.log('♻️  Reusing existing RabbitMQ connection');
      return { connection, channel };
    }

    console.log('🔌 Connecting to RabbitMQ...');
    console.log('📍 URL:', RABBITMQ_URL.replace(/:.+@/, ':***@')); // Hide password in logs
    
    // Create connection
    connection = await amqp.connect(RABBITMQ_URL);
    console.log('✅ RabbitMQ connection established');

    // Create channel
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created');

    // Declare queues (idempotent - safe to call multiple times)
    await channel.assertQueue(QUEUE_EMAIL, { 
      durable: true,
    });
    console.log(`✅ Queue declared: ${QUEUE_EMAIL}`);

    await channel.assertQueue(QUEUE_SMS, { 
      durable: true,
    });
    console.log(`✅ Queue declared: ${QUEUE_SMS}`);

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
      connection = null;
      channel = null;
      console.log('🔄 Will reconnect on next message...');
    });

    console.log('✅ RabbitMQ Connected!');
    return { connection, channel };

  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
    console.error('   URL:', RABBITMQ_URL.replace(/:.+@/, ':***@'));
    connection = null;
    channel = null;
    throw error;
  }
};

const getChannel = async () => {
  if (!channel) {
    console.log('⚠️  Channel not available, reconnecting...');
    await connectRabbitMQ();
  }
  return channel;
};

const closeConnection = async () => {
  try {
    if (channel) {
      await channel.close();
      console.log('✅ RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      console.log('✅ RabbitMQ connection closed');
    }
  } catch (error) {
    console.error('Error closing RabbitMQ:', error.message);
  } finally {
    connection = null;
    channel = null;
  }
};

// Export queue names to ensure consistency
module.exports = {
  connectRabbitMQ,
  getChannel,
  closeConnection,
  QUEUE_EMAIL,
  QUEUE_SMS
};