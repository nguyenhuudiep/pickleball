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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseFinanceItems = (rawJson) => {
  if (!rawJson || typeof rawJson !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const normalizeFinanceItemsPayload = (items = []) => {
  const incoming = Array.isArray(items) ? items : [];

  return incoming
    .map((item) => {
      const description = String(item?.description || '').trim();
      const type = item?.type === 'expense' ? 'expense' : 'income';
      const amount = toNumber(item?.amount);

      if (!description && amount <= 0) {
        return null;
      }

      return {
        description: description || (type === 'income' ? 'Khoản thu' : 'Khoản chi'),
        type,
        amount,
      };
    })
    .filter(Boolean);
};

const getFinanceTotals = (items = []) => {
  const normalized = normalizeFinanceItemsPayload(items);
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const item of normalized) {
    if (item.type === 'expense') {
      expenseTotal += item.amount;
    } else {
      incomeTotal += item.amount;
    }
  }

  return {
    normalized,
    incomeTotal,
    expenseTotal,
  };
};

const getParticipantNumericMemberId = (participant) => {
  const rawMemberId = participant?.memberId?.id ?? participant?.memberId?._id ?? participant?.memberId;
  const parsed = Number(rawMemberId);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCollectedFeeAmount = (participants = []) => {
  const pairSeen = new Set();

  return participants.reduce((total, participant) => {
    if (!participant?.feePaid) {
      return total;
    }

    const feeAmount = toNumber(participant.feeAmount);
    const memberId = getParticipantNumericMemberId(participant);
    const partnerMemberId = toNumber(participant.partnerMemberId || 0);

    if (memberId && partnerMemberId) {
      const first = Math.min(memberId, partnerMemberId);
      const second = Math.max(memberId, partnerMemberId);
      const pairKey = `${first}-${second}`;
      if (pairSeen.has(pairKey)) {
        return total;
      }
      pairSeen.add(pairKey);
    }

    return total + feeAmount;
  }, 0);
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

  const collectedFeeAmount = getCollectedFeeAmount(participants);
  const financeItems = parseFinanceItems(mapped.financeItemsJson);
  const { normalized: normalizedFinanceItems, incomeTotal, expenseTotal } = getFinanceTotals(financeItems);

  const sponsorshipAmount = normalizedFinanceItems.length > 0 ? incomeTotal : toNumber(mapped.sponsorshipAmount);
  const expenseAmount = normalizedFinanceItems.length > 0 ? expenseTotal : toNumber(mapped.expenseAmount);

  return {
    ...mapped,
    expenseAmount,
    sponsorshipAmount,
    financeItems: normalizedFinanceItems,
    collectedFeeAmount,
    profitAmount: collectedFeeAmount + sponsorshipAmount - expenseAmount,
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
    const { name, date, location, description, participants, expenseAmount, sponsorshipAmount, financeItems } = req.body;
    const finance = getFinanceTotals(financeItems);
    const resolvedSponsorship = finance.normalized.length > 0 ? finance.incomeTotal : toNumber(sponsorshipAmount);
    const resolvedExpense = finance.normalized.length > 0 ? finance.expenseTotal : toNumber(expenseAmount);

    const tournament = await Tournament.create({
      name,
      date,
      location,
      description,
      expenseAmount: resolvedExpense,
      sponsorshipAmount: resolvedSponsorship,
      financeItemsJson: JSON.stringify(finance.normalized),
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
    const { name, date, location, description, participants, expenseAmount, sponsorshipAmount, financeItems } = req.body;
    const finance = getFinanceTotals(financeItems);
    const resolvedSponsorship = finance.normalized.length > 0 ? finance.incomeTotal : toNumber(sponsorshipAmount);
    const resolvedExpense = finance.normalized.length > 0 ? finance.expenseTotal : toNumber(expenseAmount);

    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    await tournament.update({
      name,
      date,
      location,
      description,
      expenseAmount: resolvedExpense,
      sponsorshipAmount: resolvedSponsorship,
      financeItemsJson: JSON.stringify(finance.normalized),
    });

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

exports.updateTournamentFinance = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Giải đấu không tồn tại' });
    }

    const finance = getFinanceTotals(req.body?.financeItems);
    const expenseAmount = finance.expenseTotal;
    const sponsorshipAmount = finance.incomeTotal;

    await tournament.update({
      expenseAmount,
      sponsorshipAmount,
      financeItemsJson: JSON.stringify(finance.normalized),
    });

    const fullTournament = await Tournament.findByPk(tournament.id, {
      include: tournamentInclude,
    });

    res.status(200).json({
      success: true,
      tournament: mapTournament(fullTournament),
      message: 'Cập nhật thu chi giải đấu thành công',
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
