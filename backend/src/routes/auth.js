const router = require('express').Router();
const { serverError } = require('../utils/http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getCompany } = require('../db/company');

// Нийтийн бүртгэл байхгүй. Ажилтныг админ Тохиргоо → Ажилтнууд хэсгээс нэмнэ.

async function sendSession(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  const company = await getCompany('name');
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, company_name: company?.name || '' } });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email, нууц үг оруулна уу' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) AND is_active = TRUE', [
      email,
    ]);
    const user = rows[0];
    const BAD = { error: 'И-мэйл эсвэл нууц үг буруу байна' };
    if (!user) {
      await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
      return res.status(401).json(BAD);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(BAD);

    await sendSession(res, user);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/auth/demo — танилцуулгын горим: нууц үггүйгээр анхны админаар нэвтэрнэ.
// Зөвхөн DEMO_LOGIN=true үед ажиллана. Бодит ашиглалтад унтраасан байх ёстой.
router.post('/demo', async (req, res) => {
  if (process.env.DEMO_LOGIN !== 'true') return res.status(404).json({ error: 'Олдсонгүй' });
  try {
    const {
      rows: [user],
    } = await pool.query("SELECT * FROM users WHERE role = 'ADMIN' AND is_active = TRUE ORDER BY created_at LIMIT 1");
    if (!user) return res.status(404).json({ error: 'Админ хэрэглэгч алга' });
    await sendSession(res, user);
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
