import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppSelect } from '../components/AppSelect';

const roleOptions = [
  { value: 'member', label: 'Thành Viên' },
  { value: 'admin', label: 'Quản Trị Viên' },
];

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'member',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    setLoading(true);
    const result = await register({
      name: formData.name,
      username: formData.username,
      role: formData.role,
      password: formData.password,
    });

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-600 mb-2">🏸</h1>
          <h2 className="text-3xl font-bold text-gray-800">Tạo Tài Khoản</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên Đầy Đủ
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên Đăng Nhập
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật Khẩu
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Xác Nhận Mật Khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input"
              required
            />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại Tài Khoản
            </label>
            <AppSelect
              options={roleOptions}
              value={getSelectedOption(roleOptions, formData.role)}
              onChange={(selected) =>
                setFormData({
                  ...formData,
                  role: selected?.value || 'member',
                })
              }
            />
          </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-teal-600 hover:underline font-medium">
            Đăng nhập tại đây
          </Link>
        </p>
      </div>
    </div>
  );
};
