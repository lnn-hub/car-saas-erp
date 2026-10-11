const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/sales — борлуулалтын жагсаалт
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
        v.brand, v.model, v.year, v.vin,
        c.name AS customer_name, c.phone AS customer_phone,
        u.name AS sold_by_name,
        COALESCE(costs.total_cost, 0) AS total_cost,
        s.sale_price - COALESCE(costs.total_cost, 0) AS net_profit
       FROM sales s
       JOIN vehicles v ON v.id = s.vehicle_id
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.sold_by
       LEFT JOIN (
         SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id
       ) costs ON costs.vehicle_id = s.vehicle_id
       WHERE s.company_id = $1
       ORDER BY s.sold_at DESC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales — машин зарах
router.post('/', auth, async (req, res) => {
  const { vehicle_id, customer_id, sale_price, payment_type, note } = req.body;
  if (!vehicle_id || !customer_id || !sale_price)
    return res.status(400).json({ error: 'Машин, үйлчлүүлэгч, үнэ заавал шаардлагатай' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO sales (company_id, vehicle_id, customer_id, sold_by, sale_price, payment_type, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.company_id, vehicle_id, customer_id, req.user.id, sale_price, payment_type || 'CASH', note]
    );

    await client.query(
      `UPDATE vehicles SET status = 'SOLD', updated_at = NOW() WHERE id = $1`,
      [vehicle_id]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/sales/summary — нийт тайлан
router.get('/summary', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) AS total_sold,
        SUM(s.sale_price) AS total_revenue,
        SUM(s.sale_price - COALESCE(costs.total_cost, 0)) AS total_profit
       FROM sales s
       LEFT JOIN (
         SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id
       ) costs ON costs.vehicle_id = s.vehicle_id
       WHERE s.company_id = $1`,
      [req.user.company_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
