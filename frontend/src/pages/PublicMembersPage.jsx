import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { AppSelect } from '../components/AppSelect';
import { memberAPI, tournamentAPI } from '../services/api';

const skillLevelOptions = Array.from({ length: 36 }, (_, index) => (1.5 + index * 0.1).toFixed(1));

const membershipFilterOptions = [
  { value: 'all', label: 'Tất cả loại thành viên' },
  { value: 'basic', label: 'Cơ Bản' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const skillFilterOptions = [
  { value: 'all', label: 'Tất cả điểm trình' },
  ...skillLevelOptions.map((value) => ({ value, label: `Điểm trình ${value}` })),
];

const itemsPerPageOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
];

const statusLabel = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  suspended: 'Tạm ngưng',
};

const genderLabel = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

const membershipLabel = {
  basic: 'Cơ Bản',
  premium: 'Premium',
  vip: 'VIP',
};

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;
const AUTO_REFRESH_INTERVAL_MS = 15000;

const buildMembersSignature = (members = []) => {
  const list = Array.isArray(members) ? members : [];
  return JSON.stringify(
    list.map((member) => [
      member._id,
      member.name,
      member.skillLevel,
      member.membershipType,
      member.status,
      member.updatedAt,
    ])
  );
};

export const PublicMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedHistoryMemberId, setExpandedHistoryMemberId] = useState(null);
  const [historyByMember, setHistoryByMember] = useState({});
  const isFetchingRef = useRef(false);
  const lastSignatureRef = useRef('');

  const fetchPublicMembers = async ({ silent = false } = {}) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const { data } = await memberAPI.getPublic();
      const nextMembers = data.members || [];
      const nextSignature = buildMembersSignature(nextMembers);

      if (nextSignature !== lastSignatureRef.current) {
        lastSignatureRef.current = nextSignature;
        setMembers(nextMembers);
      }
    } catch (error) {
      console.error('Error fetching public members:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchPublicMembers();
  }, []);

  useEffect(() => {
    const refreshMembers = () => {
      fetchPublicMembers({ silent: true });
    };

    const handleFocus = () => {
      fetchPublicMembers({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPublicMembers({ silent: true });
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

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return (member.name || '').toLowerCase().includes(query);
      })
      .filter((member) => membershipFilter === 'all' || member.membershipType === membershipFilter)
      .filter((member) => skillFilter === 'all' || Number(member.skillLevel ?? 0).toFixed(1) === skillFilter)
      .sort((firstMember, secondMember) => Number(secondMember.skillLevel ?? 0) - Number(firstMember.skillLevel ?? 0));
  }, [members, searchTerm, membershipFilter, skillFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, membershipFilter, skillFilter, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleToggleTournamentHistory = async (memberId) => {
    if (expandedHistoryMemberId === memberId) {
      setExpandedHistoryMemberId(null);
      return;
    }

    setExpandedHistoryMemberId(memberId);

    if (historyByMember[memberId]) {
      return;
    }

    try {
      const { data } = await tournamentAPI.getPublicMemberHistory(memberId);
      setHistoryByMember((previousData) => ({
        ...previousData,
        [memberId]: data.tournaments || [],
      }));
    } catch (error) {
      console.error('Error fetching public member tournament history:', error);
      setHistoryByMember((previousData) => ({
        ...previousData,
        [memberId]: [],
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800">Danh Sách Thành Viên</h1>
          <p className="text-gray-600 mt-2">Trang tra cứu công khai: tìm kiếm và lọc thông tin thành viên.</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên thành viên..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AppSelect
              options={membershipFilterOptions}
              value={getSelectedOption(membershipFilterOptions, membershipFilter)}
              onChange={(selected) => setMembershipFilter(selected?.value || 'all')}
            />
            <AppSelect
              options={skillFilterOptions}
              value={getSelectedOption(skillFilterOptions, skillFilter)}
              onChange={(selected) => setSkillFilter(selected?.value || 'all')}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          {loading ? (
            <p className="p-6 text-gray-600">Đang tải danh sách thành viên...</p>
          ) : (
            <>
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">STT</th>
                    <th className="text-left py-3 px-4">Tên</th>
                    <th className="text-left py-3 px-4">Giới Tính</th>
                    <th className="text-left py-3 px-4">Điểm Trình</th>
                    <th className="text-left py-3 px-4">Loại Thành Viên</th>
                    <th className="text-left py-3 px-4">Trạng Thái</th>
                    <th className="text-left py-3 px-4">Lịch Sử Giải</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((member, index) => (
                    <Fragment key={member._id}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{startIndex + index + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{member.name}</td>
                        <td className="py-3 px-4">{genderLabel[member.gender] || 'Khác'}</td>
                        <td className="py-3 px-4">{Number(member.skillLevel ?? 0).toFixed(1)}</td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                            {membershipLabel[member.membershipType] || member.membershipType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {statusLabel[member.status] || member.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleTournamentHistory(member._id)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Lịch sử giải đấu"
                          >
                            <Trophy size={18} />
                          </button>
                        </td>
                      </tr>

                      {expandedHistoryMemberId === member._id && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={7} className="py-3 px-4">
                            <p className="font-medium text-gray-700 mb-2">Lịch sử thi đấu giải</p>
                            {historyByMember[member._id]?.length ? (
                              <ul className="space-y-1 text-sm text-gray-700">
                                {historyByMember[member._id].map((tournament) => {
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
                              <p className="text-sm text-gray-500">Chưa có lịch sử thi đấu giải.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {!!filteredMembers.length && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
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
                          onChange={(selected) => setItemsPerPage(Number(selected?.value || 10))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((previousPage) => Math.max(previousPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="text-sm text-gray-700">Trang {currentPage}/{totalPages}</span>
                    <button
                      onClick={() => setCurrentPage((previousPage) => Math.min(previousPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}

              {!filteredMembers.length && (
                <p className="p-6 text-gray-500">Không tìm thấy thành viên phù hợp với bộ lọc hiện tại.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
