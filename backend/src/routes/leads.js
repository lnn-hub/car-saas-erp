const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const STATUSES = ['NEW', 'CONTACTED', 'DONE'];

router.use(auth);

// GET /api/leads — сайтаас ирсэн хүсэлтүүд (шинэ нь эхэндээ)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.kind, l.name, l.phone, l.preferred_time, l.message, l.status, l.created_at,
              v.id AS vehicle_id, v.brand, v.model, v.year
       FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id
       ORDER BY (l.status = 'NEW') DESC, l.created_at DESC
       LIMIT 300`);
    res.json(rows);
  } catch (err) { serverError(res, err); }
});

// GET /api/leads/count — цэсний тэмдэглэгээнд (шинэ хүсэлтийн тоо)
router.get('/count', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS new FROM leads WHERE status='NEW'");
    res.json(rows[0]);
  } catch (err) { serverError(res, err); }
});

// PATCH /api/leads/:id { status }
router.patch('/:id', async (req, res) => {
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Буруу төлөв' });
  try {
    const { rows } = await pool.query(
      'UPDATE leads SET status=$1 WHERE id=$2 RETURNING id, status',
      [req.body.status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    serverError(res, err);
  }
});

// POST /api/leads/:id/customer — хүсэлтийг үйлчлүүлэгч болгох (утсаар давхцвал байгааг нь ашиглана)
router.post('/:id/customer', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [l] } = await client.query('SELECT * FROM leads WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!l) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Хүсэлт олдсонгүй' }); }
    const digits = String(l.phone).replace(/\D/g, '');
    const { rows: [existing] } = await client.query(
      `SELECT * FROM customers WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE '%' || $1 LIMIT 1`,
      [digits.slice(-8)]);
    let customer = existing, created = false;
    if (!customer) {
      const note = [l.preferred_time && `Хүссэн цаг: ${l.preferred_time}`, l.message].filter(Boolean).join('\n') || null;
      ({ rows: [customer] } = await client.query(
        'INSERT INTO customers (name, phone, note) VALUES ($1,$2,$3) RETURNING *',
        [l.name, l.phone, note]));
      created = true;
    }
    if (l.status === 'NEW') await client.query("UPDATE leads SET status='CONTACTED' WHERE id=$1", [l.id]);
    await client.query('COMMIT');
    res.status(created ? 201 : 200).json({ customer, created });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '22P02') return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    serverError(res, err);
  } finally { client.release(); }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM leads WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
