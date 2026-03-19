const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const Member = sequelize.define(
  'Member',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mongoId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      set(value) {
        const normalized = value ? String(value).trim() : null;
        this.setDataValue('username', normalized || null);
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    membershipType: {
      type: DataTypes.ENUM('basic', 'premium', 'vip'),
      defaultValue: 'basic',
    },
    skillLevel: {
      type: DataTypes.FLOAT,
      defaultValue: 2.5,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      defaultValue: 'male',
    },
    joinDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    totalBookings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalSpent: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
  },
  {
    tableName: 'members',
  }
);

const hashPassword = async (member) => {
  if (!member.changed('password') || !member.password) return;
  const salt = await bcrypt.genSalt(10);
  member.password = await bcrypt.hash(member.password, salt);
};

Member.beforeCreate(hashPassword);
Member.beforeUpdate(hashPassword);

Member.prototype.comparePassword = async function comparePassword(enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = Member;
