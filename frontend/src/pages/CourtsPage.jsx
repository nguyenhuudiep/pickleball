import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { courtAPI } from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const surfaceOptions = [
  { value: 'hard', label: 'Cứng' },
  { value: 'clay', label: 'Sét' },
  { value: 'indoor', label: 'Trong Nhà' },
];

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;
const AUTO_REFRESH_INTERVAL_MS = 15000;
const formatCurrencyVND = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

const getCourtStatusLabel = (status) => {
  if (status === 'occupied') return 'Đang sử dụng';
  if (status === 'maintenance') return 'Bảo trì';
  return 'Sẵn sàng';
};

const buildCourtsSignature = (courts = []) => JSON.stringify(
  (Array.isArray(courts) ? courts : []).map((court) => [
    court._id,
    court.name,
    court.courtNumber,
    court.surface,
    court.hourlyRate,
    court.status,
    court.updatedAt,
  ])
);

export const CourtsPage = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    courtNumber: '',
    surface: 'hard',
    lights: false,
    hourlyRate: '',
  });
  const isFetchingRef = useRef(false);
  const lastSignatureRef = useRef('');

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    const refreshCourts = () => fetchCourts({ silent: true });
    const handleFocus = () => fetchCourts({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCourts({ silent: true });
      }
    };

    const intervalId = window.setInterval(refreshCourts, AUTO_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchCourts = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const { data } = await courtAPI.getAll();
      const nextCourts = data.courts || [];
      const nextSignature = buildCourtsSignature(nextCourts);
      if (nextSignature !== lastSignatureRef.current) {
        lastSignatureRef.current = nextSignature;
        setCourts(nextCourts);
      }
    } catch (error) {
      console.error('Error fetching courts:', error);
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
      if (editingCourtId) {
        await courtAPI.update(editingCourtId, formData);
      } else {
        await courtAPI.create(formData);
      }
      setFormData({ name: '', courtNumber: '', surface: 'hard', lights: false, hourlyRate: '' });
      setEditingCourtId(null);
      setShowForm(false);
      fetchCourts();
    } catch (error) {
      console.error('Error creating court:', error);
    }
  };

  const handleEdit = (court) => {
    setFormData({
      name: court.name || '',
      courtNumber: court.courtNumber || '',
      surface: court.surface || 'hard',
      lights: Boolean(court.lights),
      hourlyRate: court.hourlyRate || '',
    });
    setEditingCourtId(court._id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCourtId(null);
    setFormData({ name: '', courtNumber: '', surface: 'hard', lights: false, hourlyRate: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sân này?')) {
      try {
        await courtAPI.delete(id);
        fetchCourts();
      } catch (error) {
        console.error('Error deleting court:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Sân Chơi</h1>
          <button
            onClick={() => {
              if (showForm) {
                handleCancelForm();
                return;
              }
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Thêm Sân
          </button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Bảng giá tiêu chuẩn: trước 17h là 100.000đ/giờ, từ 17h trở đi là 120.000đ/giờ.
        </div>

        {showForm && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {editingCourtId && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Bạn đang chỉnh sửa thông tin sân.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên Sân</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số Sân</label>
                  <input
                    type="text"
                    value={formData.courtNumber}
                    onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại Mặt Sân</label>
                  <AppSelect
                    options={surfaceOptions}
                    value={getSelectedOption(surfaceOptions, formData.surface)}
                    onChange={(selected) => setFormData({ ...formData, surface: selected?.value || 'hard' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giá/Giờ (VND)</label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lights"
                  checked={formData.lights}
                  onChange={(e) => setFormData({ ...formData, lights: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="lights" className="text-sm font-medium text-gray-700">
                  Có Đèn
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">{editingCourtId ? 'Lưu Chỉnh Sửa' : 'Lưu Sân'}</button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Đang tải sân...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => (
              <div key={court._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{court.name}</h3>
                    <p className="text-gray-600 text-sm">Sân #{court.courtNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(court)}
                      className="text-teal-600 hover:text-teal-800"
                      title="Chỉnh sửa sân"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(court._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Mặt Sân:</span> {court.surface}</p>
                  <p><span className="font-medium">Giá:</span> {formatCurrencyVND(court.hourlyRate)}/giờ</p>
                  <p><span className="font-medium">Đèn:</span> {court.lights ? 'Có' : 'Không'}</p>
                  <p>
                    <span className="font-medium">Trạng Thái:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      court.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : court.status === 'occupied'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getCourtStatusLabel(court.status)}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
