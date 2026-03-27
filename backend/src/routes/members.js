const express = require('express');
const {
  getMembers,
  getMembersVersion,
  getPublicMembers,
  createMember,
  getMemberById,
  getMemberSkillHistory,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/public', getPublicMembers);
router.get('/', protect, requirePermission('view_members'), getMembers);
router.get('/version', protect, requirePermission('view_members'), getMembersVersion);
router.post('/', protect, requirePermission('manage_members'), createMember);
router.get('/:id', protect, requirePermission('view_members'), getMemberById);
router.get('/:id/skill-history', protect, requirePermission('view_members'), getMemberSkillHistory);
router.put('/:id', protect, requirePermission('manage_members'), updateMember);
router.delete('/:id', protect, requirePermission('manage_members'), deleteMember);

module.exports = router;
