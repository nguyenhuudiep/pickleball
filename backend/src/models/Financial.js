const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: String,
    amount: {
      type: Number,
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'other'],
      default: 'cash',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Financial', financialSchema);
