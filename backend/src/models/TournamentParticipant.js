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
  },
  {
    tableName: 'tournament_participants',
  }
);

module.exports = TournamentParticipant;
