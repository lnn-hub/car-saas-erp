const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/reports/summary — Нийт KPI
router.get('/summary', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const [vehicles, sales, costs] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) AS count FROM vehicles WHERE company_id=$1 GROUP BY status`, [cid]),
      pool.query(`
        SELECT
          COUNT(*) AS total_sold,
          SUM(sale_price) AS total_revenue,
          AVG(sale_price) AS avg_sale_price,
          SUM(sale_price - COALESCE(c.total_cost,0)) AS total_profit,
          AVG(sale_price - COALESCE(c.total_cost,0)) AS avg_profit
        FROM sales s
        LEFT JOIN (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id) c
          ON c.vehicle_id = s.vehicle_id
        WHERE s.company_id=$1`, [cid]),
      pool.query(`SELECT COUNT(*) AS total FROM vehicles WHERE company_id=$1`, [cid]),
    ]);
    const statusMap = {};
    vehicles.rows.forEach(r => { statusMap[r.status] = Number(r.count); });
    res.json({ ...sales.rows[0], status_counts: statusMap, total_vehicles: Number(costs.rows[0].total) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/aging — Inventory aging (агуулахад хэдэн хоног байв)
router.get('/aging', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rows } = await pool.query(`
      SELECT
        v.id, v.brand, v.model, v.year, v.status,
        CURRENT_DATE - v.created_at::date AS days_in_stock,
        COALESCE(SUM(vc.amount), 0) AS total_cost
      FROM vehicles v
      LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
      WHERE v.company_id = $1 AND v.status != 'SOLD'
      GROUP BY v.id
      ORDER BY days_in_stock DESC`, [cid]);

    const buckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };
    rows.forEach(r => {
      const d = Number(r.days_in_stock);
      if (d <= 30) buckets['0-30'].push(r);
      else if (d <= 60) buckets['31-60'].push(r);
      else if (d <= 90) buckets['61-90'].push(r);
      else buckets['90+'].push(r);
    });
    res.json({ rows, buckets });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/monthly — Сарын борлуулалт (сүүлийн 12 сар)
router.get('/monthly', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(s.sold_at, 'YYYY-MM') AS month,
        COUNT(*) AS sold_count,
        SUM(s.sale_price) AS revenue,
        SUM(s.sale_price - COALESCE(c.total_cost, 0)) AS profit
      FROM sales s
      LEFT JOIN (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id) c
        ON c.vehicle_id = s.vehicle_id
      WHERE s.company_id = $1 AND s.sold_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC`, [cid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/brands — Марк тус бүрийн гүйцэтгэл
router.get('/brands', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rows } = await pool.query(`
      SELECT
        v.brand,
        COUNT(s.id) AS sold_count,
        SUM(s.sale_price) AS revenue,
        AVG(s.sale_price - COALESCE(c.total_cost, 0)) AS avg_profit,
        AVG(s.sold_at::date - v.created_at::date) AS avg_days_to_sell
      FROM vehicles v
      LEFT JOIN sales s ON s.vehicle_id = v.id
      LEFT JOIN (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id) c
        ON c.vehicle_id = v.id
      WHERE v.company_id = $1 AND s.id IS NOT NULL
      GROUP BY v.brand
      ORDER BY sold_count DESC`, [cid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/funnel — Борлуулалтын funnel
router.get('/funnel', auth, async (req, res) => {
  const cid = req.user.company_id;
  try {
    const { rows } = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM vehicles WHERE company_id=$1
      GROUP BY status`, [cid]);
    const map = {};
    rows.forEach(r => { map[r.status] = Number(r.count); });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    res.json({
      total,
      arrived:   map['ARRIVED']   || 0,
      published: map['PUBLISHED'] || 0,
      reserved:  map['RESERVED']  || 0,
      sold:      map['SOLD']      || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
