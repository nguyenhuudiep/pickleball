const express = require('express');
const {
  getMembers,
  createMember,
  getMemberById,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requirePermission('view_members'), getMembers);
router.post('/', protect, requirePermission('manage_members'), createMember);
router.get('/:id', protect, requirePermission('view_members'), getMemberById);
router.put('/:id', protect, requirePermission('manage_members'), updateMember);
router.delete('/:id', protect, requirePermission('manage_members'), deleteMember);

module.exports = router;
