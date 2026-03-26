import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppSelect } from '../components/AppSelect';
import { memberAPI } from '../services/api';

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

export const PublicMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  useEffect(() => {
    const fetchPublicMembers = async () => {
      try {
        const { data } = await memberAPI.getPublic();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Error fetching public members:', error);
      }
      setLoading(false);
    };

    fetchPublicMembers();
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
                    <th className="text-left py-3 px-4">Tên</th>
                    <th className="text-left py-3 px-4">Giới Tính</th>
                    <th className="text-left py-3 px-4">Điểm Trình</th>
                    <th className="text-left py-3 px-4">Loại Thành Viên</th>
                    <th className="text-left py-3 px-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member._id} className="border-b hover:bg-gray-50">
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
                    </tr>
                  ))}
                </tbody>
              </table>

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
