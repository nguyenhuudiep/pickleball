const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, sequelize } = require('./src/config/database');
const User = require('./src/models/User');

const adminPermissions = [
  'view_dashboard',
  'view_members',
  'manage_members',
  'view_courts',
  'manage_courts',
  'view_bookings',
  'create_bookings',
  'edit_bookings',
  'delete_bookings',
  'view_financial',
  'manage_financial',
  'view_tournaments',
  'manage_tournaments',
  'view_reports',
  'manage_users',
];

// Create user
const createUser = async () => {
  try {
    await connectDB();

    const existingUser = await User.findOne({ where: { username: 'diepnh' } });
    if (existingUser) {
      console.log('❌ User diepnh already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Diep Nhat Ha',
      username: 'diepnh',
      password: 'TrucNhi3103',
      role: 'admin',
      permissions: adminPermissions,
      phone: '',
      active: true,
    });

    console.log('✅ User created successfully:');
    console.log('   Username: diepnh');
    console.log('   Password: TrucNhi3103');
    console.log('   Role: admin');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createUser();
