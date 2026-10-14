const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireFeature } = auth;

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
router.use(auth, requireFeature('reports'));

// GET /api/reports/vehicles?basis=sold|arrived|stock&from=YYYY-MM-DD&to=YYYY-MM-DD
// Машин бүр нэг мөр: статус, ирсэн/зарсан огноо, өртөг, үнэ, ашиг. Тайлангийн стандарт баганууд.
//   sold    - борлуулсан огноогоор шүүнэ (зөвхөн зарагдсан машин)
//   arrived - ирсэн огноогоор шүүнэ (бүх статус)
//   stock   - одоогийн агуулах (зарагдаагүй машин, огноогоор шүүхгүй)
router.get('/vehicles', auth, async (req, res) => {
  const basis = ['sold', 'arrived', 'stock'].includes(req.query.basis) ? req.query.basis : 'sold';
  const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const from = isDate(req.query.from) ? req.query.from : null;
  const to   = isDate(req.query.to) ? req.query.to : null;

  const params = [req.user.company_id];
  const where = ['v.company_id = $1'];
  const arrivedExpr = 'COALESCE(v.arrived_at, v.created_at::date)';

  if (basis === 'sold') where.push('s.id IS NOT NULL');
  if (basis === 'stock') where.push("v.status <> 'SOLD'");
  const dateExpr = basis === 'sold' ? 's.sold_at::date' : basis === 'arrived' ? arrivedExpr : null;
  if (dateExpr && from) { params.push(from); where.push(`${dateExpr} >= $${params.length}`); }
  if (dateExpr && to)   { params.push(to);   where.push(`${dateExpr} <= $${params.length}`); }

  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.vin, v.brand, v.model, v.year, v.color, v.mileage, v.fuel_type, v.transmission,
              v.engine_cc, v.status,
              to_char(${arrivedExpr}, 'YYYY-MM-DD') AS arrived_at,
              to_char(s.sold_at::date, 'YYYY-MM-DD') AS sold_at,
              CASE WHEN s.id IS NOT NULL THEN (s.sold_at::date - ${arrivedExpr})
                   ELSE (CURRENT_DATE - ${arrivedExpr}) END AS days_in_stock,
              COALESCE(costs.total_cost, 0) AS total_cost,
              s.sale_price, s.payment_type,
              CASE WHEN s.id IS NOT NULL THEN s.sale_price - COALESCE(costs.total_cost, 0) END AS profit,
              c.name AS customer_name, c.phone AS customer_phone, u.name AS sold_by_name
       FROM vehicles v
       LEFT JOIN sales s ON s.vehicle_id = v.id
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.sold_by
       LEFT JOIN (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id) costs
              ON costs.vehicle_id = v.id
       WHERE ${where.join(' AND ')}
       ORDER BY ${basis === 'sold' ? 's.sold_at' : arrivedExpr} DESC, v.brand, v.model`,
      params
    );

    const num = (x) => Number(x) || 0;
    const soldRows = rows.filter(r => r.status === 'SOLD' && r.sale_price != null);
    const revenue = soldRows.reduce((a, r) => a + num(r.sale_price), 0);
    const soldCost = soldRows.reduce((a, r) => a + num(r.total_cost), 0);
    const byStatus = { ARRIVED: 0, PUBLISHED: 0, RESERVED: 0, SOLD: 0 };
    rows.forEach(r => { if (r.status in byStatus) byStatus[r.status]++; });
    const months = {};
    soldRows.forEach(r => {
      const k = String(r.sold_at).slice(0, 7);
      const m = (months[k] ||= { month: k, count: 0, revenue: 0, profit: 0 });
      m.count++; m.revenue += num(r.sale_price); m.profit += num(r.profit);
    });

    res.json({
      basis, from, to,
      summary: {
        total: rows.length, by_status: byStatus, sold: soldRows.length,
        revenue, cost: soldCost, profit: revenue - soldCost,
        margin: revenue > 0 ? ((revenue - soldCost) / revenue) * 100 : 0,
        avg_days_to_sell: soldRows.length ? soldRows.reduce((a, r) => a + num(r.days_in_stock), 0) / soldRows.length : 0,
        stock_value: rows.filter(r => r.status !== 'SOLD').reduce((a, r) => a + num(r.total_cost), 0),
      },
      months: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)),
      rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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

// GET /activity — хэн юу хийсэн (бүртгэсэн + зарсан) сар бүрээр
router.get('/activity', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { from, to } = req.query;
  const vf = []; const vv = [cid]; let vi = 2;
  const sf2 = []; const sv = [cid]; let si = 2;
  if (from) { vv.push(from); vf.push(`v.created_at::date >= $${vi++}`); sv.push(from); sf2.push(`s.sold_at::date >= $${si++}`); }
  if (to)   { vv.push(to);   vf.push(`v.created_at::date <= $${vi++}`); sv.push(to);   sf2.push(`s.sold_at::date <= $${si++}`); }
  const vw = vf.length ? ' AND ' + vf.join(' AND ') : '';
  const sw = sf2.length ? ' AND ' + sf2.join(' AND ') : '';

  try {
    const [regRows, saleRows, monthlyReg, monthlySale] = await Promise.all([
      // Хэн хэдэн машин бүртгэсэн
      pool.query(`
        SELECT u.id, u.name, u.role, COUNT(v.id) AS registered_count
        FROM vehicles v
        JOIN users u ON u.id = v.created_by
        WHERE v.company_id=$1${vw}
        GROUP BY u.id, u.name, u.role
        ORDER BY registered_count DESC`, vv),

      // Хэн хэдэн машин зарсан
      pool.query(`
        WITH ${COSTS}
        SELECT u.id, u.name, u.role,
          COUNT(s.id) AS sold_count,
          SUM(s.sale_price) AS revenue,
          SUM(s.sale_price - COALESCE(ca.total_cost,0)) AS profit
        FROM sales s
        JOIN users u ON u.id = s.sold_by
        JOIN vehicles v ON v.id = s.vehicle_id
        LEFT JOIN cost_agg ca ON ca.vehicle_id = s.vehicle_id
        WHERE s.company_id=$1${sw}
        GROUP BY u.id, u.name, u.role
        ORDER BY sold_count DESC`, sv),

      // Сар бүрийн бүртгэл хэн хийсэн
      pool.query(`
        SELECT TO_CHAR(v.created_at,'YYYY-MM') AS month, u.name, COUNT(*) AS count
        FROM vehicles v
        JOIN users u ON u.id = v.created_by
        WHERE v.company_id=$1${vw}
        GROUP BY month, u.name ORDER BY month DESC, count DESC`, vv),

      // Сар бүрийн борлуулалт хэн хийсэн
      pool.query(`
        SELECT TO_CHAR(s.sold_at,'YYYY-MM') AS month, u.name, COUNT(*) AS count,
          SUM(s.sale_price) AS revenue
        FROM sales s
        JOIN users u ON u.id = s.sold_by
        WHERE s.company_id=$1${sw}
        GROUP BY month, u.name ORDER BY month DESC, count DESC`, sv),
    ]);

    res.json({
      registrations: regRows.rows,
      sales:         saleRows.rows,
      monthly_reg:   monthlyReg.rows,
      monthly_sales: monthlySale.rows,
    });
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
