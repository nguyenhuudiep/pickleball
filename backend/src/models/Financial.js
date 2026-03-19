const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Financial = sequelize.define(
  'Financial',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'other'),
      defaultValue: 'cash',
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'financials',
  }
);

module.exports = Financial;
