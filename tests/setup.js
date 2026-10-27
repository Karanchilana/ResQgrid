const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');

const TEST_DB_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/resqgrid_test';

/**
 * Setup test database before running test suite
 */
const setupTestDB = () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(TEST_DB_URI);
    }
  }, 30000);

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });
};

/**
 * Helper to create standard test users with tokens
 */
const createTestUsers = async () => {
  const admin = await User.create({
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });

  const contributor1 = await User.create({
    name: 'Contributor 1',
    email: 'contrib1@test.com',
    password: 'password123',
    role: 'contributor',
  });

  const contributor2 = await User.create({
    name: 'Contributor 2',
    email: 'contrib2@test.com',
    password: 'password123',
    role: 'contributor',
  });

  const adminToken = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1h' });
  const contrib1Token = jwt.sign({ id: contributor1._id }, JWT_SECRET, { expiresIn: '1h' });
  const contrib2Token = jwt.sign({ id: contributor2._id }, JWT_SECRET, { expiresIn: '1h' });

  return {
    admin,
    contributor1,
    contributor2,
    adminToken,
    contrib1Token,
    contrib2Token,
  };
};

module.exports = {
  setupTestDB,
  createTestUsers,
  TEST_DB_URI,
};
