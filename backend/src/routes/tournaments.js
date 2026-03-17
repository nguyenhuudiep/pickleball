const express = require('express');
const {
  getTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  getMemberTournamentHistory,
} = require('../controllers/tournamentController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requirePermission('view_tournaments'), getTournaments);
router.post('/', protect, requirePermission('manage_tournaments'), createTournament);
router.get('/member/:memberId', protect, requirePermission('view_tournaments'), getMemberTournamentHistory);
router.put('/:id', protect, requirePermission('manage_tournaments'), updateTournament);
router.delete('/:id', protect, requirePermission('manage_tournaments'), deleteTournament);

module.exports = router;
