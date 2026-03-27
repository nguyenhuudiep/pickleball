import { Fragment, useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { memberAPI, tournamentAPI } from '../services/api';
import { Plus, Edit2, Trash2, Search, History } from 'lucide-react';

const skillLevelOptions = Array.from({ length: 36 }, (_, index) => (1.5 + index * 0.1).toFixed(1));
const membershipTypeOptions = [
  { value: 'basic', label: 'Cơ Bản' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];
const genderOptions = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];
const skillOptions = skillLevelOptions.map((value) => ({ value, label: value }));
const skillFilterOptions = [
  { value: 'all', label: 'Tất cả điểm trình' },
  ...skillLevelOptions.map((value) => ({ value, label: `Điểm trình ${value}` })),
];
const itemsPerPageOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
];
const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;
const AUTO_REFRESH_INTERVAL_MS = 15000;

const buildMembersVersion = (members = []) => {
  const list = Array.isArray(members) ? members : [];
  let latest = 0;

  for (const member of list) {
    const stamp = new Date(member?.updatedAt || member?.createdAt || 0).getTime();
    if (Number.isFinite(stamp) && stamp > latest) {
      latest = stamp;
    }
  }

  return `${list.length}:${latest || 0}`;
};

export const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingId, setEditingId] = useState(null);
  const [expandedHistoryMemberId, setExpandedHistoryMemberId] = useState(null);
  const [skillHistoryByMember, setSkillHistoryByMember] = useState({});
  const [tournamentHistoryByMember, setTournamentHistoryByMember] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
    address: '',
    membershipType: 'basic',
    skillLevel: 2.5,
    gender: 'male',
  });
  const isFetchingRef = useRef(false);
  const isCheckingVersionRef = useRef(false);
  const lastVersionRef = useRef('');
  const versionPollCountRef = useRef(0);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const refreshMembers = () => {
      checkMembersVersionAndRefresh();
    };
    const handleFocus = () => {
      checkMembersVersionAndRefresh({ forceFullFetch: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkMembersVersionAndRefresh({ forceFullFetch: true });
      }
    };

    const intervalId = window.setInterval(refreshMembers, AUTO_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchMembers = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const { data } = await memberAPI.getAll();
      const nextMembers = Array.isArray(data.members) ? data.members : [];
      setMembers(nextMembers);
      lastVersionRef.current = data.version || buildMembersVersion(nextMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const checkMembersVersionAndRefresh = async ({ forceFullFetch = false } = {}) => {
    if (isFetchingRef.current || isCheckingVersionRef.current) {
      return;
    }

    if (forceFullFetch) {
      await fetchMembers({ silent: true });
      return;
    }

    isCheckingVersionRef.current = true;

    try {
      versionPollCountRef.current += 1;

      // Safety net: every 4 polls force a full refresh in case version data is stale upstream.
      if (versionPollCountRef.current % 4 === 0) {
        await fetchMembers({ silent: true });
        return;
      }

      const { data } = await memberAPI.getVersion();
      const nextVersion = data?.version;

      if (!nextVersion) {
        await fetchMembers({ silent: true });
        return;
      }

      if (!lastVersionRef.current) {
        lastVersionRef.current = nextVersion;
        await fetchMembers({ silent: true });
        return;
      }

      if (nextVersion !== lastVersionRef.current) {
        await fetchMembers({ silent: true });
      }
    } catch (error) {
      console.error('Error checking members version:', error);
    } finally {
      isCheckingVersionRef.current = false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        skillLevel: Number(formData.skillLevel || 0),
      };

      if (editingId) {
        await memberAPI.update(editingId, payload);
      } else {
        await memberAPI.create(payload);
      }
      setFormData({ name: '', username: '', password: '', phone: '', address: '', membershipType: 'basic', skillLevel: 2.5, gender: 'male' });
      setShowForm(false);
      setEditingId(null);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert(error.response?.data?.message || 'Không thể lưu thành viên');
    }
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      username: member.username,
      password: '',
      phone: member.phone,
      address: member.address,
      membershipType: member.membershipType,
      skillLevel: member.skillLevel ?? 2.5,
      gender: member.gender || 'male',
    });
    setEditingId(member._id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      phone: '',
      address: '',
      membershipType: 'basic',
      skillLevel: 2.5,
      gender: 'male',
    });
  };

  const handleToggleSkillHistory = async (memberId) => {
    if (expandedHistoryMemberId === memberId) {
      setExpandedHistoryMemberId(null);
      return;
    }

    setExpandedHistoryMemberId(memberId);

    const requests = [];

    if (!skillHistoryByMember[memberId]) {
      requests.push(
        memberAPI
          .getSkillHistory(memberId)
          .then(({ data }) => {
            setSkillHistoryByMember((prev) => ({
              ...prev,
              [memberId]: data.histories || [],
            }));
          })
          .catch((error) => {
            console.error('Error fetching member skill history:', error);
            setSkillHistoryByMember((prev) => ({
              ...prev,
              [memberId]: [],
            }));
          })
      );
    }

    if (!tournamentHistoryByMember[memberId]) {
      requests.push(
        tournamentAPI
          .getMemberHistory(memberId)
          .then(({ data }) => {
            setTournamentHistoryByMember((prev) => ({
              ...prev,
              [memberId]: data.tournaments || [],
            }));
          })
          .catch((error) => {
            console.error('Error fetching member tournament history:', error);
            setTournamentHistoryByMember((prev) => ({
              ...prev,
              [memberId]: [],
            }));
          })
      );
    }

    if (requests.length > 0) {
      await Promise.all(requests);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      try {
        await memberAPI.delete(id);
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const filteredMembers = members
    .filter((member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((member) => skillFilter === 'all' || Number(member.skillLevel ?? 0).toFixed(1) === skillFilter)
    .sort((firstMember, secondMember) => Number(secondMember.skillLevel ?? 0) - Number(firstMember.skillLevel ?? 0));

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, skillFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Thành Viên</h1>
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
            Thêm Thành Viên
          </button>
        </div>

        {showForm && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên Đăng Nhập</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mật Khẩu {editingId ? '(để trống nếu không đổi)' : ''}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Điện Thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại Thành Viên</label>
                  <AppSelect
                    options={membershipTypeOptions}
                    value={getSelectedOption(membershipTypeOptions, formData.membershipType)}
                    onChange={(selected) => setFormData({ ...formData, membershipType: selected?.value || 'basic' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới Tính</label>
                  <AppSelect
                    options={genderOptions}
                    value={getSelectedOption(genderOptions, formData.gender)}
                    onChange={(selected) => setFormData({ ...formData, gender: selected?.value || 'male' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Điểm Trình</label>
                  <AppSelect
                    options={skillOptions}
                    value={getSelectedOption(skillOptions, String(formData.skillLevel))}
                    onChange={(selected) => setFormData({ ...formData, skillLevel: selected?.value || '2.5' })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Địa Chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập Nhật Thành Viên' : 'Lưu Thành Viên'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCancel()}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thành viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
          <div className="w-full max-w-[220px]">
            <AppSelect
              options={skillFilterOptions}
              value={getSelectedOption(skillFilterOptions, skillFilter)}
              onChange={(selected) => setSkillFilter(selected?.value || 'all')}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Đang tải thành viên...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">STT</th>
                  <th className="text-left py-3 px-4">Tên</th>
                  <th className="text-left py-3 px-4">Giới Tính</th>
                  <th className="text-left py-3 px-4">Điểm Trình</th>
                  <th className="text-left py-3 px-4">Loại Thành Viên</th>
                  <th className="text-left py-3 px-4">Trạng Thái</th>
                  <th className="text-left py-3 px-4">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member, index) => (
                  <Fragment key={member._id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{startIndex + index + 1}</td>
                      <td className="py-3 px-4">{member.name}</td>
                      <td className="py-3 px-4">
                        {member.gender === 'male' ? 'Nam' : member.gender === 'female' ? 'Nữ' : 'Khác'}
                      </td>
                      <td className="py-3 px-4">{Number(member.skillLevel ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                          {member.membershipType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleSkillHistory(member._id)}
                          className="text-amber-600 hover:text-amber-800 mr-2"
                          title="Lịch sử tăng/giảm điểm"
                        >
                          <History size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-teal-600 hover:text-teal-800 mr-2"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
                              memberAPI.delete(member._id).then(() => fetchMembers());
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>

                    {expandedHistoryMemberId === member._id && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan={7} className="py-3 px-4">
                          <div className="space-y-4">
                            <div>
                              <p className="font-medium text-gray-700 mb-2">Lịch sử tham dự giải</p>
                              {tournamentHistoryByMember[member._id]?.length ? (
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {tournamentHistoryByMember[member._id].map((tournament) => {
                                    const participant = tournament.participants?.find(
                                      (item) => (item.memberId?._id || item.memberId) === member._id
                                    );

                                    return (
                                      <li key={tournament._id}>
                                        {new Date(tournament.date).toLocaleDateString('vi-VN')} - {tournament.name}
                                        {participant?.rank ? ` (Hạng ${participant.rank})` : ''}
                                        {participant?.result ? ` - ${participant.result}` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">Chưa có lịch sử tham dự giải.</p>
                              )}
                            </div>

                            <div>
                              <p className="font-medium text-gray-700 mb-2">Lịch sử tăng/giảm điểm</p>
                              {skillHistoryByMember[member._id]?.length ? (
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {skillHistoryByMember[member._id].map((historyItem) => {
                                const delta = Number(historyItem.delta || 0);
                                const sign = delta > 0 ? '+' : '';
                                const deltaColor = delta >= 0 ? 'text-green-700' : 'text-red-700';

                                return (
                                  <li key={historyItem._id} className="flex flex-wrap items-center gap-2">
                                    <span className="text-gray-500">
                                      {new Date(historyItem.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                    <span className={`font-semibold ${deltaColor}`}>
                                      {sign}{delta.toFixed(1)}
                                    </span>
                                    <span>
                                      {historyItem.reason || 'Điều chỉnh điểm'}
                                    </span>
                                  </li>
                                );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">Chưa có lịch sử tăng/giảm điểm.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {filteredMembers.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredMembers.length)} / {filteredMembers.length} thành viên
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Số dòng/trang:</label>
                    <div className="w-24">
                      <AppSelect
                        options={itemsPerPageOptions}
                        value={getSelectedOption(itemsPerPageOptions, itemsPerPage)}
                        onChange={(selected) => {
                          setItemsPerPage(Number(selected?.value || 10));
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prevPage) => Math.max(prevPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-gray-700">Trang {currentPage}/{totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
