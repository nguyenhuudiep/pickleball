const express = require('express');
const { getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Get all users (admin only)
router.get('/', requirePermission('manage_users'), getAllUsers);

// Get user by id
router.get('/:id', requirePermission('manage_users'), getUserById);

// Update user data (admin only)
router.put('/:id', requirePermission('manage_users'), updateUser);

// Delete user (admin only)
router.delete('/:id', requirePermission('manage_users'), deleteUser);

module.exports = router;
