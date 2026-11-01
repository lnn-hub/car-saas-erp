// Өгөгдлийн сангийн migration. migrations/ доторх NNN_нэр.sql файлуудыг дарааллаар нь, тус бүрийг
// нэг транзакцаар ажиллуулж schema_migrations хүснэгтэд тэмдэглэнэ. Ажилласан файлыг дахин ажиллуулахгүй.
// Шинэ өөрчлөлт: дараагийн дугаартай файл нэмнэ (хуучин файлыг хэзээ ч засахгүй).
//
//   npm run migrate          — хүлээгдэж буй migration-уудыг ажиллуулна
//   Сервер асахдаа мөн автоматаар ажиллуулна (src/index.js).
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

const DIR = path.join(__dirname, 'migrations');
const LOCK_ID = 727274; // нэг зэрэг хоёр сервер migration ажиллуулахаас сэргийлнэ

async function migrate({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = fs
      .readdirSync(DIR)
      .filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`Migration ажиллалаа: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${file} амжилтгүй: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => console.log('Migration: бүгд шинэчлэгдсэн'))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
