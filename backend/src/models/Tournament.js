const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tournament = sequelize.define(
  'Tournament',
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
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    tableName: 'tournaments',
  }
);

module.exports = Tournament;
