const Financial = require('../models/Financial');

const buildDateQuery = (startDate, endDate) => {
  if (!startDate && !endDate) return {};

  const dateQuery = {};

  if (startDate) {
    dateQuery.$gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery.$lte = end;
  }

  return { date: dateQuery };
};

exports.getFinancials = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const query = buildDateQuery(startDate, endDate);

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    const financials = await Financial.find(query).populate('bookingId').sort({ date: -1 });
    res.status(200).json({ success: true, financials });
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
      amount,
      paymentMethod,
      bookingId,
      date,
    });

    res.status(201).json({ success: true, financial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFinancial = async (req, res) => {
  try {
    const { type, category, description, amount, paymentMethod, bookingId, date } = req.body;

    const financial = await Financial.findByIdAndUpdate(
      req.params.id,
      {
        type,
        category,
        description,
        amount,
        paymentMethod,
        bookingId,
        date,
      },
      { new: true, runValidators: true }
    );

    if (!financial) {
      return res.status(404).json({ success: false, message: 'Bản ghi tài chính không tồn tại' });
    }

    res.status(200).json({ success: true, financial, message: 'Cập nhật bản ghi tài chính thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFinancial = async (req, res) => {
  try {
    const financial = await Financial.findByIdAndDelete(req.params.id);

    if (!financial) {
      return res.status(404).json({ success: false, message: 'Bản ghi tài chính không tồn tại' });
    }

    res.status(200).json({ success: true, message: 'Xóa bản ghi tài chính thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const query = buildDateQuery(startDate, endDate);
    const typeFilter = type && ['income', 'expense'].includes(type) ? type : null;

    const income = await Financial.aggregate([
      { $match: { ...query, ...(typeFilter ? { type: typeFilter } : { type: 'income' }) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const expenses = await Financial.aggregate([
      { $match: { ...query, ...(typeFilter ? { type: typeFilter } : { type: 'expense' }) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const monthlyData = await Financial.aggregate([
      { $match: { ...query, ...(typeFilter ? { type: typeFilter } : {}) } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      income: income[0]?.total || 0,
      expenses: expenses[0]?.total || 0,
      profit: (income[0]?.total || 0) - (expenses[0]?.total || 0),
      monthlyData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
