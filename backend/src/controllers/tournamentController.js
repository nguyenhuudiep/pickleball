const { Tournament, TournamentParticipant, Member } = require('../models');
const { withMongoId } = require('../utils/apiMapper');

const tournamentInclude = [
  {
    model: TournamentParticipant,
    as: 'participants',
    required: false,
    include: [
      {
        model: Member,
        as: 'member',
        required: false,
        attributes: ['id', 'name', 'username', 'skillLevel'],
      },
    ],
  },
];

const normalizeParticipantsPayload = (participants = []) => {
  const incoming = Array.isArray(participants) ? participants : [];
  const memberIds = new Set(incoming.map((item) => Number(item.memberId)).filter((id) => Number.isFinite(id)));

  return incoming
    .map((participant) => {
      const memberId = Number(participant.memberId);
      if (!Number.isFinite(memberId)) {
        return null;
      }

      const partnerMemberIdRaw = participant.partnerMemberId ? Number(participant.partnerMemberId) : null;
      const partnerMemberId = partnerMemberIdRaw && memberIds.has(partnerMemberIdRaw) && partnerMemberIdRaw !== memberId
        ? partnerMemberIdRaw
        : null;

      return {
        memberId,
        partnerMemberId,
        rank: participant.rank || null,
        result: participant.result || '',
        isDoublesParticipant: Boolean(participant.isDoublesParticipant),
        feePaid: Boolean(participant.feePaid),
        feeAmount: Number(participant.feeAmount || 0),
      };
    })
    .filter(Boolean);
};

const mapTournament = (record) => {
  const mapped = withMongoId(record);
  if (!mapped) return mapped;

  const participants = (mapped.participants || []).map((participant) => {
    const mappedParticipant = withMongoId(participant);
    const member = participant.member ? withMongoId(participant.member) : null;

    return {
      ...mappedParticipant,
      memberId: member || String(participant.memberId),
    };
  });

  return {
    ...mapped,
    participants,
  };
};

exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.findAll({
      include: tournamentInclude,
      order: [['date', 'DESC']],
    });

    res.status(200).json({ success: true, tournaments: tournaments.map(mapTournament) });
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
    });

    const incomingParticipants = normalizeParticipantsPayload(participants);
    for (const participant of incomingParticipants) {
      await TournamentParticipant.create({
        tournamentId: tournament.id,
        memberId: participant.memberId,
        partnerMemberId: participant.partnerMemberId,
        rank: participant.rank || null,
        result: participant.result || '',
        isDoublesParticipant: Boolean(participant.isDoublesParticipant),
        feePaid: Boolean(participant.feePaid),
        feeAmount: Number(participant.feeAmount || 0),
      });
    }

    const fullTournament = await Tournament.findByPk(tournament.id, {
      include: tournamentInclude,
    });

    res.status(201).json({ success: true, tournament: mapTournament(fullTournament) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const { name, date, location, description, participants } = req.body;

    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    await tournament.update({ name, date, location, description });

    await TournamentParticipant.destroy({ where: { tournamentId: tournament.id } });

    const incomingParticipants = normalizeParticipantsPayload(participants);
    for (const participant of incomingParticipants) {
      await TournamentParticipant.create({
        tournamentId: tournament.id,
        memberId: participant.memberId,
        partnerMemberId: participant.partnerMemberId,
        rank: participant.rank || null,
        result: participant.result || '',
        isDoublesParticipant: Boolean(participant.isDoublesParticipant),
        feePaid: Boolean(participant.feePaid),
        feeAmount: Number(participant.feeAmount || 0),
      });
    }

    const fullTournament = await Tournament.findByPk(tournament.id, {
      include: tournamentInclude,
    });

    res.status(200).json({
      success: true,
      tournament: mapTournament(fullTournament),
      message: 'Cập nhật giải đấu thành công',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: tournamentInclude,
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    res.status(200).json({ success: true, tournament: mapTournament(tournament) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTournamentParticipants = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    const incomingParticipants = normalizeParticipantsPayload(req.body?.participants);

    await TournamentParticipant.destroy({ where: { tournamentId: tournament.id } });

    for (const participant of incomingParticipants) {
      await TournamentParticipant.create({
        tournamentId: tournament.id,
        memberId: participant.memberId,
        partnerMemberId: participant.partnerMemberId,
        rank: participant.rank,
        result: participant.result,
        isDoublesParticipant: participant.isDoublesParticipant,
        feePaid: participant.feePaid,
        feeAmount: participant.feeAmount,
      });
    }

    const fullTournament = await Tournament.findByPk(tournament.id, {
      include: tournamentInclude,
    });

    res.status(200).json({
      success: true,
      tournament: mapTournament(fullTournament),
      message: 'Cập nhật danh sách vận động viên thành công',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    await TournamentParticipant.destroy({ where: { tournamentId: tournament.id } });
    await tournament.destroy();

    res.status(200).json({ success: true, message: 'Xóa giải đấu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMemberTournamentHistory = async (req, res) => {
  try {
    const memberId = Number(req.params.memberId);

    const tournaments = await Tournament.findAll({
      include: [
        {
          model: TournamentParticipant,
          as: 'participants',
          required: true,
          where: { memberId },
          include: [
            {
              model: Member,
              as: 'member',
              required: false,
              attributes: ['id', 'name', 'username', 'skillLevel'],
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.status(200).json({ success: true, tournaments: tournaments.map(mapTournament) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicMemberTournamentHistory = async (req, res) => {
  try {
    const memberId = Number(req.params.memberId);

    const tournaments = await Tournament.findAll({
      attributes: ['id', 'name', 'date', 'location'],
      include: [
        {
          model: TournamentParticipant,
          as: 'participants',
          required: true,
          where: { memberId },
          attributes: ['id', 'memberId', 'rank', 'result'],
          include: [
            {
              model: Member,
              as: 'member',
              required: false,
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.status(200).json({ success: true, tournaments: tournaments.map(mapTournament) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
