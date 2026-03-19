const express = require('express');
const { Op } = require('sequelize');
const { protect, requirePermission } = require('../middleware/auth');
const { Member, Booking, Financial } = require('../models');

const router = express.Router();

const buildRange = (startDate, endDate) => {
  const range = {};

  if (startDate) {
    range[Op.gte] = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range[Op.lte] = end;
  }

  return Reflect.ownKeys(range).length ? range : null;
};

router.get('/stats', protect, requirePermission('view_dashboard'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const range = buildRange(startDate, endDate);

    const bookingQuery = range ? { bookingDate: range } : {};
    const financialQuery = range ? { date: range } : {};

    const [totalMembers, activeMembers, totalBookings, totalIncomeRaw, totalExpensesRaw] = await Promise.all([
      Member.count(),
      Member.count({ where: { status: 'active' } }),
      Booking.count({ where: bookingQuery }),
      Financial.sum('amount', { where: { ...financialQuery, type: 'income' } }),
      Financial.sum('amount', { where: { ...financialQuery, type: 'expense' } }),
    ]);

    const totalIncome = Number(totalIncomeRaw || 0);
    const totalExpenses = Number(totalExpensesRaw || 0);

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
