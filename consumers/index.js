require('dotenv').config(); // ← ADD THIS LINE AT THE TOP

const { connectRabbitMQ } = require('../config/rabbitmq');
const emailConsumer = require('./emailConsumer');
const smsConsumer = require('./smsConsumer');

async function startAllConsumers() {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🚀 STARTING MESSAGE CONSUMERS              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to RabbitMQ
    console.log('🔌 Connecting to RabbitMQ...');
    console.log('RABBITMQ_URL exists:', !!process.env.RABBITMQ_URL); // Debug log
    
    const { connection, channel } = await connectRabbitMQ();
    
    if (!connection || !channel) {
      throw new Error('Failed to connect to RabbitMQ');
    }

    console.log('✅ RabbitMQ connected!');
    console.log('✅ Channel ready!');
    console.log('');

    // Start consumers (pass channel to them)
    await emailConsumer.start(channel);
    await smsConsumer.start(channel);

    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL CONSUMERS RUNNING                     ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 Keep this window open!');
    console.log('📬 Watching for messages...');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:');
    console.error(error);
    console.error('');
    console.error('💡 Make sure:');
    console.error('   1. .env file exists in backend root');
    console.error('   2. RABBITMQ_URL is set in .env');
    console.error('   3. RabbitMQ service is accessible');
    console.error('');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('');
  console.log('🛑 Shutting down...');
  process.exit(0);
});

// Start!
startAllConsumers();