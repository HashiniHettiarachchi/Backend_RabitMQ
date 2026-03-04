const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MIGRATION SCRIPT - Fix Appointments
 * Adds missing payment fields to existing appointments
 * Run this ONCE after updating the Appointment model
 */

const migrateAppointments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Appointment = mongoose.model('Appointment', {
      customer: mongoose.Schema.Types.ObjectId,
      staff: mongoose.Schema.Types.ObjectId,
      service: mongoose.Schema.Types.ObjectId,
      appointmentDate: Date,
      startTime: String,
      endTime: String,
      status: String,
      notes: String,
      paymentMethod: String,
      paymentStatus: String,
      paymentId: String,
      amount: Number,
      paidAt: Date,
      createdAt: Date
    });

    const Service = mongoose.model('Service', {
      name: String,
      description: String,
      duration: Number,
      price: Number,
      category: String
    });

    console.log('\n📝 Checking appointments...');

    // Find appointments without payment fields
    const appointmentsToFix = await Appointment.find({
      $or: [
        { amount: { $exists: false } },
        { amount: null },
        { amount: 0 },
        { paymentMethod: { $exists: false } },
        { paymentStatus: { $exists: false } }
      ]
    }).populate('service');

    console.log(`Found ${appointmentsToFix.length} appointments to fix`);

    if (appointmentsToFix.length === 0) {
      console.log('✅ All appointments are already up to date!');
      process.exit(0);
    }

    let fixed = 0;
    let errors = 0;

    for (const appointment of appointmentsToFix) {
      try {
        // Get service price
        let servicePrice = 0;
        if (appointment.service && appointment.service.price) {
          servicePrice = appointment.service.price;
        } else if (appointment.service) {
          // If service is just an ID, fetch it
          const service = await Service.findById(appointment.service);
          servicePrice = service?.price || 50; // Default to 50 if no price
        } else {
          servicePrice = 50; // Default price if no service
        }

        // Update appointment
        const updateData = {};
        
        if (!appointment.amount || appointment.amount === 0) {
          updateData.amount = servicePrice;
        }
        
        if (!appointment.paymentMethod) {
          updateData.paymentMethod = 'cash'; // Default to cash
        }
        
        if (!appointment.paymentStatus) {
          updateData.paymentStatus = 'pending'; // Default to pending
        }

        await Appointment.updateOne(
          { _id: appointment._id },
          { $set: updateData }
        );

        fixed++;
        console.log(`✅ Fixed appointment ${appointment._id} - Amount: $${servicePrice}`);

      } catch (error) {
        errors++;
        console.error(`❌ Error fixing appointment ${appointment._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Fixed: ${fixed} appointments`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} appointments`);
    }

    // Verify all appointments now have required fields
    const remaining = await Appointment.countDocuments({
      $or: [
        { amount: { $exists: false } },
        { paymentMethod: { $exists: false } },
        { paymentStatus: { $exists: false } }
      ]
    });

    if (remaining > 0) {
      console.log(`\n⚠️  Warning: ${remaining} appointments still need fixing`);
    } else {
      console.log('\n✅ All appointments successfully migrated!');
    }

    console.log('\n🎉 Migration completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
console.log('🚀 Starting appointment migration...\n');
migrateAppointments();
