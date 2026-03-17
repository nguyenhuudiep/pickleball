const express = require('express');
const {
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookingController');
const { protect, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requirePermission('view_bookings'), getBookings);
router.post('/', protect, requirePermission('create_bookings'), createBooking);
router.put('/:id', protect, requirePermission('edit_bookings'), updateBooking);
router.delete('/:id', protect, requirePermission('delete_bookings'), deleteBooking);

module.exports = router;
