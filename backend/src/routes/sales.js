const router = require('express').Router();
const { serverError } = require('../utils/http');
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
    serverError(res, err);
  }
});

// POST /api/sales — машин зарах
router.post('/', auth, async (req, res) => {
  const { vehicle_id, customer_id, payment_type, note } = req.body;
  const price = Number(req.body.sale_price);
  if (!vehicle_id || !customer_id || !Number.isFinite(price) || price <= 0)
    return res.status(400).json({ error: 'Машин, үйлчлүүлэгч, зөв үнэ заавал шаардлагатай' });
  if (payment_type && !['CASH', 'LOAN', 'LEASING'].includes(payment_type))
    return res.status(400).json({ error: 'Төлбөрийн хэлбэр буруу байна' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Машин, үйлчлүүлэгч хоёул нэвтэрсэн компанийнх мөн эсэхийг шалгаж, машиныг түгжинэ
    const { rows: [vehicle] } = await client.query(
      'SELECT id, status FROM vehicles WHERE id=$1 AND company_id=$2 FOR UPDATE', [vehicle_id, req.user.company_id]);
    if (!vehicle) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Машин олдсонгүй' }); }
    if (vehicle.status === 'SOLD') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Энэ машин аль хэдийн зарагдсан байна' }); }

    const cust = await client.query('SELECT 1 FROM customers WHERE id=$1 AND company_id=$2', [customer_id, req.user.company_id]);
    if (!cust.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Үйлчлүүлэгч олдсонгүй' }); }

    const { rows } = await client.query(
      `INSERT INTO sales (company_id, vehicle_id, customer_id, sold_by, sale_price, payment_type, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.company_id, vehicle_id, customer_id, req.user.id, price, payment_type || 'CASH', note]
    );

    await client.query(
      `UPDATE vehicles SET status = 'SOLD', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [vehicle_id, req.user.company_id]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Энэ машин аль хэдийн зарагдсан байна' });
    serverError(res, err);
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
    serverError(res, err);
  }
});

module.exports = router;
