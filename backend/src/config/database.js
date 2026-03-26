const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.SQL_DATABASE || 'pickleball',
  process.env.SQL_USER || 'sa',
  process.env.SQL_PASSWORD || '',
  {
    host: process.env.SQL_HOST || 'localhost',
    port: process.env.SQL_INSTANCE ? undefined : Number(process.env.SQL_PORT || 1433),
    dialect: 'mssql',
    logging: false,
    dialectOptions: {
      options: {
        instanceName: process.env.SQL_INSTANCE || undefined,
        encrypt: process.env.SQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE !== 'false',
      },
    },
  }
);

const normalizeDateTimeColumns = async () => {
  const columns = [
    { table: 'users', column: 'createdAt', nullable: false },
    { table: 'users', column: 'updatedAt', nullable: false },
    { table: 'members', column: 'joinDate', nullable: false },
    { table: 'members', column: 'expiryDate', nullable: true },
    { table: 'members', column: 'createdAt', nullable: false },
    { table: 'members', column: 'updatedAt', nullable: false },
    { table: 'courts', column: 'createdAt', nullable: false },
    { table: 'courts', column: 'updatedAt', nullable: false },
    { table: 'bookings', column: 'bookingDate', nullable: false },
    { table: 'bookings', column: 'createdAt', nullable: false },
    { table: 'bookings', column: 'updatedAt', nullable: false },
    { table: 'financials', column: 'date', nullable: false },
    { table: 'financials', column: 'createdAt', nullable: false },
    { table: 'financials', column: 'updatedAt', nullable: false },
    { table: 'tournaments', column: 'date', nullable: false },
    { table: 'tournaments', column: 'createdAt', nullable: false },
    { table: 'tournaments', column: 'updatedAt', nullable: false },
    { table: 'tournament_participants', column: 'createdAt', nullable: false },
    { table: 'tournament_participants', column: 'updatedAt', nullable: false },
  ];

  for (const item of columns) {
    await sequelize.query(
      `
      IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${item.table}'
          AND COLUMN_NAME = '${item.column}'
          AND DATA_TYPE IN ('datetimeoffset', 'datetime')
      )
      BEGIN
        ALTER TABLE [${item.table}] ALTER COLUMN [${item.column}] DATETIME2 ${item.nullable ? 'NULL' : 'NOT NULL'};
      END
      `
    );
  }
};

const dropMongoIdColumnArtifacts = async () => {
  const tables = ['users', 'members', 'courts', 'bookings', 'financials', 'tournaments'];

  for (const table of tables) {
    const rows = await sequelize.query(
      `
      SELECT kc.name AS constraint_name
      FROM sys.key_constraints kc
      JOIN sys.tables t ON kc.parent_object_id = t.object_id
      JOIN sys.index_columns ic ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE kc.type = 'UQ' AND t.name = '${table}' AND c.name = 'mongoId'
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const row of rows) {
      await sequelize.query(`ALTER TABLE [${table}] DROP CONSTRAINT [${row.constraint_name}]`);
    }

    await sequelize.query(
      `
      IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table}'
          AND COLUMN_NAME = 'mongoId'
      )
      BEGIN
        ALTER TABLE [${table}] DROP COLUMN [mongoId];
      END
      `
    );
  }
};

const ensureTournamentParticipantColumns = async () => {
  await sequelize.query(`
    IF COL_LENGTH('tournament_participants', 'partnerMemberId') IS NULL
    BEGIN
      ALTER TABLE [tournament_participants]
      ADD [partnerMemberId] INT NULL;
    END
  `);

  await sequelize.query(`
    IF COL_LENGTH('tournament_participants', 'isDoublesParticipant') IS NULL
    BEGIN
      ALTER TABLE [tournament_participants]
      ADD [isDoublesParticipant] BIT NOT NULL CONSTRAINT [DF_tournament_participants_isDoublesParticipant] DEFAULT 0;
    END
  `);

  await sequelize.query(`
    IF COL_LENGTH('tournament_participants', 'feePaid') IS NULL
    BEGIN
      ALTER TABLE [tournament_participants]
      ADD [feePaid] BIT NOT NULL CONSTRAINT [DF_tournament_participants_feePaid] DEFAULT 0;
    END
  `);

  await sequelize.query(`
    IF COL_LENGTH('tournament_participants', 'feeAmount') IS NULL
    BEGIN
      ALTER TABLE [tournament_participants]
      ADD [feeAmount] FLOAT NOT NULL CONSTRAINT [DF_tournament_participants_feeAmount] DEFAULT 0;
    END
  `);
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    // Keep auto-alter disabled by default because MSSQL ALTER statements can fail on existing constraints.
    const shouldAlter = process.env.SQL_SYNC_ALTER === 'true';
    const { User } = require('../models');
    await sequelize.sync(shouldAlter ? { alter: true } : {});
    await dropMongoIdColumnArtifacts();
    await normalizeDateTimeColumns();
    await ensureTournamentParticipantColumns();

    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      await User.create({
        name: process.env.DEFAULT_ADMIN_NAME || 'Admin',
        username: (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase(),
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        active: true,
      });
      console.log('Default admin user created (username: admin)');
    }

    const endpoint = process.env.SQL_INSTANCE
      ? `${process.env.SQL_HOST || 'localhost'}\\${process.env.SQL_INSTANCE}`
      : `${process.env.SQL_HOST || 'localhost'}:${process.env.SQL_PORT || 1433}`;
    console.log(`SQL Server Connected: ${endpoint}`);
    return sequelize;
  } catch (error) {
    console.error(`⚠️  SQL Server Initialization Error: ${error.message}`);
    console.error('Server will start anyway. Some features may not work until SQL Server is running.');
    console.error('Set SQL_HOST, SQL_PORT, SQL_DATABASE, SQL_USER, SQL_PASSWORD in backend/.env');
    // Don't exit, let server run anyway
  }
};

module.exports = { connectDB, sequelize };
