const Court = require('../models/Court');
const { withMongoId, withMongoIdList } = require('../utils/apiMapper');

exports.getCourts = async (req, res) => {
  try {
    const courts = await Court.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, courts: withMongoIdList(courts) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCourt = async (req, res) => {
  try {
    const { name, courtNumber, surface, lights, hourlyRate } = req.body;

    const court = await Court.create({
      name,
      courtNumber,
      surface,
      lights,
      hourlyRate,
    });

    res.status(201).json({ success: true, court: withMongoId(court) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findByPk(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    res.status(200).json({ success: true, court: withMongoId(court) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findByPk(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }

    await court.update(req.body);
    res.status(200).json({ success: true, court: withMongoId(court) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findByPk(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }

    await court.destroy();
    res.status(200).json({ success: true, message: 'Court deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
