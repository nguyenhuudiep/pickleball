import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { Edit2, Trash2, Save, X, Plus, Search } from 'lucide-react';
import { authAPI, userAPI } from '../services/api';

const roleOptions = [
  { value: 'member', label: 'Thành Viên' },
  { value: 'admin', label: 'Quản Trị Viên' },
];

const permissionOptions = [
  { value: 'view_dashboard', label: 'Xem Bảng Điều Khiển' },
  { value: 'view_members', label: 'Xem Thành Viên' },
  { value: 'manage_members', label: 'Quản Lý Thành Viên' },
  { value: 'view_courts', label: 'Xem Sân Chơi' },
  { value: 'manage_courts', label: 'Quản Lý Sân Chơi' },
  { value: 'view_bookings', label: 'Xem Đặt Sân' },
  { value: 'create_bookings', label: 'Thêm Đặt Sân' },
  { value: 'edit_bookings', label: 'Sửa Đặt Sân' },
  { value: 'delete_bookings', label: 'Xóa Đặt Sân' },
  { value: 'view_financial', label: 'Xem Tài Chính' },
  { value: 'manage_financial', label: 'Quản Lý Tài Chính' },
  { value: 'view_tournaments', label: 'Xem Giải Đấu' },
  { value: 'manage_tournaments', label: 'Quản Lý Giải Đấu' },
  { value: 'view_reports', label: 'Xem Báo Cáo' },
  { value: 'manage_users', label: 'Quản Lý Người Dùng' },
];

const defaultPermissionsByRole = {
  admin: permissionOptions.map((permission) => permission.value),
  member: ['view_bookings', 'create_bookings', 'view_tournaments'],
};

