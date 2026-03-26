const express = require('express');
const {
  getMembers,
  getPublicMembers,
  createMember,
  getMemberById,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/public', getPublicMembers);
router.get('/', protect, requirePermission('view_members'), getMembers);
router.post('/', protect, requirePermission('manage_members'), createMember);
router.get('/:id', protect, requirePermission('view_members'), getMemberById);
router.put('/:id', protect, requirePermission('manage_members'), updateMember);
router.delete('/:id', protect, requirePermission('manage_members'), deleteMember);

module.exports = router;
