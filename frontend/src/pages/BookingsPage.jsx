import { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, courtAPI } from '../services/api';
import { CheckCircle2, Plus, Edit2, Trash2 } from 'lucide-react';

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;
const AUTO_REFRESH_INTERVAL_MS = 15000;
const PAGE_SIZE = 10;
const normalizeId = (value) => (value === null || value === undefined || value === '' ? '' : String(value));
const statusFilterOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeInput = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getNowContext = () => {
  const now = new Date();
  return {
    today: formatDateInput(now),
    currentTime: formatTimeInput(now),
  };
};

const buildDateTime = (bookingDate, timeValue) => {
  if (!bookingDate || !timeValue) return null;
  const parsed = new Date(`${bookingDate}T${String(timeValue).slice(0, 5)}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractDateValue = (value) => {
  if (!value) return '';
  const asString = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(asString)) {
    return asString.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateInput(parsed);
};

const calculateDurationHours = (bookingDate, startTime, endTime) => {
  const startDateTime = buildDateTime(bookingDate, startTime);
  const endDateTime = buildDateTime(bookingDate, endTime);
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    return '';
  }

  const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  if (!Number.isFinite(hours) || hours <= 0) return '';

  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
};

const formatCurrencyVND = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `${amount.toLocaleString('vi-VN')} ₫`;
};

const formatCurrencyVNDDisplay = (value) => {
  const amount = Number(value || 0);
  return `${(Number.isFinite(amount) ? amount : 0).toLocaleString('vi-VN')} ₫`;
};

const getStatusLabel = (status) => {
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'completed') return 'Hoàn thành';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chờ xác nhận';
};

const getDefaultFormData = () => ({
  bookerName: '',
  courtId: '',
  bookingDate: getNowContext().today,
  startTime: '',
  endTime: '',
  duration: '',
  price: '',
});

const buildBookingsSignature = (bookings = []) => JSON.stringify(
  (Array.isArray(bookings) ? bookings : []).map((booking) => [
    booking._id,
    booking.bookerName,
    booking.courtId?._id || booking.courtId,
    booking.bookingDate,
    booking.startTime,
    booking.endTime,
    booking.status,
    booking.updatedAt,
  ])
);

export const BookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [courts, setCourts] = useState([]);
  const [listFilters, setListFilters] = useState({
    bookingDate: getNowContext().today,
    courtId: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(getDefaultFormData());
  const isFetchingRef = useRef(false);
  const lastSignatureRef = useRef('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const refreshData = () => fetchData({ silent: true });
    const handleFocus = () => fetchData({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData({ silent: true });
      }
    };

    const intervalId = window.setInterval(refreshData, AUTO_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const nextDuration = calculateDurationHours(formData.bookingDate, formData.startTime, formData.endTime);
    setFormData((previous) => {
      if (previous.duration === nextDuration) return previous;
      return { ...previous, duration: nextDuration };
    });
  }, [formData.bookingDate, formData.startTime, formData.endTime]);

  const fetchData = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const [bookRes, courtRes] = await Promise.all([
        bookingAPI.getAll(),
        courtAPI.getAll(),
      ]);
      const nextBookings = bookRes.data.bookings || [];
      const nextSignature = buildBookingsSignature(nextBookings);
      if (nextSignature !== lastSignatureRef.current) {
        lastSignatureRef.current = nextSignature;
        setBookings(nextBookings);
      }
      setCourts(courtRes.data.courts);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const validateBookingTime = () => {
    const now = new Date();
    const startDateTime = buildDateTime(formData.bookingDate, formData.startTime);
    const endDateTime = buildDateTime(formData.bookingDate, formData.endTime);

    if (!startDateTime || !endDateTime) {
      alert('Vui lòng nhập ngày và giờ hợp lệ.');
      return false;
    }

    if (startDateTime < now || endDateTime < now) {
      alert('Giờ bắt đầu và giờ kết thúc phải ở tương lai.');
      return false;
    }

    if (endDateTime <= startDateTime) {
      alert('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.bookerName.trim()) {
      alert('Vui lòng nhập tên người đặt sân.');
      return;
    }

    if (!formData.courtId) {
      alert('Vui lòng chọn sân.');
      return;
    }

    if (!validateBookingTime()) {
      return;
    }

    try {
      await bookingAPI.create({
        ...formData,
        courtId: Number(formData.courtId),
      });
      setFormData(getDefaultFormData());
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đặt sân này?')) {
      try {
        await bookingAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      await bookingAPI.update(bookingId, { status: 'confirmed' });
      fetchData();
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert(error.response?.data?.message || 'Không thể xác nhận lịch đặt sân');
    }
  };

  const courtOptions = [
    { value: '', label: 'Chọn sân' },
    ...courts.map((court) => ({ value: normalizeId(court._id || court.id), label: court.name })),
  ];

  const courtFilterOptions = [
    { value: '', label: 'Tất cả sân' },
    ...courts.map((court) => ({ value: normalizeId(court._id || court.id), label: court.name })),
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDateValue = extractDateValue(booking.bookingDate);
      const bookingCourtId = normalizeId(booking.courtId?._id || booking.courtId?.id || booking.courtId);
      const bookingStatus = String(booking.status || '');

      if (listFilters.bookingDate && bookingDateValue !== listFilters.bookingDate) {
        return false;
      }

      if (listFilters.courtId && bookingCourtId !== listFilters.courtId) {
        return false;
      }

      if (listFilters.status && bookingStatus !== listFilters.status) {
        return false;
      }

      return true;
    });
  }, [bookings, listFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [listFilters.bookingDate, listFilters.courtId, listFilters.status]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const nowContext = getNowContext();
  const minTimeForSelectedDate = formData.bookingDate === nowContext.today ? nowContext.currentTime : undefined;
  const canConfirmBooking = user?.role === 'admin';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Đặt Sân</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Đặt Sân Mới
          </button>
        </div>

        {showForm && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên Người Đặt</label>
                  <input
                    type="text"
                    value={formData.bookerName}
                    onChange={(e) => setFormData({ ...formData, bookerName: e.target.value })}
                    className="input"
                    placeholder="Nhập tên người đặt sân"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sân</label>
                  <AppSelect
                    options={courtOptions}
                    value={getSelectedOption(courtOptions, formData.courtId)}
                    onChange={(selected) => setFormData({ ...formData, courtId: selected?.value || '' })}
                    isSearchable
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày Đặt</label>
                  <input
                    type="date"
                    value={formData.bookingDate}
                    onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    min={nowContext.today}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giờ Bắt Đầu</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    min={minTimeForSelectedDate}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giờ Kết Thúc</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    min={minTimeForSelectedDate}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thời Lượng (giờ)</label>
                  <input
                    type="text"
                    value={formData.duration}
                    className="input bg-gray-50"
                    readOnly
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giá ($)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyVND(formData.price)}
                    onChange={(e) => {
                      const rawNumber = Number(String(e.target.value || '').replace(/[^\d]/g, ''));
                      setFormData({
                        ...formData,
                        price: Number.isFinite(rawNumber) && rawNumber > 0 ? rawNumber : '',
                      });
                    }}
                    className="input border-red-400 text-red-700 font-semibold focus:ring-red-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">Lưu Đặt Sân</button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Đang tải đặt sân...</p>
        ) : (
          <div className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày đặt</label>
                <input
                  type="date"
                  value={listFilters.bookingDate}
                  onChange={(e) => setListFilters((prev) => ({ ...prev, bookingDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sân</label>
                <AppSelect
                  options={courtFilterOptions}
                  value={getSelectedOption(courtFilterOptions, listFilters.courtId)}
                  onChange={(selected) => setListFilters((prev) => ({ ...prev, courtId: selected?.value || '' }))}
                  isSearchable
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <AppSelect
                  options={statusFilterOptions}
                  value={getSelectedOption(statusFilterOptions, listFilters.status)}
                  onChange={(selected) => setListFilters((prev) => ({ ...prev, status: selected?.value || '' }))}
                />
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() =>
                    setListFilters({
                      bookingDate: getNowContext().today,
                      courtId: '',
                      status: '',
                    })
                  }
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">STT</th>
                  <th className="text-left py-3 px-4">Người Đặt</th>
                  <th className="text-left py-3 px-4">Sân</th>
                  <th className="text-left py-3 px-4">Ngày</th>
                  <th className="text-left py-3 px-4">Giờ</th>
                  <th className="text-left py-3 px-4">Thời Lượng</th>
                  <th className="text-left py-3 px-4">Giá</th>
                  <th className="text-left py-3 px-4">Trạng Thái</th>
                  <th className="text-left py-3 px-4">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 px-4 text-center text-gray-500">
                      Không có lịch đặt sân phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((booking, index) => (
                    <tr key={booking._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{booking.bookerName || booking.memberId?.name || '-'}</td>
                      <td className="py-3 px-4">{booking.courtId?.name}</td>
                      <td className="py-3 px-4">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{booking.startTime} - {booking.endTime}</td>
                      <td className="py-3 px-4">{booking.duration}h</td>
                      <td className="py-3 px-4 font-semibold text-red-700">{formatCurrencyVNDDisplay(booking.price)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : booking.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {canConfirmBooking && booking.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmBooking(booking._id)}
                            className="text-green-600 hover:text-green-800 mr-2"
                            title="Xác nhận lịch đặt"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        <button className="text-teal-600 hover:text-teal-800 mr-2">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(booking._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredBookings.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-sm text-gray-600">Trang {currentPage}/{totalPages}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
