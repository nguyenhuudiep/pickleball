const express = require('express');
const {
  getFinancials,
  createFinancial,
  updateFinancial,
  deleteFinancial,
  getFinancialStats,
} = require('../controllers/financialController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requirePermission('view_financial'), getFinancials);
router.post('/', protect, requirePermission('manage_financial'), createFinancial);
router.put('/:id', protect, requirePermission('manage_financial'), updateFinancial);
router.delete('/:id', protect, requirePermission('manage_financial'), deleteFinancial);
router.get('/stats/monthly', protect, requirePermission('view_financial'), getFinancialStats);

module.exports = router;
