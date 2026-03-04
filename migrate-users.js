const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MIGRATION SCRIPT
 * Adds isApproved field to existing users
 * Run this ONCE after updating the User model
 */

const migrateUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', {
      name: String,
      email: String,
      password: String,
      phone: String,
      role: String,
      specialization: String,
      availability: [String],
      isApproved: Boolean,
      approvedBy: mongoose.Schema.Types.ObjectId,
      approvedAt: Date,
      createdAt: Date
    });

    // Step 1: Add isApproved field to all existing users
    console.log('\n📝 Updating existing users...');
    
    // Auto-approve existing customers and admins
    const customersUpdated = await User.updateMany(
      { 
        role: { $in: ['customer', 'admin'] },
        isApproved: { $exists: false }
      },
      { 
        $set: { 
          isApproved: true
        }
      }
    );
    console.log(`✅ Approved ${customersUpdated.modifiedCount} customers/admins`);

    // Set existing staff to pending (they need manual approval)
    const staffUpdated = await User.updateMany(
      { 
        role: 'staff',
        isApproved: { $exists: false }
      },
      { 
        $set: { 
          isApproved: false  // Require admin to approve existing staff
        }
      }
    );
    console.log(`⏳ Set ${staffUpdated.modifiedCount} existing staff to pending approval`);

    // Step 2: Show summary
    console.log('\n📊 Database Summary:');
    
    const totalUsers = await User.countDocuments();
    const approvedUsers = await User.countDocuments({ isApproved: true });
    const pendingStaff = await User.countDocuments({ role: 'staff', isApproved: false });
    
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Approved Users: ${approvedUsers}`);
    console.log(`Pending Staff: ${pendingStaff}`);

    // Step 3: List pending staff (if any)
    if (pendingStaff > 0) {
      console.log('\n👥 Pending Staff Members:');
      const pending = await User.find({ role: 'staff', isApproved: false })
        .select('name email phone');
      
      pending.forEach(staff => {
        console.log(`  - ${staff.name} (${staff.email})`);
      });
      
      console.log('\n💡 These staff members need admin approval at /staff-approve');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
console.log('🚀 Starting database migration...\n');
migrateUsers();
