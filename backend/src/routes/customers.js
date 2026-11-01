const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;

const FIELDS = ['name', 'phone', 'email', 'register', 'address', 'note'];
const clean = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);
const LIMITS = { name: 120, phone: 30, email: 120, register: 20, address: 500, note: 2000 };

router.use(auth);

// GET /api/customers?q= — нэр/утсаар хайх (зарах цонхонд)
router.get('/', async (req, res) => {
  const { q } = req.query;
  try {
    const { rows } = q
      ? await pool.query(
          `SELECT id, name, phone, email FROM customers
           WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 20`,
          [`%${q}%`],
        )
      : await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/customers/list — бүх үйлчлүүлэгч, худалдан авалтын тоотой
router.get('/list', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.note, c.created_at,
              COUNT(s.id)::int AS purchases,
              COALESCE(SUM(s.sale_price), 0) AS total_spent,
              MAX(s.sold_at) AS last_purchase_at
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id
       GROUP BY c.id
       ORDER BY COALESCE(MAX(s.sold_at), c.created_at) DESC`,
    );
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/customers/:id — дэлгэрэнгүй: худалдан авалт, сайтаас ирсэн хүсэлтүүд
router.get('/:id', async (req, res) => {
  try {
    const {
      rows: [c],
    } = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    const digits = String(c.phone || '').replace(/\D/g, '');
    const [sales, leads] = await Promise.all([
      pool.query(
        `SELECT s.id, s.sale_price, s.payment_type, s.sold_at, v.id AS vehicle_id, v.brand, v.model, v.year
         FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
         WHERE s.customer_id = $1 ORDER BY s.sold_at DESC`,
        [c.id],
      ),
      digits.length >= 8
        ? pool.query(
            `SELECT l.id, l.kind, l.preferred_time, l.message, l.status, l.created_at, v.brand, v.model, v.year
             FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id
             WHERE regexp_replace(l.phone, '\\D', '', 'g') LIKE '%' || $1
             ORDER BY l.created_at DESC LIMIT 50`,
            [digits.slice(-8)],
          )
        : { rows: [] },
    ]);
    res.json({ ...c, sales: sales.rows, leads: leads.rows });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    serverError(res, err);
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const name = clean(req.body.name, LIMITS.name);
  if (!name) return res.status(400).json({ error: 'Нэр заавал шаардлагатай' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, email, register, address, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, ...FIELDS.slice(1).map((f) => clean(req.body[f], LIMITS[f]))],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /api/customers/:id
router.patch('/:id', async (req, res) => {
  const sets = [],
    vals = [];
  for (const f of FIELDS) {
    if (req.body[f] === undefined) continue;
    const v = clean(req.body[f], LIMITS[f]);
    if (f === 'name' && !v) return res.status(400).json({ error: 'Нэр хоосон байж болохгүй' });
    vals.push(v);
    sets.push(`${f}=$${vals.length}`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Өөрчлөх зүйл алга' });
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING *`,
      vals,
    );
    if (!rows[0]) return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    serverError(res, err);
  }
});

// DELETE /api/customers/:id — худалдан авалтгүй үйлчлүүлэгчийг (админ)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: s } = await pool.query('SELECT 1 FROM sales WHERE customer_id=$1 LIMIT 1', [req.params.id]);
    if (s.length) return res.status(400).json({ error: 'Худалдан авалтын түүхтэй үйлчлүүлэгчийг устгах боломжгүй' });
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
