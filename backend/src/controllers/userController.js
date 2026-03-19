const User = require('../models/User');
const { Op } = require('sequelize');
const { withMongoId, withMongoIdList } = require('../utils/apiMapper');

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

const validPermissions = [
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
];

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      users: withMongoIdList(users),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user by id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({
      success: true,
      user: withMongoId(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Loại tài khoản không hợp lệ' });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    user.role = role;
    user.permissions = defaultPermissionsByRole[role] || defaultPermissionsByRole.member;
    await user.save();

    const safeUser = withMongoId(user);
    delete safeUser.password;

    res.status(200).json({
      success: true,
      message: 'Cập nhật loại tài khoản thành công',
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user data (name, username, role, password)
exports.updateUser = async (req, res) => {
  try {
    const { name, username, role, password, permissions } = req.body;

    // Lấy user hiện tại
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    // Cập nhật tên
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // Cập nhật username
    if (username && username.trim()) {
      const existingUser = await User.findOne({
        where: {
          username: username.toLowerCase(),
          id: { [Op.ne]: Number(req.params.id) },
        },
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng' });
      }
      user.username = username.trim().toLowerCase();
    }

    // Cập nhật role
    if (role) {
      if (!['admin', 'member'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Loại tài khoản không hợp lệ' });
      }
      user.role = role;

      if (!Array.isArray(permissions)) {
        user.permissions = defaultPermissionsByRole[role] || defaultPermissionsByRole.member;
      }
    }

    if (Array.isArray(permissions)) {
      const hasInvalidPermission = permissions.some((permission) => !validPermissions.includes(permission));
      if (hasInvalidPermission) {
        return res.status(400).json({ success: false, message: 'Quyền hạn không hợp lệ' });
      }
      user.permissions = permissions;
    }

    // Cập nhật password và hash nó
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      }
      user.password = password;
    }

    // Lưu user (sẽ kích hoạt pre-save hook để hash password)
    await user.save();

    // Loại bỏ password trước khi gửi response
    const safeUser = withMongoId(user);
    delete safeUser.password;

    res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
