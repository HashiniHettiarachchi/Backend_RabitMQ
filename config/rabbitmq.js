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
      return { connection, channel };
    }

    // Skip connection if RABBITMQ_URL is not set
    if (!RABBITMQ_URL || RABBITMQ_URL === 'amqp://localhost') {
      console.warn('⚠️  RABBITMQ_URL not configured. Skipping RabbitMQ connection.');
      return { connection: null, channel: null };
    }

    console.log('🔌 Connecting to RabbitMQ...');
    
    // Create connection with timeout
    connection = await Promise.race([
      amqp.connect(RABBITMQ_URL),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RabbitMQ connection timeout')), 5000)
      )
    ]);
    
    console.log('✅ RabbitMQ connection established');

    // Create channel
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ channel created');

    // Declare queues
    await channel.assertQueue(QUEUE_EMAIL, { durable: true });
    await channel.assertQueue(QUEUE_SMS, { durable: true });
    console.log('✅ Queues declared');

    // Handle errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    console.log('✅ RabbitMQ Connected!');
    return { connection, channel };

  } catch (error) {
    console.warn('⚠️  RabbitMQ connection failed:', error.message);
    console.warn('   Continuing without RabbitMQ. Events will not be published.');
    connection = null;
    channel = null;
    return { connection: null, channel: null };
  }
};

const getChannel = async () => {
  if (!channel) {
    const result = await connectRabbitMQ();
    return result.channel;
  }
  return channel;
};

const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (error) {
    console.error('Error closing RabbitMQ:', error.message);
  } finally {
    connection = null;
    channel = null;
  }
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  closeConnection,
  QUEUE_EMAIL,
  QUEUE_SMS
};