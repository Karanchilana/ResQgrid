const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resqgrid',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_resqgrid_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
};
