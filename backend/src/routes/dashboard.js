const express = require('express');
const { protect, requirePermission } = require('../middleware/auth');
const Member = require('../models/Member');
const Booking = require('../models/Booking');
const Financial = require('../models/Financial');

const router = express.Router();

const buildRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;

  const range = {};
  if (startDate) {
    range.$gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return range;
};

router.get('/stats', protect, requirePermission('view_dashboard'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const range = buildRange(startDate, endDate);

    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: 'active' });
    const bookingQuery = range ? { bookingDate: range } : {};
    const totalBookings = await Booking.countDocuments(bookingQuery);

    const financialQuery = range ? { date: range } : {};

    const incomeResult = await Financial.aggregate([
      { $match: { ...financialQuery, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const expenseResult = await Financial.aggregate([
      { $match: { ...financialQuery, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        totalBookings,
        totalIncome,
        totalExpenses,
        profit: totalIncome - totalExpenses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
