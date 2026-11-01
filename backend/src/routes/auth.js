const router = require('express').Router();
const { serverError } = require('../utils/http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Нийтийн бүртгэл байхгүй. Ажилтныг админ Тохиргоо → Ажилтнууд хэсгээс нэмнэ.
const superEmails = () => (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email, нууц үг оруулна уу' });

  try {
    const { rows } = await pool.query(
      `SELECT u.*, c.is_active AS company_active, c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE lower(u.email) = lower($1) AND u.is_active = TRUE`,
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
