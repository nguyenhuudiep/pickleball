import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, X } from 'lucide-react';
import { useState } from 'react';
import { getMenuItems } from './Sidebar';

export const Navbar = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuItems = getMenuItems(user, hasPermission);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowMobileMenu(false);
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-base md:text-2xl font-bold tracking-wide">
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
          className="md:hidden bg-teal-700/70 hover:bg-teal-700 rounded-lg p-2"
          aria-label="Mở menu"
        >
          {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {showMobileMenu && (
        <div className="md:hidden border-t border-teal-500 bg-gradient-to-b from-teal-700 to-teal-800 px-4 py-4 space-y-3 shadow-2xl">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                  isActive ? 'bg-white text-teal-700 font-semibold' : 'bg-teal-600/50 text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user && (
            <div className="border-t border-teal-500 pt-3 space-y-2">
              <p className="text-sm text-teal-100">{user.name}</p>
              <button
                onClick={handleLogout}
                className="w-full btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 justify-center"
              >
                <LogOut size={18} />
                Đăng Xuất
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
