const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MemberSkillHistory = sequelize.define(
  'MemberSkillHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    delta: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    sourceType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'manual',
    },
    sourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'member_skill_histories',
  }
);

module.exports = MemberSkillHistory;
