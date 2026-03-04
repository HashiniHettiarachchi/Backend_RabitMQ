const mongoose = require('mongoose');
require('dotenv').config();

/**
 * COMPREHENSIVE APPOINTMENT FIX SCRIPT
 * This will fix ALL appointments and show you exactly what's happening
 */

const fixAppointments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define schemas
    const appointmentSchema = new mongoose.Schema({}, { strict: false });
    const serviceSchema = new mongoose.Schema({}, { strict: false });
    
    const Appointment = mongoose.model('Appointment', appointmentSchema);
    const Service = mongoose.model('Service', serviceSchema);

    // Step 1: Check how many appointments exist
    console.log('📊 CHECKING DATABASE...\n');
    const totalAppointments = await Appointment.countDocuments();
    console.log(`Total appointments in database: ${totalAppointments}`);

    if (totalAppointments === 0) {
      console.log('\n⚠️  No appointments found in database!');
      console.log('Create some appointments first, then run this script.\n');
      process.exit(0);
    }

    // Step 2: Check appointments without payment fields
    const withoutAmount = await Appointment.countDocuments({
      $or: [
        { amount: { $exists: false } },
        { amount: null },
        { amount: 0 }
      ]
    });

    const withoutPaymentMethod = await Appointment.countDocuments({
      paymentMethod: { $exists: false }
    });

    const withoutPaymentStatus = await Appointment.countDocuments({
      paymentStatus: { $exists: false }
    });

    console.log(`\nAppointments missing fields:`);
    console.log(`  - Missing amount: ${withoutAmount}`);
    console.log(`  - Missing paymentMethod: ${withoutPaymentMethod}`);
    console.log(`  - Missing paymentStatus: ${withoutPaymentStatus}\n`);

    if (withoutAmount === 0 && withoutPaymentMethod === 0 && withoutPaymentStatus === 0) {
      console.log('✅ All appointments already have payment fields!');
      console.log('\n📊 Let me show you the data:\n');
      
      const sample = await Appointment.findOne().populate('service');
      console.log('Sample appointment:', JSON.stringify(sample, null, 2));
      
      process.exit(0);
    }

    // Step 3: Get all services for price lookup
    const services = await Service.find();
    console.log(`Found ${services.length} services in database\n`);

    if (services.length === 0) {
      console.log('⚠️  WARNING: No services found!');
      console.log('Will use default price of $50 for all appointments.\n');
    }

    // Step 4: Fix each appointment
    console.log('🔧 FIXING APPOINTMENTS...\n');
    
    const appointments = await Appointment.find().populate('service');
    let fixed = 0;
    let alreadyOk = 0;

    for (const apt of appointments) {
      const updates = {};
      let needsUpdate = false;

      // Fix amount
      if (!apt.amount || apt.amount === 0) {
        let price = 50; // Default price
        
        if (apt.service && apt.service.price) {
          price = apt.service.price;
        } else if (apt.service) {
          // Service is just an ID, look it up
          const serviceDoc = services.find(s => s._id.toString() === apt.service.toString());
          if (serviceDoc && serviceDoc.price) {
            price = serviceDoc.price;
          }
        }
        
        updates.amount = price;
        needsUpdate = true;
      }

      // Fix paymentMethod
      if (!apt.paymentMethod) {
        updates.paymentMethod = 'cash';
        needsUpdate = true;
      }

      // Fix paymentStatus
      if (!apt.paymentStatus) {
        // If appointment is completed, mark as paid
        if (apt.status === 'completed') {
          updates.paymentStatus = 'paid';
          updates.paidAt = apt.createdAt || new Date();
        } else {
          updates.paymentStatus = 'pending';
        }
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Appointment.updateOne({ _id: apt._id }, { $set: updates });
        fixed++;
        console.log(`✅ Fixed appointment ${apt._id}`);
        console.log(`   Amount: $${updates.amount || apt.amount}`);
        console.log(`   Payment Method: ${updates.paymentMethod || apt.paymentMethod}`);
        console.log(`   Payment Status: ${updates.paymentStatus || apt.paymentStatus}\n`);
      } else {
        alreadyOk++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ Fixed: ${fixed} appointments`);
    console.log(`✓ Already OK: ${alreadyOk} appointments`);
    console.log(`📝 Total: ${appointments.length} appointments\n`);

    // Step 5: Verify the fix
    console.log('🔍 VERIFICATION:\n');
    
    const stillMissing = await Appointment.countDocuments({
      $or: [
        { amount: { $exists: false } },
        { paymentMethod: { $exists: false } },
        { paymentStatus: { $exists: false } }
      ]
    });

    if (stillMissing > 0) {
      console.log(`⚠️  WARNING: ${stillMissing} appointments still missing fields!`);
    } else {
      console.log('✅ All appointments now have payment fields!');
    }

    // Show some statistics
    const totalRevenue = await Appointment.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paidCount = await Appointment.countDocuments({ paymentStatus: 'paid' });
    const pendingCount = await Appointment.countDocuments({ paymentStatus: 'pending' });

    console.log('\n💰 REVENUE STATS:');
    console.log(`   Paid appointments: ${paidCount}`);
    console.log(`   Pending appointments: ${pendingCount}`);
    console.log(`   Total revenue: $${totalRevenue[0]?.total || 0}\n`);

    console.log('🎉 MIGRATION COMPLETED!\n');
    console.log('Next steps:');
    console.log('1. Restart your backend: npm run dev');
    console.log('2. Try downloading a report');
    console.log('3. Reports should now show real data!\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
};

console.log('╔════════════════════════════════════════════╗');
console.log('║   APPOINTMENT FIX & DIAGNOSTIC SCRIPT      ║');
console.log('╚════════════════════════════════════════════╝\n');

fixAppointments();
