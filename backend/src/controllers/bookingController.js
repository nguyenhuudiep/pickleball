const { Booking, Member, Court } = require('../models');
const { Op } = require('sequelize');
const { withMongoId } = require('../utils/apiMapper');

const toDateTime = (bookingDate, timeValue) => {
  if (!bookingDate || !timeValue) return null;
  const normalizedTime = String(timeValue).slice(0, 5);
  const parsed = new Date(`${bookingDate}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateDurationHours = (startDateTime, endDateTime) => {
  if (!startDateTime || !endDateTime) return 0;
  return (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
};

const toDateOnlyString = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const markOverdueBookingsCompleted = async () => {
  const now = new Date();
  const activeBookings = await Booking.findAll({
    where: {
      status: {
        [Op.in]: ['pending', 'confirmed'],
      },
    },
    attributes: ['id', 'bookingDate', 'endTime', 'status'],
  });

  const overdueBookingIds = activeBookings
    .filter((booking) => {
      const bookingDate = toDateOnlyString(booking.bookingDate);
      const endDateTime = toDateTime(bookingDate, booking.endTime);
      return endDateTime && endDateTime < now;
    })
    .map((booking) => booking.id);

  if (overdueBookingIds.length > 0) {
    await Booking.update(
      { status: 'completed' },
      {
        where: {
          id: {
            [Op.in]: overdueBookingIds,
          },
        },
      }
    );
  }
};

const mapBookingRecord = (record) => {
  const mapped = withMongoId(record);
  if (!mapped) return mapped;

  if (mapped.member) {
    mapped.memberId = withMongoId(mapped.member);
    delete mapped.member;
  } else {
    mapped.memberId = null;
  }

  if (mapped.court) {
    mapped.courtId = withMongoId(mapped.court);
    delete mapped.court;
  } else {
    mapped.courtId = null;
  }

  return mapped;
};

exports.getBookings = async (req, res) => {
  try {
    await markOverdueBookingsCompleted();

    const bookings = await Booking.findAll({
      include: [
        { model: Member, as: 'member', required: false },
        { model: Court, as: 'court', required: false },
      ],
      order: [['bookingDate', 'DESC'], ['startTime', 'ASC']],
    });

    res.status(200).json({ success: true, bookings: bookings.map(mapBookingRecord) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      memberId,
      bookerName,
      courtId,
      bookingDate,
      startTime,
      endTime,
      duration,
      price,
    } = req.body;

    const normalizedBookerName = String(bookerName || '').trim();
    if (!normalizedBookerName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên người đặt sân' });
    }

    const selectedCourt = await Court.findByPk(Number(courtId));
    if (!selectedCourt) {
      return res.status(400).json({ success: false, message: 'Sân không hợp lệ' });
    }

    const startDateTime = toDateTime(bookingDate, startTime);
    const endDateTime = toDateTime(bookingDate, endTime);
    const now = new Date();

    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ success: false, message: 'Ngày hoặc thời gian không hợp lệ' });
    }

    if (startDateTime < now || endDateTime < now) {
      return res.status(400).json({ success: false, message: 'Giờ bắt đầu và kết thúc phải ở tương lai' });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu' });
    }

    const computedDuration = calculateDurationHours(startDateTime, endDateTime);
    const resolvedDuration = Number(duration || computedDuration);
    const resolvedPrice = Number(price || (resolvedDuration * Number(selectedCourt.hourlyRate || 0)));

    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      return res.status(400).json({ success: false, message: 'Thời lượng đặt sân không hợp lệ' });
    }

    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
      return res.status(400).json({ success: false, message: 'Giá đặt sân không hợp lệ' });
    }

    const booking = await Booking.create({
      memberId: memberId ? Number(memberId) : null,
      bookerName: normalizedBookerName,
      courtId: Number(courtId),
      bookingDate,
      startTime: String(startTime).slice(0, 5),
      endTime: String(endTime).slice(0, 5),
      duration: resolvedDuration,
      price: resolvedPrice,
    });

    if (memberId) {
      const selectedMember = await Member.findByPk(Number(memberId));
      if (selectedMember) {
        await selectedMember.update({
          totalBookings: Number(selectedMember.totalBookings || 0) + 1,
          totalSpent: Number(selectedMember.totalSpent || 0) + resolvedPrice,
        });
      }
    }

    const createdBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: Member, as: 'member', required: false },
        { model: Court, as: 'court', required: false },
      ],
    });

    res.status(201).json({ success: true, booking: mapBookingRecord(createdBooking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch đặt sân' });
    }

    const updatedData = { ...req.body };

    if (Object.prototype.hasOwnProperty.call(updatedData, 'status') && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền xác nhận trạng thái đặt sân' });
    }

    if (Object.prototype.hasOwnProperty.call(updatedData, 'bookerName')) {
      updatedData.bookerName = String(updatedData.bookerName || '').trim();
      if (!updatedData.bookerName) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên người đặt sân' });
      }
    }

    const effectiveBookingDate = updatedData.bookingDate || booking.bookingDate;
    const effectiveStartTime = updatedData.startTime || booking.startTime;
    const effectiveEndTime = updatedData.endTime || booking.endTime;

    const startDateTime = toDateTime(
      typeof effectiveBookingDate === 'string'
        ? effectiveBookingDate
        : new Date(effectiveBookingDate).toISOString().slice(0, 10),
      effectiveStartTime
    );
    const endDateTime = toDateTime(
      typeof effectiveBookingDate === 'string'
        ? effectiveBookingDate
        : new Date(effectiveBookingDate).toISOString().slice(0, 10),
      effectiveEndTime
    );

    if (startDateTime && endDateTime) {
      if (endDateTime <= startDateTime) {
        return res.status(400).json({ success: false, message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu' });
      }

      const computedDuration = calculateDurationHours(startDateTime, endDateTime);
      if (!Object.prototype.hasOwnProperty.call(updatedData, 'duration')) {
        updatedData.duration = computedDuration;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatedData, 'courtId')) {
      const selectedCourt = await Court.findByPk(Number(updatedData.courtId));
      if (!selectedCourt) {
        return res.status(400).json({ success: false, message: 'Sân không hợp lệ' });
      }
      updatedData.courtId = Number(updatedData.courtId);
    }

    if (Object.prototype.hasOwnProperty.call(updatedData, 'memberId')) {
      updatedData.memberId = updatedData.memberId ? Number(updatedData.memberId) : null;
    }

    await booking.update(updatedData);

    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: Member, as: 'member', required: false },
        { model: Court, as: 'court', required: false },
      ],
    });

    res.status(200).json({ success: true, booking: mapBookingRecord(fullBooking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch đặt sân' });
    }

    await booking.destroy();

    res.status(200).json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
