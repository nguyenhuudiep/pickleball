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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    // Auto-create/update schema for this small project without a migration tool.
    const { User } = require('../models');
    await sequelize.sync({ alter: true });

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
    console.error(`⚠️  SQL Server Connection Error: ${error.message}`);
    console.error('Server will start anyway. Some features may not work until SQL Server is running.');
    console.error('Set SQL_HOST, SQL_PORT, SQL_DATABASE, SQL_USER, SQL_PASSWORD in backend/.env');
    // Don't exit, let server run anyway
  }
};

module.exports = { connectDB, sequelize };
