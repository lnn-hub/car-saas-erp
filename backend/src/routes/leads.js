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
       WHERE l.company_id = $1
       ORDER BY (l.status = 'NEW') DESC, l.created_at DESC
       LIMIT 300`, [req.user.company_id]);
    res.json(rows);
  } catch (err) { serverError(res, err); }
});

// GET /api/leads/count — цэсний тэмдэглэгээнд (шинэ хүсэлтийн тоо)
router.get('/count', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS new FROM leads WHERE company_id=$1 AND status='NEW'", [req.user.company_id]);
    res.json(rows[0]);
  } catch (err) { serverError(res, err); }
});

// PATCH /api/leads/:id { status }
router.patch('/:id', async (req, res) => {
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Буруу төлөв' });
  try {
    const { rows } = await pool.query(
      'UPDATE leads SET status=$1 WHERE id=$2 AND company_id=$3 RETURNING id, status',
      [req.body.status, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    serverError(res, err);
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM leads WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!rowCount) return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Хүсэлт олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
