const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM customers WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  );
  res.json(rows);
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
