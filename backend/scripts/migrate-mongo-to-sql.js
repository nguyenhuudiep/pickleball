const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');
const {
  User,
  Member,
  Court,
  Booking,
  Financial,
  Tournament,
  TournamentParticipant,
} = require('../src/models');

const toMongoId = (value) => (value ? String(value) : null);

const parsePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const legacySchema = new mongoose.Schema({}, { strict: false });
const LegacyUser = mongoose.model('LegacyUser', legacySchema, 'users');
const LegacyMember = mongoose.model('LegacyMember', legacySchema, 'members');
const LegacyCourt = mongoose.model('LegacyCourt', legacySchema, 'courts');
const LegacyBooking = mongoose.model('LegacyBooking', legacySchema, 'bookings');
const LegacyFinancial = mongoose.model('LegacyFinancial', legacySchema, 'financials');
const LegacyTournament = mongoose.model('LegacyTournament', legacySchema, 'tournaments');

const buildMap = () => new Map();

const migrate = async () => {
  const mongoUri = process.env.MIGRATION_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MIGRATION_MONGODB_URI or MONGODB_URI in backend/.env');
  }

  const truncate = process.env.MIGRATION_TRUNCATE === 'true';

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for migration');

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('Connected to SQL Server and synced schema');

  if (truncate) {
    await TournamentParticipant.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await Financial.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await Booking.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await Tournament.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await Court.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await Member.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
    console.log('Truncated SQL tables before migration');
  }

  const userMap = buildMap();
  const memberMap = buildMap();
  const courtMap = buildMap();
  const bookingMap = buildMap();
  const tournamentMap = buildMap();

  const users = await LegacyUser.find({}).lean();
  for (const doc of users) {
    const mongoId = toMongoId(doc._id);
    const username = String(doc.username || '').trim().toLowerCase();
    if (!username) {
      continue;
    }

    const payload = {
      mongoId,
      name: doc.name || username,
      username,
      password: doc.password || 'changeme123',
      role: doc.role === 'admin' ? 'admin' : 'member',
      permissions: parsePermissions(doc.permissions),
      phone: doc.phone || null,
      active: doc.active !== false,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    const existing = await User.findOne({ where: { username } });
    const user = existing ? await existing.update(payload) : await User.create(payload);
    userMap.set(mongoId, user.id);
  }
  console.log(`Migrated users: ${userMap.size}`);

  const members = await LegacyMember.find({}).lean();
  for (const doc of members) {
    const mongoId = toMongoId(doc._id);

    const payload = {
      mongoId,
      name: doc.name || 'Unknown Member',
      username: doc.username || null,
      password: doc.password || null,
      phone: doc.phone || null,
      address: doc.address || null,
      membershipType: ['basic', 'premium', 'vip'].includes(doc.membershipType) ? doc.membershipType : 'basic',
      skillLevel: Number(doc.skillLevel || 2.5),
      gender: ['male', 'female', 'other'].includes(doc.gender) ? doc.gender : 'male',
      joinDate: doc.joinDate || new Date(),
      expiryDate: doc.expiryDate || null,
      status: ['active', 'inactive', 'suspended'].includes(doc.status) ? doc.status : 'active',
      totalBookings: Number(doc.totalBookings || 0),
      totalSpent: Number(doc.totalSpent || 0),
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    const existing = await Member.findOne({ where: { mongoId } });
    const member = existing ? await existing.update(payload) : await Member.create(payload);
    memberMap.set(mongoId, member.id);
  }
  console.log(`Migrated members: ${memberMap.size}`);

  const courts = await LegacyCourt.find({}).lean();
  for (const doc of courts) {
    const mongoId = toMongoId(doc._id);
    const payload = {
      mongoId,
      name: doc.name || 'Court',
      courtNumber: doc.courtNumber || `COURT-${mongoId}`,
      surface: ['hard', 'clay', 'indoor'].includes(doc.surface) ? doc.surface : 'hard',
      lights: Boolean(doc.lights),
      hourlyRate: Number(doc.hourlyRate || 0),
      status: ['available', 'occupied', 'maintenance'].includes(doc.status) ? doc.status : 'available',
      capacity: Number(doc.capacity || 4),
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    const existing = await Court.findOne({ where: { mongoId } });
    const court = existing ? await existing.update(payload) : await Court.create(payload);
    courtMap.set(mongoId, court.id);
  }
  console.log(`Migrated courts: ${courtMap.size}`);

  const bookings = await LegacyBooking.find({}).lean();
  let skippedBookings = 0;
  for (const doc of bookings) {
    const mongoId = toMongoId(doc._id);
    const memberId = memberMap.get(toMongoId(doc.memberId));
    const courtId = courtMap.get(toMongoId(doc.courtId));

    if (!memberId || !courtId) {
      skippedBookings += 1;
      continue;
    }

    const payload = {
      mongoId,
      memberId,
      courtId,
      bookingDate: doc.bookingDate || new Date(),
      startTime: doc.startTime || '00:00',
      endTime: doc.endTime || '00:00',
      duration: Number(doc.duration || 0),
      price: Number(doc.price || 0),
      status: ['pending', 'confirmed', 'completed', 'cancelled'].includes(doc.status) ? doc.status : 'pending',
      notes: doc.notes || null,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    const existing = await Booking.findOne({ where: { mongoId } });
    const booking = existing ? await existing.update(payload) : await Booking.create(payload);
    bookingMap.set(mongoId, booking.id);
  }
  console.log(`Migrated bookings: ${bookingMap.size}, skipped: ${skippedBookings}`);

  const financials = await LegacyFinancial.find({}).lean();
  let skippedFinancials = 0;
  for (const doc of financials) {
    const mongoId = toMongoId(doc._id);
    const bookingId = doc.bookingId ? bookingMap.get(toMongoId(doc.bookingId)) || null : null;

    const payload = {
      mongoId,
      type: ['income', 'expense'].includes(doc.type) ? doc.type : 'income',
      category: doc.category || 'Other',
      description: doc.description || null,
      amount: Number(doc.amount || 0),
      bookingId,
      paymentMethod: ['cash', 'card', 'transfer', 'other'].includes(doc.paymentMethod)
        ? doc.paymentMethod
        : 'cash',
      date: doc.date || new Date(),
      notes: doc.notes || null,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    try {
      const existing = await Financial.findOne({ where: { mongoId } });
      if (existing) {
        await existing.update(payload);
      } else {
        await Financial.create(payload);
      }
    } catch (error) {
      skippedFinancials += 1;
      console.warn(`Skip financial ${mongoId}: ${error.message}`);
    }
  }
  console.log(`Migrated financials: ${financials.length - skippedFinancials}, skipped: ${skippedFinancials}`);

  const tournaments = await LegacyTournament.find({}).lean();
  for (const doc of tournaments) {
    const mongoId = toMongoId(doc._id);
    const payload = {
      mongoId,
      name: doc.name || 'Tournament',
      date: doc.date || new Date(),
      location: doc.location || '',
      description: doc.description || '',
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };

    const existing = await Tournament.findOne({ where: { mongoId } });
    const tournament = existing ? await existing.update(payload) : await Tournament.create(payload);
    tournamentMap.set(mongoId, tournament.id);

    await TournamentParticipant.destroy({ where: { tournamentId: tournament.id } });

    const participants = Array.isArray(doc.participants) ? doc.participants : [];
    for (const participant of participants) {
      const memberId = memberMap.get(toMongoId(participant.memberId));
      if (!memberId) continue;

      await TournamentParticipant.create({
        tournamentId: tournament.id,
        memberId,
        rank: participant.rank || null,
        result: participant.result || '',
      });
    }
  }

  console.log(`Migrated tournaments: ${tournamentMap.size}`);
  console.log('MongoDB -> SQL Server migration completed successfully');
};

(async () => {
  try {
    await migrate();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // ignore
    }
    try {
      await sequelize.close();
    } catch (error) {
      // ignore
    }
  }
})();
