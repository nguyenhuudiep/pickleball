const Tournament = require('../models/Tournament');

exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('participants.memberId', 'name username skillLevel')
      .sort({ date: -1 });

    res.status(200).json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTournament = async (req, res) => {
  try {
    const { name, date, location, description, participants } = req.body;

    const tournament = await Tournament.create({
      name,
      date,
      location,
      description,
      participants: participants || [],
    });

    res.status(201).json({ success: true, tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const { name, date, location, description, participants } = req.body;

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      {
        name,
        date,
        location,
        description,
        participants: participants || [],
      },
      { new: true, runValidators: true }
    ).populate('participants.memberId', 'name username skillLevel');

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    res.status(200).json({ success: true, tournament, message: 'Cập nhật giải đấu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    res.status(200).json({ success: true, message: 'Xóa giải đấu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMemberTournamentHistory = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ 'participants.memberId': req.params.memberId })
      .populate('participants.memberId', 'name username skillLevel')
      .sort({ date: -1 });

    res.status(200).json({ success: true, tournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
