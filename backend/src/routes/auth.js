const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// POST /api/auth/register — шинэ компани + admin хэрэглэгч үүсгэх
router.post('/register', async (req, res) => {
  const { company_name, name, email, password } = req.body;
  if (!company_name || !name || !email || !password)
    return res.status(400).json({ error: 'Бүх талбарыг бөглөнө үү' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Нууц үг хамгийн багадаа 6 тэмдэгт байна' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Имэйл давхардсан эсэх шалгах
    const { rows: existing } = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Энэ имэйл аль хэдийн бүртгэлтэй байна' });
    }

    // Slug автоматаар үүсгэх: "Монгол Авто ХХК" → "mongol-avto-9f2a"
    const baseSlug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9Ѐ-ӿ\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\x00-\x7F]/g, '') // latin only
      .slice(0, 30) || 'company';
    const slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);

    // Компани үүсгэх (14 хоногийн trial)
    const { rows: companies } = await client.query(
      `INSERT INTO companies (name, slug, subscription_status, trial_ends_at)
       VALUES ($1, $2, 'trialing', NOW() + INTERVAL '14 days') RETURNING id`,
      [company_name, slug]
    );
    const company_id = companies[0].id;

    // Admin хэрэглэгч үүсгэх
    const hash = await bcrypt.hash(password, 10);
    const { rows: users } = await client.query(
      `INSERT INTO users (company_id, name, email, password, role)
       VALUES ($1,$2,$3,$4,'ADMIN') RETURNING id, name, role`,
      [company_id, name, email, hash]
    );
    const user = users[0];

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: user.id, company_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email, нууц үг оруулна уу' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Хэрэглэгч олдсонгүй' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Нууц үг буруу' });

    const token = jwt.sign(
      { id: user.id, company_id: user.company_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
