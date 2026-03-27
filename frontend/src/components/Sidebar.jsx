import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users, Grid3X3, Calendar, DollarSign, Home, Settings, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const getMenuItems = (user, hasPermission) => {
  const memberMenuItems = [
    { label: 'Đặt Sân', icon: Calendar, href: '/bookings' },
    { label: 'Giải Đấu', icon: Trophy, href: '/tournaments' },
  ];

  const adminMenuItems = [
    { label: 'Bảng Điều Khiển', icon: Home, href: '/dashboard', visible: hasPermission('view_dashboard') },
    { label: 'Thành Viên', icon: Users, href: '/members', visible: hasPermission('view_members') },
    { label: 'Sân Chơi', icon: Grid3X3, href: '/courts', visible: hasPermission('view_courts') },
    { label: 'Đặt Sân', icon: Calendar, href: '/bookings', visible: hasPermission('view_bookings') },
    { label: 'Tài Chính', icon: DollarSign, href: '/financial', visible: hasPermission('view_financial') },
    { label: 'Giải Đấu', icon: Trophy, href: '/tournaments', visible: hasPermission('view_tournaments') },
    { label: 'Báo Cáo', icon: BarChart3, href: '/reports', visible: hasPermission('view_reports') },
    { label: 'Quản Lý Người Dùng', icon: Settings, href: '/users', visible: hasPermission('manage_users') },
  ].filter((item) => item.visible !== false);

  return user?.role === 'member' ? memberMenuItems : adminMenuItems;
};

export const Sidebar = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const menuItems = getMenuItems(user, hasPermission);

  return (
    <aside className="hidden md:block w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-8">Menu</h2>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};
