const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Court = sequelize.define(
  'Court',
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
    courtNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    surface: {
      type: DataTypes.ENUM('hard', 'clay', 'indoor'),
      defaultValue: 'hard',
    },
    lights: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hourlyRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
      defaultValue: 'available',
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
  },
  {
    tableName: 'courts',
  }
);

module.exports = Court;
