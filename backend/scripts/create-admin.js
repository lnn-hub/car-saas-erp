// Шинэ сан дээр анхны админыг үүсгэнэ: node scripts/create-admin.js <и-мэйл> <нууц үг> [нэр]
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

const [email, password, name = 'Админ'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Хэрэглээ: node scripts/create-admin.js <и-мэйл> <нууц үг (8+ тэмдэгт)> [нэр]');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role, is_active) VALUES ($1, lower($2), $3, 'ADMIN', TRUE)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN', is_active = TRUE`,
    [name, email, hash]);
  console.log(`Админ бэлэн: ${email.toLowerCase()}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
