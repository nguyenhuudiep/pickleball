import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut } from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-2xl font-bold">
          🏸 PICKLEBALL BROTHERS
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <>
              <span className="text-sm">Chào mừng, {user.name}</span>
              <button
                onClick={handleLogout}
                className="btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
              >
                <LogOut size={18} />
                Đăng Xuất
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden"
        >
          <Menu size={24} />
        </button>
      </div>

      {showMobileMenu && (
        <div className="md:hidden bg-teal-700 px-4 py-2 space-y-2">
          {user && (
            <>
              <p className="text-sm py-2">{user.name}</p>
              <button
                onClick={handleLogout}
                className="w-full btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 justify-center"
              >
                <LogOut size={18} />
                Đăng Xuất
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
