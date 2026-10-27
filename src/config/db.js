const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async (uri = MONGO_URI) => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[Database Error] Connection failed: ${err.message}`);
    throw err;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (err) {
    console.error(`[Database Error] Disconnect failed: ${err.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
