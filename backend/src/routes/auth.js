const router = require('express').Router();
const { serverError } = require('../utils/http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Олон компанит серверт нийтийн бүртгэл хаалттай. Компанийг суперадмин нэмнэ.
const superEmails = () => (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// POST /api/auth/register — шинэ компани + admin хэрэглэгч үүсгэх
router.post('/register', async (req, res) => {
  if (process.env.ALLOW_REGISTRATION !== 'true')
    return res.status(403).json({ error: 'Бүртгэл хаалттай. Компани нэмэхийг системийн админд хандана уу' });
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

    // Slug автоматаар үүсгэх
    const slug = (company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g,'-').slice(0,25) || 'company')
      + '-' + Math.random().toString(36).slice(2, 6);

    // Компани үүсгэх
    const { rows: companies } = await client.query(
      `INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id`,
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
    serverError(res, err);
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
      `SELECT u.*, c.is_active AS company_active, c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );
    const user = rows[0];
    const BAD = { error: 'И-мэйл эсвэл нууц үг буруу байна' };
    if (!user) { await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali'); return res.status(401).json(BAD); }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(BAD);

    const superadmin = superEmails().includes(String(user.email).toLowerCase());
    if (user.company_active === false && !superadmin)
      return res.status(403).json({ error: 'Танай компанийн эрх түр хаагдсан байна' });

    const token = jwt.sign(
      { id: user.id, company_id: user.company_id, role: user.role, ...(superadmin ? { superadmin: true } : {}) },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role, superadmin, company_name: user.company_name } });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
