const express = require('express');
const {
  getCourts,
  createCourt,
  getCourtById,
  updateCourt,
  deleteCourt,
} = require('../controllers/courtController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requirePermission('view_courts'), getCourts);
router.post('/', protect, requirePermission('manage_courts'), createCourt);
router.get('/:id', protect, requirePermission('view_courts'), getCourtById);
router.put('/:id', protect, requirePermission('manage_courts'), updateCourt);
router.delete('/:id', protect, requirePermission('manage_courts'), deleteCourt);

module.exports = router;
