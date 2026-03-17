const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    courtNumber: {
      type: String,
      required: true,
      unique: true,
    },
    surface: {
      type: String,
      enum: ['hard', 'clay', 'indoor'],
      default: 'hard',
    },
    lights: {
      type: Boolean,
      default: false,
    },
    hourlyRate: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
    capacity: {
      type: Number,
      default: 4,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Court', courtSchema);
