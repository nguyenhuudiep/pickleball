const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('username', String(value || '').toLowerCase().trim());
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member',
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify(['view_bookings', 'create_bookings', 'view_tournaments']),
      get() {
        const raw = this.getDataValue('permissions');
        try {
          return raw ? JSON.parse(raw) : [];
        } catch (error) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('permissions', JSON.stringify(Array.isArray(value) ? value : []));
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'users',
  }
);

const hashPassword = async (user) => {
  if (!user.changed('password')) return;
  if (/^[a-f0-9]{32}$/i.test(user.password)) return;
  if (/^\$2[aby]\$\d{2}\$/.test(user.password)) return;
  user.password = crypto.createHash('md5').update(String(user.password)).digest('hex');
};

User.beforeCreate(hashPassword);
User.beforeUpdate(hashPassword);

User.prototype.comparePassword = async function comparePassword(enteredPassword) {
  const candidateHash = crypto.createHash('md5').update(String(enteredPassword)).digest('hex');
  if (candidateHash === this.password) {
    return true;
  }

  // Backward compatibility for old bcrypt records.
  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    if (isMatch) {
      this.password = candidateHash;
      await this.save();
    }
    return isMatch;
  }

  return false;
};

module.exports = User;
