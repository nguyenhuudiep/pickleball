import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { bookingAPI, memberAPI, courtAPI } from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;

export const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState([]);
  const [courts, setCourts] = useState([]);
  const [formData, setFormData] = useState({
    memberId: '',
    courtId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    duration: '',
    price: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookRes, memRes, courtRes] = await Promise.all([
        bookingAPI.getAll(),
        memberAPI.getAll(),
        courtAPI.getAll(),
      ]);
      setBookings(bookRes.data.bookings);
      setMembers(memRes.data.members);
      setCourts(courtRes.data.courts);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bookingAPI.create(formData);
      setFormData({
        memberId: '',
        courtId: '',
        bookingDate: '',
        startTime: '',
        endTime: '',
        duration: '',
        price: '',
      });
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

  const memberOptions = [
    { value: '', label: 'Chọn thành viên' },
    ...members.map((member) => ({ value: member._id, label: member.name })),
  ];

  const courtOptions = [
    { value: '', label: 'Chọn sân' },
    ...courts.map((court) => ({ value: court._id, label: court.name })),
  ];

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thành Viên</label>
                  <AppSelect
                    options={memberOptions}
                    value={getSelectedOption(memberOptions, formData.memberId)}
                    onChange={(selected) => setFormData({ ...formData, memberId: selected?.value || '' })}
                    isSearchable
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
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thời Lượng (giờ)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giá ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input"
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
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Thành Viên</th>
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
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{booking.memberId?.name}</td>
                    <td className="py-3 px-4">{booking.courtId?.name}</td>
                    <td className="py-3 px-4">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{booking.startTime} - {booking.endTime}</td>
                    <td className="py-3 px-4">{booking.duration}h</td>
                    <td className="py-3 px-4 font-semibold">${booking.price}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};
