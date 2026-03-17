const Court = require('../models/Court');

exports.getCourts = async (req, res) => {
  try {
    const courts = await Court.find();
    res.status(200).json({ success: true, courts });
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

    res.status(201).json({ success: true, court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    res.status(200).json({ success: true, court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    res.status(200).json({ success: true, court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndDelete(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    res.status(200).json({ success: true, message: 'Court deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
