const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    permissions: {
      type: [String],
      enum: [
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
      ],
      default: ['view_bookings', 'create_bookings', 'view_tournaments'],
    },
    phone: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
