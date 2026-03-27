const User = require('./User');
const Member = require('./Member');
const Court = require('./Court');
const Booking = require('./Booking');
const Financial = require('./Financial');
const Tournament = require('./Tournament');
const TournamentParticipant = require('./TournamentParticipant');
const MemberSkillHistory = require('./MemberSkillHistory');

Member.hasMany(Booking, { foreignKey: 'memberId', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Court.hasMany(Booking, { foreignKey: 'courtId', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(Court, { foreignKey: 'courtId', as: 'court' });

Booking.hasMany(Financial, { foreignKey: 'bookingId', as: 'financials' });
Financial.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

Tournament.hasMany(TournamentParticipant, {
  foreignKey: 'tournamentId',
  as: 'participants',
  onDelete: 'CASCADE',
});
TournamentParticipant.belongsTo(Tournament, { foreignKey: 'tournamentId' });

Member.hasMany(TournamentParticipant, { foreignKey: 'memberId', as: 'tournamentEntries' });
TournamentParticipant.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Member.hasMany(MemberSkillHistory, { foreignKey: 'memberId', as: 'skillHistories', onDelete: 'CASCADE' });
MemberSkillHistory.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

module.exports = {
  User,
  Member,
  Court,
  Booking,
  Financial,
  Tournament,
  TournamentParticipant,
  MemberSkillHistory,
};
