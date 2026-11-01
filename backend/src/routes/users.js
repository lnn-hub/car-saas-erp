const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin, invalidateUser } = auth;

const ROLES = ['ADMIN', 'SALES', 'FINANCE'];
const FIELDS = 'id, name, email, role, is_active, created_at';

router.use(auth, requireAdmin);

// GET /api/users — ажилтнууд
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${FIELDS} FROM users ORDER BY created_at`);
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/users { name, email, password, role }
router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body.password || '');
  const role = ROLES.includes(req.body.role) ? req.body.role : 'SALES';
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Нэр, зөв и-мэйл оруулна уу' });
  if (password.length < 8) return res.status(400).json({ error: 'Нууц үг хамгийн багадаа 8 тэмдэгт' });
  try {
    const { rows: exists } = await pool.query('SELECT 1 FROM users WHERE lower(email)=$1', [email]);
    if (exists.length) return res.status(409).json({ error: 'Энэ и-мэйлээр бүртгэл аль хэдийн байна' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, is_active) VALUES ($1,$2,$3,$4,TRUE) RETURNING ${FIELDS}`,
      [name, email, hash, role],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /api/users/:id { name?, role?, is_active?, password? }
router.patch('/:id', async (req, res) => {
  const { role, is_active, password } = req.body;
  const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
  if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'Буруу эрх' });
  if (password !== undefined && String(password).length < 8)
    return res.status(400).json({ error: 'Нууц үг хамгийн багадаа 8 тэмдэгт' });
  if (name !== undefined && !name) return res.status(400).json({ error: 'Нэр хоосон байж болохгүй' });
  // Өөрийгөө админаас буулгах, идэвхгүй болгохоос сэргийлнэ (компани админгүй үлдэхгүй)
  if (req.params.id === req.user.id && ((role && role !== 'ADMIN') || is_active === false))
    return res.status(400).json({ error: 'Өөрийнхөө эрхийг бууруулах, идэвхгүй болгох боломжгүй' });
  try {
    const sets = [],
      vals = [];
    if (name !== undefined) {
      vals.push(name);
      sets.push(`name=$${vals.length}`);
    }
    if (role !== undefined) {
      vals.push(role);
      sets.push(`role=$${vals.length}`);
    }
    if (is_active !== undefined) {
      vals.push(!!is_active);
      sets.push(`is_active=$${vals.length}`);
    }
    if (password !== undefined) {
      vals.push(await bcrypt.hash(String(password), 10));
      sets.push(`password=$${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Өөрчлөх зүйл алга' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING ${FIELDS}`,
      vals,
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ажилтан олдсонгүй' });
    invalidateUser(rows[0].id);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Ажилтан олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
