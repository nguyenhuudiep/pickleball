const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Financial, Booking } = require('../models');
const { withMongoId, withMongoIdList } = require('../utils/apiMapper');

const buildDateQuery = (startDate, endDate) => {
  const dateQuery = {};

  if (startDate) {
    dateQuery[Op.gte] = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery[Op.lte] = end;
  }

  return Reflect.ownKeys(dateQuery).length ? { date: dateQuery } : {};
};

const mapFinancialRecord = (record) => {
  const mapped = withMongoId(record);
  if (!mapped) return mapped;

  if (mapped.booking) {
    mapped.bookingId = withMongoId(mapped.booking);
    delete mapped.booking;
  }

  return mapped;
};

exports.getFinancials = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const where = buildDateQuery(startDate, endDate);

    if (type && ['income', 'expense'].includes(type)) {
      where.type = type;
    }

    const financials = await Financial.findAll({
      where,
      include: [{ model: Booking, as: 'booking', required: false }],
      order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true,
      financials: financials.map(mapFinancialRecord),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFinancial = async (req, res) => {
  try {
    const { type, category, description, amount, paymentMethod, bookingId, date } = req.body;

    const financial = await Financial.create({
      type,
      category,
      description,
      amount: Number(amount || 0),
      paymentMethod,
      bookingId: bookingId ? Number(bookingId) : null,
      date,
    });

    res.status(201).json({ success: true, financial: withMongoId(financial) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFinancial = async (req, res) => {
  try {
    const { type, category, description, amount, paymentMethod, bookingId, date } = req.body;

    const financial = await Financial.findByPk(req.params.id);

    if (!financial) {
      return res.status(404).json({ success: false, message: 'Bản ghi tài chính không tồn tại' });
    }

    await financial.update({
      type,
      category,
      description,
      amount: Number(amount || 0),
      paymentMethod,
      bookingId: bookingId ? Number(bookingId) : null,
      date,
    });

    res.status(200).json({
      success: true,
      financial: withMongoId(financial),
      message: 'Cập nhật bản ghi tài chính thành công',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFinancial = async (req, res) => {
  try {
    const financial = await Financial.findByPk(req.params.id);

    if (!financial) {
      return res.status(404).json({ success: false, message: 'Bản ghi tài chính không tồn tại' });
    }

    await financial.destroy();

    res.status(200).json({ success: true, message: 'Xóa bản ghi tài chính thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const dateWhere = buildDateQuery(startDate, endDate);
    const typeFilter = type && ['income', 'expense'].includes(type) ? type : null;

    const [incomeTotal, expenseTotal] = await Promise.all([
      Financial.sum('amount', { where: { ...dateWhere, type: 'income' } }),
      Financial.sum('amount', { where: { ...dateWhere, type: 'expense' } }),
    ]);

    const whereSql = [];
    const replacements = {};

    if (startDate) {
      whereSql.push('[date] >= :startDate');
      replacements.startDate = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereSql.push('[date] <= :endDate');
      replacements.endDate = end;
    }

    if (typeFilter) {
      whereSql.push('[type] = :typeFilter');
      replacements.typeFilter = typeFilter;
    }

    const monthlyData = await sequelize.query(
      `
      SELECT
        FORMAT([date], 'yyyy-MM') AS [_id],
        SUM(CASE WHEN [type] = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN [type] = 'expense' THEN amount ELSE 0 END) AS expense
      FROM financials
      ${whereSql.length ? `WHERE ${whereSql.join(' AND ')}` : ''}
      GROUP BY FORMAT([date], 'yyyy-MM')
      ORDER BY [_id] ASC
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const income = typeFilter === 'expense' ? 0 : Number(incomeTotal || 0);
    const expenses = typeFilter === 'income' ? 0 : Number(expenseTotal || 0);

    res.status(200).json({
      success: true,
      income,
      expenses,
      profit: income - expenses,
      monthlyData: monthlyData.map((row) => ({
        _id: row._id,
        income: Number(row.income || 0),
        expense: Number(row.expense || 0),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
