const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { q } = req.query;
  let query, params;
  if (q) {
    query  = `SELECT id, name, phone, email FROM customers WHERE company_id=$1 AND (name ILIKE $2 OR phone ILIKE $2) ORDER BY name LIMIT 20`;
    params = [req.user.company_id, `%${q}%`];
  } else {
    query  = 'SELECT * FROM customers WHERE company_id=$1 ORDER BY created_at DESC';
    params = [req.user.company_id];
  }
  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, phone, email, register, address, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Нэр заавал шаардлагатай' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (company_id, name, phone, email, register, address, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.company_id, name, phone, email, register, address, note]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
