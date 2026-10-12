const { Pool } = require('pg');
require('dotenv').config();

// Neon руу (өөр бүс нутаг) холболт нээх нь ~1с. Холболтыг амьд байлгаж дахин ашиглана.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => console.error('pg pool error:', err.message));

module.exports = pool;
