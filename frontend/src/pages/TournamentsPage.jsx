import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { tournamentAPI } from '../services/api';
import { Edit2, Plus, Trash2, Users } from 'lucide-react';

const getDefaultFormData = () => ({
  name: '',
  date: new Date().toISOString().split('T')[0],
  location: '',
  description: '',
  expenseAmount: 0,
  sponsorshipAmount: 0,
  participants: [],
});

const formatCurrencyVND = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const AUTO_REFRESH_INTERVAL_MS = 15000;

const buildTournamentsSignature = (tournaments = []) => JSON.stringify(
  (Array.isArray(tournaments) ? tournaments : []).map((item) => [
    item._id,
    item.name,
    item.date,
    item.location,
    item.participants?.length || 0,
    item.updatedAt,
  ])
);

export const TournamentsPage = () => {
  const { hasPermission } = useAuth();
  const canManageTournaments = hasPermission('manage_tournaments');
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const tournamentsRes = await tournamentAPI.getAll();
      const nextTournaments = tournamentsRes.data.tournaments || [];
      const nextSignature = buildTournamentsSignature(nextTournaments);

      if (nextSignature !== lastSignatureRef.current) {
        lastSignatureRef.current = nextSignature;
        setTournaments(nextTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await tournamentAPI.update(editingId, formData);
      } else {
        await tournamentAPI.create(formData);
      }

      setFormData(getDefaultFormData());
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving tournament:', error);
    }
  };

  const handleEdit = (tournament) => {
    setEditingId(tournament._id);
    setShowForm(true);
    setFormData({
      name: tournament.name || '',
      date: tournament.date ? new Date(tournament.date).toISOString().split('T')[0] : getDefaultFormData().date,
      location: tournament.location || '',
      description: tournament.description || '',
      expenseAmount: Number(tournament.expenseAmount || 0),
      sponsorshipAmount: Number(tournament.sponsorshipAmount || 0),
      participants: tournament.participants || [],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giải đấu này?')) return;

    try {
      await tournamentAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(getDefaultFormData());
  };

  const estimatedProfit = Number(formData.sponsorshipAmount || 0) - Number(formData.expenseAmount || 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Giải Đấu</h1>
          {canManageTournaments && (
            <button
              onClick={() => {
                if (showForm) {
                  handleCancel();
                } else {
                  setShowForm(true);
                }
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              {showForm ? 'Đóng Form' : 'Thêm Giải Đấu'}
            </button>
          )}
        </div>

        {showForm && canManageTournaments && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên Giải Đấu</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày Thi Đấu</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Địa Điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Khoản Tài Trợ (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.sponsorshipAmount}
                    onChange={(e) => setFormData({ ...formData, sponsorshipAmount: Number(e.target.value || 0) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Khoản Chi (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.expenseAmount}
                    onChange={(e) => setFormData({ ...formData, expenseAmount: Number(e.target.value || 0) })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô Tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="2"
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-700">Lợi nhuận tạm tính (chưa gồm lệ phí VĐV)</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrencyVND(estimatedProfit)}</p>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập Nhật Giải Đấu' : 'Lưu Giải Đấu'}
                </button>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Đang tải giải đấu...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">STT</th>
                  <th className="text-left py-3 px-4">Tên Giải</th>
                  <th className="text-left py-3 px-4">Ngày</th>
                  <th className="text-left py-3 px-4">Địa Điểm</th>
                  <th className="text-left py-3 px-4">Số VĐV</th>
                  <th className="text-left py-3 px-4">Thành Viên Tham Gia</th>
                  {canManageTournaments && <th className="text-left py-3 px-4">Hành Động</th>}
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament, index) => (
                  <tr key={tournament._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{index + 1}</td>
                    <td className="py-3 px-4">{tournament.name}</td>
                    <td className="py-3 px-4">{new Date(tournament.date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">{tournament.location || '-'}</td>
                    <td className="py-3 px-4">{tournament.participants?.length || 0}</td>
                    <td className="py-3 px-4">
                      {canManageTournaments ? (
                        <button
                          onClick={() => navigate(`/tournaments/${tournament._id}/participants`)}
                          className="btn btn-secondary flex items-center gap-2"
                        >
                          <Users size={16} />
                          Quản Lý VĐV
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    {canManageTournaments && (
                      <td className="py-3 px-4">
                        <button onClick={() => handleEdit(tournament)} className="text-teal-600 hover:text-teal-800 mr-2">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(tournament._id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
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
