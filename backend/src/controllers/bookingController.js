const Booking = require('../models/Booking');
const Member = require('../models/Member');
const Court = require('../models/Court');

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('memberId')
      .populate('courtId');
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { memberId, courtId, bookingDate, startTime, endTime, duration, price } = req.body;

    const booking = await Booking.create({
      memberId,
      courtId,
      bookingDate,
      startTime,
      endTime,
      duration,
      price,
    });

    // Update member stats
    await Member.findByIdAndUpdate(memberId, {
      $inc: { totalBookings: 1, totalSpent: price },
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
