const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// Dynamic WHERE clause builder for sales queries (base table alias: s, vehicles alias: v)
function sf(q, start) {
  const c = [], v = []; let i = start;
  if (q.from)           { v.push(q.from);           c.push(`s.sold_at::date >= $${i++}`); }
  if (q.to)             { v.push(q.to);             c.push(`s.sold_at::date <= $${i++}`); }
  if (q.brand)          { v.push(q.brand);          c.push(`v.brand = $${i++}`); }
  if (q.payment_type)   { v.push(q.payment_type);  c.push(`s.payment_type = $${i++}`); }
  if (q.sold_by)        { v.push(q.sold_by);       c.push(`s.sold_by = $${i++}`); }
  return { w: c.length ? ' AND ' + c.join(' AND ') : '', v };
}

const COSTS = `cost_agg AS (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id)`;

// GET /summary
router.get('/summary', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { w, v } = sf(req.query, 2);
  try {
    const [veh, sal, tot] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) AS count FROM vehicles WHERE company_id=$1 GROUP BY status`, [cid]),
      pool.query(`
        WITH ${COSTS}
        SELECT
          COUNT(*) AS total_sold,
          SUM(s.sale_price) AS total_revenue,
          AVG(s.sale_price) AS avg_sale_price,
          SUM(s.sale_price - COALESCE(c.total_cost,0)) AS total_profit,
          AVG(s.sale_price - COALESCE(c.total_cost,0)) AS avg_profit
        FROM sales s
        JOIN vehicles v ON v.id = s.vehicle_id
        LEFT JOIN cost_agg c ON c.vehicle_id = s.vehicle_id
        WHERE s.company_id=$1${w}`, [cid, ...v]),
      pool.query(`SELECT COUNT(*) AS total FROM vehicles WHERE company_id=$1`, [cid]),
    ]);
    const sm = {};
    veh.rows.forEach(r => { sm[r.status] = Number(r.count); });
    res.json({ ...sal.rows[0], status_counts: sm, total_vehicles: Number(tot.rows[0].total) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /aging
router.get('/aging', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rows } = await pool.query(`
      SELECT v.id, v.brand, v.model, v.year, v.status,
        CURRENT_DATE - v.created_at::date AS days_in_stock,
        COALESCE(SUM(vc.amount), 0) AS total_cost
      FROM vehicles v
      LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
      WHERE v.company_id=$1 AND v.status != 'SOLD'
      GROUP BY v.id
      ORDER BY days_in_stock DESC`, [cid]);
    const b = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };
    rows.forEach(r => {
      const d = Number(r.days_in_stock);
      if (d <= 30) b['0-30'].push(r);
      else if (d <= 60) b['31-60'].push(r);
      else if (d <= 90) b['61-90'].push(r);
      else b['90+'].push(r);
    });
    res.json({ rows, buckets: b });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /daily — sales grouped by day
router.get('/daily', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { w, v } = sf(req.query, 2);
  try {
    const { rows } = await pool.query(`
      WITH ${COSTS}
      SELECT
        s.sold_at::date AS day,
        COUNT(*) AS sold_count,
        SUM(s.sale_price) AS revenue,
        SUM(s.sale_price - COALESCE(c.total_cost,0)) AS profit,
        STRING_AGG(v.brand || ' ' || v.model, ', ' ORDER BY v.brand) AS vehicles_sold
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      LEFT JOIN cost_agg c ON c.vehicle_id = s.vehicle_id
      WHERE s.company_id=$1${w}
      GROUP BY day
      ORDER BY day DESC`, [cid, ...v]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /monthly — sales grouped by month
router.get('/monthly', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { w, v } = sf(req.query, 2);
  const defaultLimit = (!req.query.from && !req.query.to) ? ` AND s.sold_at >= NOW() - INTERVAL '24 months'` : '';
  try {
    const { rows } = await pool.query(`
      WITH ${COSTS}
      SELECT
        TO_CHAR(s.sold_at, 'YYYY-MM') AS month,
        COUNT(*) AS sold_count,
        SUM(s.sale_price) AS revenue,
        SUM(s.sale_price - COALESCE(c.total_cost,0)) AS profit
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      LEFT JOIN cost_agg c ON c.vehicle_id = s.vehicle_id
      WHERE s.company_id=$1${w}${defaultLimit}
      GROUP BY month
      ORDER BY month ASC`, [cid, ...v]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /brands — per-brand performance
router.get('/brands', auth, async (req, res) => {
  const cid = req.user.company_id;
  // brand filter doesn't apply here (it's the grouping key)
  const { w, v } = sf({ ...req.query, brand: undefined }, 2);
  try {
    const { rows } = await pool.query(`
      WITH ${COSTS}
      SELECT
        v.brand,
        COUNT(s.id) AS sold_count,
        SUM(s.sale_price) AS revenue,
        AVG(s.sale_price - COALESCE(c.total_cost,0)) AS avg_profit,
        SUM(s.sale_price - COALESCE(c.total_cost,0)) AS total_profit,
        AVG(s.sold_at::date - v.created_at::date) AS avg_days_to_sell
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      LEFT JOIN cost_agg c ON c.vehicle_id = s.vehicle_id
      WHERE s.company_id=$1${w}
      GROUP BY v.brand
      ORDER BY sold_count DESC`, [cid, ...v]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /salesperson — per-salesperson performance
router.get('/salesperson', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { w, v } = sf(req.query, 2);
  try {
    const { rows } = await pool.query(`
      WITH ${COSTS}
      SELECT
        u.id AS user_id,
        u.name,
        u.role,
        COUNT(s.id) AS sold_count,
        SUM(s.sale_price) AS revenue,
        AVG(s.sale_price) AS avg_sale_price,
        SUM(s.sale_price - COALESCE(c.total_cost,0)) AS total_profit,
        AVG(s.sale_price - COALESCE(c.total_cost,0)) AS avg_profit
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      JOIN users u ON u.id = s.sold_by
      LEFT JOIN cost_agg c ON c.vehicle_id = s.vehicle_id
      WHERE s.company_id=$1${w}
      GROUP BY u.id, u.name, u.role
      ORDER BY sold_count DESC`, [cid, ...v]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /sales-detail — every sale row with full columns
router.get('/sales-detail', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { w, v } = sf(req.query, 2);
  try {
    const { rows } = await pool.query(`
      WITH ${COSTS}
      SELECT
        s.id,
        s.sold_at,
        v.brand, v.model, v.year, v.vin,
        v.color, v.fuel_type, v.transmission, v.mileage,
        cust.name  AS customer_name,
        cust.phone AS customer_phone,
        u.name     AS sold_by_name,
        COALESCE(ca.total_cost, 0)            AS total_cost,
        s.sale_price,
        s.sale_price - COALESCE(ca.total_cost, 0) AS net_profit,
        s.payment_type
      FROM sales s
      JOIN vehicles v      ON v.id    = s.vehicle_id
      LEFT JOIN customers cust ON cust.id = s.customer_id
      LEFT JOIN users u        ON u.id   = s.sold_by
      LEFT JOIN cost_agg ca    ON ca.vehicle_id = s.vehicle_id
      WHERE s.company_id=$1${w}
      ORDER BY s.sold_at DESC`, [cid, ...v]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /filters — available filter options (brands, salespersons)
router.get('/filters', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const [brands, users] = await Promise.all([
      pool.query(`SELECT DISTINCT brand FROM vehicles WHERE company_id=$1 ORDER BY brand`, [cid]),
      pool.query(`SELECT id, name FROM users WHERE company_id=$1 ORDER BY name`, [cid]),
    ]);
    res.json({ brands: brands.rows.map(r => r.brand), salespersons: users.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
