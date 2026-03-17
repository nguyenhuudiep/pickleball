import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { memberAPI, tournamentAPI } from '../services/api';
import { Edit2, Plus, Trash2 } from 'lucide-react';

const getDefaultFormData = () => ({
  name: '',
  date: new Date().toISOString().split('T')[0],
  location: '',
  description: '',
  participants: [],
});

export const TournamentsPage = () => {
  const { hasPermission } = useAuth();
  const canManageTournaments = hasPermission('manage_tournaments');

  const [tournaments, setTournaments] = useState([]);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const tournamentsRes = await tournamentAPI.getAll();
      setTournaments(tournamentsRes.data.tournaments || []);

      if (canManageTournaments) {
        const membersRes = await memberAPI.getAll();
        setMembers(membersRes.data.members || []);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
    setLoading(false);
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
      participants: (tournament.participants || []).map((participant) => ({
        memberId: participant.memberId?._id || participant.memberId,
        rank: participant.rank || '',
        result: participant.result || '',
      })),
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

  const handleToggleParticipant = (memberId) => {
    const exists = formData.participants.some((participant) => participant.memberId === memberId);

    if (exists) {
      setFormData({
        ...formData,
        participants: formData.participants.filter((participant) => participant.memberId !== memberId),
      });
      return;
    }

    setFormData({
      ...formData,
      participants: [...formData.participants, { memberId, rank: '', result: '' }],
    });
  };

  const handleParticipantChange = (memberId, key, value) => {
    setFormData({
      ...formData,
      participants: formData.participants.map((participant) =>
        participant.memberId === memberId ? { ...participant, [key]: value } : participant
      ),
    });
  };

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thành Viên Tham Gia</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                  {members.map((member) => {
                    const selected = formData.participants.some((participant) => participant.memberId === member._id);
                    return (
                      <label key={member._id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleParticipant(member._id)}
                        />
                        <span>{member.name} ({member.username})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formData.participants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Kết Quả Thi Đấu</p>
                  {formData.participants.map((participant) => {
                    const member = members.find((item) => item._id === participant.memberId);
                    return (
                      <div key={participant.memberId} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={member ? member.name : participant.memberId}
                          className="input bg-gray-50"
                          disabled
                        />
                        <input
                          type="number"
                          placeholder="Hạng"
                          value={participant.rank}
                          onChange={(e) => handleParticipantChange(participant.memberId, 'rank', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Kết quả (VD: Vô địch, Á quân...)"
                          value={participant.result}
                          onChange={(e) => handleParticipantChange(participant.memberId, 'result', e.target.value)}
                          className="input"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

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
                  <th className="text-left py-3 px-4">Tên Giải</th>
                  <th className="text-left py-3 px-4">Ngày</th>
                  <th className="text-left py-3 px-4">Địa Điểm</th>
                  <th className="text-left py-3 px-4">Số VĐV</th>
                  {canManageTournaments && <th className="text-left py-3 px-4">Hành Động</th>}
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament) => (
                  <tr key={tournament._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{tournament.name}</td>
                    <td className="py-3 px-4">{new Date(tournament.date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">{tournament.location || '-'}</td>
                    <td className="py-3 px-4">{tournament.participants?.length || 0}</td>
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
