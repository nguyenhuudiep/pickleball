const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const Member = sequelize.define(
  'Member',
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
  if (/^[a-f0-9]{32}$/i.test(member.password)) return;
  if (/^\$2[aby]\$\d{2}\$/.test(member.password)) return;
  member.password = crypto.createHash('md5').update(String(member.password)).digest('hex');
};

Member.beforeCreate(hashPassword);
Member.beforeUpdate(hashPassword);

Member.prototype.comparePassword = async function comparePassword(enteredPassword) {
  if (!this.password) return false;

  const candidateHash = crypto.createHash('md5').update(String(enteredPassword)).digest('hex');
  if (candidateHash === this.password) {
    return true;
  }

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

module.exports = Member;
