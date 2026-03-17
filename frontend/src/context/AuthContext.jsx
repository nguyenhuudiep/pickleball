import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const defaultPermissionsByRole = {
  admin: [
    'view_dashboard',
    'view_members',
    'manage_members',
    'view_courts',
    'manage_courts',
    'view_bookings',
    'create_bookings',
    'edit_bookings',
    'delete_bookings',
    'view_financial',
    'manage_financial',
    'view_tournaments',
    'manage_tournaments',
    'view_reports',
    'manage_users',
  ],
  member: ['view_bookings', 'create_bookings', 'view_tournaments'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setUser(data.user);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const { data } = await authAPI.login({ username, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      return { success: false, message };
    }
  };

  const register = async (credentials) => {
    try {
      const { data } = await authAPI.register(credentials);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const effectivePermissions = Array.isArray(user.permissions) && user.permissions.length
      ? user.permissions
      : (defaultPermissionsByRole[user.role] || []);
    return effectivePermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
