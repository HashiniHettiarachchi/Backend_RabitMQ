const amqp = require('amqplib');

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_EMAIL = 'email.queue';
const QUEUE_SMS = 'sms.queue';

const connectRabbitMQ = async () => {
  try {
    // Skip if no URL (Vercel serverless won't have this)
    if (!RABBITMQ_URL) {
      console.warn('⚠️ RABBITMQ_URL not set, skipping connection');
      return { connection: null, channel: null };
    }

    // If already connected, return existing
    if (connection && channel) {
      return { connection, channel };
    }

    console.log('🔌 Connecting to RabbitMQ...');
    
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_EMAIL, { durable: true });
    await channel.assertQueue(QUEUE_SMS, { durable: true });

    connection.on('error', (err) => {
      console.error('❌ RabbitMQ error:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('⚠️ RabbitMQ closed');
      connection = null;
      channel = null;
    });

    console.log('✅ RabbitMQ Connected!');
    return { connection, channel };

  } catch (error) {
    console.warn('⚠️ RabbitMQ connection failed:', error.message);
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