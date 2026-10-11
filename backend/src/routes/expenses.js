const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/expenses — зардлын жагсаалт
router.get('/', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { from, to, category } = req.query;
  const conds = ['e.company_id=$1'];
  const vals  = [cid];
  let i = 2;
  if (from)     { vals.push(from);     conds.push(`e.expense_date >= $${i++}`); }
  if (to)       { vals.push(to);       conds.push(`e.expense_date <= $${i++}`); }
  if (category) { vals.push(category); conds.push(`e.category = $${i++}`); }
  try {
    const { rows } = await pool.query(`
      SELECT e.*, u.name AS created_by_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE ${conds.join(' AND ')}
      ORDER BY e.expense_date DESC, e.created_at DESC`, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/expenses — зардал нэмэх
router.post('/', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { category = 'OTHER', amount, currency = 'MNT', note, expense_date } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Дүн заавал оруулна уу' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO expenses (company_id, category, amount, currency, note, expense_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [cid, category, amount, currency, note || null, expense_date || new Date().toISOString().slice(0,10), req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM expenses WHERE id=$1 AND company_id=$2`, [req.params.id, cid]);
    if (!rowCount) return res.status(404).json({ error: 'Олдсонгүй' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
