const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentParticipant = sequelize.define(
  'TournamentParticipant',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    partnerMemberId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    isDoublesParticipant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    feePaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    feeAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'tournament_participants',
  }
);

module.exports = TournamentParticipant;
