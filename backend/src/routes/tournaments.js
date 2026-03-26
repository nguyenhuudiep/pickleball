const express = require('express');
const {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentParticipants,
  deleteTournament,
  getMemberTournamentHistory,
  getPublicMemberTournamentHistory,
} = require('../controllers/tournamentController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/public/member/:memberId', getPublicMemberTournamentHistory);
router.get('/', protect, requirePermission('view_tournaments'), getTournaments);
router.get('/:id', protect, requirePermission('view_tournaments'), getTournamentById);
router.post('/', protect, requirePermission('manage_tournaments'), createTournament);
router.get('/member/:memberId', protect, requirePermission('view_tournaments'), getMemberTournamentHistory);
router.put('/:id/participants', protect, requirePermission('manage_tournaments'), updateTournamentParticipants);
router.put('/:id', protect, requirePermission('manage_tournaments'), updateTournament);
router.delete('/:id', protect, requirePermission('manage_tournaments'), deleteTournament);

module.exports = router;
