const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  phone: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Reset user
const resetUser = async () => {
  try {
    // Delete existing user
    const deletedUser = await User.deleteOne({ username: 'diepnh' });
    console.log(`✅ Deleted ${deletedUser.deletedCount} existing user(s)`);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('TrucNhi3103', salt);

    // Create user
    const user = new User({
      name: 'Diep Nhat Ha',
      username: 'diepnh',
      password: hashedPassword,
      role: 'admin',
      phone: '',
      active: true,
    });

    await user.save();
    console.log('✅ User created successfully:');
    console.log('   Username: diepnh');
    console.log('   Password: TrucNhi3103');
    console.log('   Role: admin');
    console.log('\n📝 Now you can login at http://localhost:3002');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

connectDB().then(() => resetUser());