const permissionPresets = [
  {
    value: 'admin-full',
    label: 'Admin đầy đủ',
    role: 'admin',
    permissions: defaultPermissionsByRole.admin,
  },
  {
    value: 'admin-ops',
    label: 'Admin vận hành',
    role: 'admin',
    permissions: [
      'view_dashboard',
      'view_members',
      'manage_members',
      'view_courts',
      'manage_courts',
      'view_bookings',
      'create_bookings',
      'edit_bookings',
      'delete_bookings',
      'view_tournaments',
      'manage_tournaments',
      'view_reports',
    ],
  },
  {
    value: 'admin-finance',
    label: 'Admin kế toán',
    role: 'admin',
    permissions: [
      'view_dashboard',
      'view_bookings',
      'view_financial',
      'manage_financial',
      'view_reports',
      'view_tournaments',
    ],
  },
  {
    value: 'member-basic',
    label: 'Member cơ bản',
    role: 'member',
    permissions: defaultPermissionsByRole.member,
  },
];

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'member',
    permissions: defaultPermissionsByRole.member,
  });
  const [editData, setEditData] = useState({
    name: '',
    username: '',
    role: 'member',
    password: '',
    permissions: defaultPermissionsByRole.member,
  });
  const [selectedCreatePreset, setSelectedCreatePreset] = useState('member-basic');
  const [selectedEditPreset, setSelectedEditPreset] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authAPI.register(formData);
      if (data.success) {
        setFormData({ name: '', username: '', password: '', role: 'member', permissions: defaultPermissionsByRole.member });
        setSelectedCreatePreset('member-basic');
        setShowForm(false);
        fetchUsers();
      } else {
        alert(data.message || 'Lỗi thêm người dùng');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Lỗi thêm người dùng');
    }
  };

  const handleEditUser = (user) => {
    setEditingId(user._id);
    setEditData({
      name: user.name,
      username: user.username,
      role: user.role,
      password: '',
      permissions: user.permissions || defaultPermissionsByRole[user.role] || defaultPermissionsByRole.member,
    });
    setSelectedEditPreset('');
  };

  const applyPresetToCreateForm = (presetValue) => {
    const preset = permissionPresets.find((item) => item.value === presetValue);
    if (!preset) return;
    setSelectedCreatePreset(presetValue);
    setFormData({
      ...formData,
      role: preset.role,
      permissions: preset.permissions,
    });
  };

  const applyPresetToEditForm = (presetValue) => {
    const preset = permissionPresets.find((item) => item.value === presetValue);
    if (!preset) return;
    setSelectedEditPreset(presetValue);
    setEditData({
      ...editData,
      role: preset.role,
      permissions: preset.permissions,
    });
  };

  const togglePermissions = (currentPermissions, permission, checked) => {
    if (checked) {
      if (currentPermissions.includes(permission)) return currentPermissions;
      return [...currentPermissions, permission];
    }
    return currentPermissions.filter((item) => item !== permission);
  };

  const handleSaveUser = async (userId) => {
    try {
      const { data } = await userAPI.update(userId, editData);
      if (data.success) {
        setEditingId(null);
        fetchUsers();
      } else {
        alert(data.message || 'Lỗi cập nhật');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Lỗi cập nhật người dùng');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        const { data } = await userAPI.delete(userId);
        if (data.success) {
          fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Người Dùng</h1>
            <p className="text-gray-600 mt-2">Quản lý tài khoản và phân quyền</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {showForm ? 'Hủy' : 'Thêm Người Dùng'}
          </button>
        </div>

        {showForm && (
          <div className="card p-6">
            <h3 className="text-xl font-bold mb-4">Tạo Người Dùng Mới</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên Đầy Đủ
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên Đăng Nhập
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật Khẩu
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại Tài Khoản
                  </label>
                  <AppSelect
                    options={roleOptions}
                    value={getSelectedOption(roleOptions, formData.role)}
                    onChange={(selected) => {
                      const nextRole = selected?.value || 'member';
                      setFormData({ ...formData, role: nextRole, permissions: defaultPermissionsByRole[nextRole] || defaultPermissionsByRole.member });
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Quyền Hạn</label>
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Mẫu phân quyền</label>
                  <AppSelect
                    options={permissionPresets}
                    value={getSelectedOption(permissionPresets, selectedCreatePreset)}
                    onChange={(selected) => applyPresetToCreateForm(selected?.value || 'member-basic')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {permissionOptions.map((permission) => (
                    <label key={permission.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.value)}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: togglePermissions(formData.permissions, permission.value, e.target.checked),
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full">
                Tạo Người Dùng
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên đăng nhập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-600">Đang tải người dùng...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">Tên</th>
                  <th className="text-left py-3 px-4">Tên Đăng Nhập</th>
                  <th className="text-left py-3 px-4">Loại Tài Khoản</th>
                  <th className="text-left py-3 px-4">Quyền Hạn</th>
                  <th className="text-left py-3 px-4">Trạng Thái</th>
                  <th className="text-left py-3 px-4">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u =>
                    !searchTerm ||
                    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">
                      {editingId === user._id ? (
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="input p-1 text-sm w-full"
                          placeholder="Tên đầy đủ"
                        />
                      ) : user.name}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === user._id ? (
                        <input
                          type="text"
                          value={editData.username}
                          onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                          className="input p-1 text-sm w-full"
                          placeholder="Tên đăng nhập"
                        />
                      ) : user.username}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === user._id ? (
                        <AppSelect
                          options={roleOptions}
                          value={getSelectedOption(roleOptions, editData.role)}
                          onChange={(selected) => {
                            const nextRole = selected?.value || 'member';
                            setEditData({ ...editData, role: nextRole, permissions: defaultPermissionsByRole[nextRole] || defaultPermissionsByRole.member });
                          }}
                          className="min-w-[180px]"
                        />
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {user.role === 'admin' ? 'Quản Trị Viên' : 'Thành Viên'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === user._id ? (
                        <div className="space-y-1 min-w-[260px]">
                          <div className="mb-2">
                            <label className="block text-xs text-gray-600 mb-1">Mẫu phân quyền</label>
                            <AppSelect
                              options={permissionPresets}
                              value={getSelectedOption(permissionPresets, selectedEditPreset)}
                              onChange={(selected) => applyPresetToEditForm(selected?.value || '')}
                            />
                          </div>
                          {permissionOptions.map((permission) => (
                            <label key={permission.value} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editData.permissions.includes(permission.value)}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    permissions: togglePermissions(editData.permissions, permission.value, e.target.checked),
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-xs text-gray-700">{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {user.permissions?.length || 0} quyền
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.active ? 'Hoạt Động' : 'Vô Hiệu'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {editingId === user._id ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-600">Mật khẩu mới (nếu có):</label>
                            <input
                              type="password"
                              value={editData.password}
                              onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                              className="input w-full text-sm p-1"
                              placeholder="Để trống nếu không đổi"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveUser(user._id)}
                              className="text-green-600 hover:text-green-800"
                              title="Lưu"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Hủy"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-teal-600 hover:text-teal-800"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.filter(u =>
              !searchTerm ||
              u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              u.name?.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <p className="text-center text-gray-500 py-6">Không tìm thấy người dùng nào</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
