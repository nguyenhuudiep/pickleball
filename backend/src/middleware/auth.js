const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

    User.findById(decoded.id)
      .select('role permissions active')
      .then((user) => {
        if (!user || user.active === false) {
          return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        req.user = {
          id: user._id.toString(),
          role: user.role,
          permissions: user.permissions?.length ? user.permissions : (defaultPermissionsByRole[user.role] || []),
        };
        next();
      })
      .catch((error) => {
        res.status(401).json({ success: false, message: error.message || 'Invalid token' });
      });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
    next();
  };
};

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];

    if (req.user?.role === 'admin') {
      return next();
    }

    const hasAllPermissions = permissions.every((permission) => userPermissions.includes(permission));
    if (!hasAllPermissions) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { protect, authorize, requirePermission };
