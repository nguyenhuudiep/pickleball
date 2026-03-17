const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

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

exports.register = async (req, res) => {
  try {
    const { name, username, password, role, permissions } = req.body;

    // Validate input
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên, tên đăng nhập và mật khẩu' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được đăng ký' });
    }

    const normalizedRole = role || 'member';

    const user = await User.create({
      name,
      username,
      password,
      role: normalizedRole,
      permissions: Array.isArray(permissions) && permissions.length ? permissions : (defaultPermissionsByRole[normalizedRole] || defaultPermissionsByRole.member),
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Người dùng đã đăng ký thành công',
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role, permissions: user.permissions || [] },
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error.message || 'Registration failed';
    res.status(500).json({ success: false, message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role, permissions: user.permissions || [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
