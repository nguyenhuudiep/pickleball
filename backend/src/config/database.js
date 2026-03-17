const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const cleanupLegacyUserIndexes = async (connection) => {
  try {
    const usersCollection = connection.db.collection('users');
    const indexes = await usersCollection.indexes();
    const emailIndex = indexes.find((index) => index.key && index.key.email === 1 && index.unique);

    if (emailIndex) {
      await usersCollection.dropIndex(emailIndex.name);
      console.log(`Dropped legacy users index: ${emailIndex.name}`);
    }
  } catch (error) {
    console.warn(`Could not cleanup legacy users indexes: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pickleball', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await cleanupLegacyUserIndexes(conn.connection);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`⚠️  MongoDB Connection Error: ${error.message}`);
    console.error('Server will start anyway. Some features may not work until MongoDB is running.');
    console.error('To run MongoDB locally, use: mongod');
    console.error('Or set MONGODB_URI to MongoDB Atlas connection string in .env');
    // Don't exit, let server run anyway
  }
};

module.exports = connectDB;
