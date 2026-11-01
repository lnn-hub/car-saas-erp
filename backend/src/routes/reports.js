const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireFeature, requireMoney } = auth;

router.use(auth, requireMoney, requireFeature('reports'));

// ─── Сарын тайлан ───────────────────────────────────────────────────────────
// Өртөг: зөвхөн төгрөгийн (MNT) зардал нийлнэ. Өөр валютын зардал байвал other_ccy = true гэж тэмдэглэнэ.
const MNT_COSTS = `costs AS (
  SELECT vehicle_id,
         COALESCE(SUM(amount) FILTER (WHERE COALESCE(currency, 'MNT') = 'MNT'), 0) AS cost,
         BOOL_OR(COALESCE(currency, 'MNT') <> 'MNT') AS other_ccy
  FROM vehicle_costs GROUP BY vehicle_id)`;
const ARRIVED = 'COALESCE(v.arrived_at, v.created_at::date)';

const monthStart = (ym) => `${ym}-01`;
function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const num = (x) => Number(x) || 0;

async function monthSummary(cid, ym) {
  const start = monthStart(ym), end = monthStart(addMonths(ym, 1));
  const [sold, arrived, stock] = await Promise.all([
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(s.sale_price), 0) AS revenue,
              COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS cost,
              COALESCE(AVG(s.sold_at::date - ${ARRIVED}), 0) AS avg_days
       FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN costs c ON c.vehicle_id = v.id
       WHERE s.company_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3`, [cid, start, end]),
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS cost
       FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
       WHERE v.company_id = $1 AND ${ARRIVED} >= $2 AND ${ARRIVED} < $3`, [cid, start, end]),
    // Сарын эцэст агуулахад байсан: тэр сарын төгсгөлөөс өмнө ирсэн, тэр үед зарагдаагүй
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS value
       FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
       LEFT JOIN sales s ON s.vehicle_id = v.id
       WHERE v.company_id = $1 AND ${ARRIVED} < $2 AND (s.id IS NULL OR s.sold_at >= $2)`, [cid, end]),
  ]);
  const so = sold.rows[0], ar = arrived.rows[0], st = stock.rows[0];
  const revenue = num(so.revenue), cost = num(so.cost), profit = revenue - cost;
  return {
    month: ym,
    sold: num(so.count), revenue, cost, profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    avg_days_to_sell: Math.round(num(so.avg_days)),
    arrived: num(ar.count), arrived_cost: num(ar.cost),
    stock_count: num(st.count), stock_value: num(st.value),
  };
}

// GET /api/reports/month?month=YYYY-MM
router.get('/month', async (req, res) => {
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || '') ? req.query.month : null;
  if (!ym) return res.status(400).json({ error: 'Сарыг YYYY-MM хэлбэрээр өгнө үү' });
  const cid = req.user.company_id;
  const start = monthStart(ym), end = monthStart(addMonths(ym, 1));
  try {
    const [summary, prev, soldRows, arrivedRows, expenses] = await Promise.all([
      monthSummary(cid, ym),
      monthSummary(cid, addMonths(ym, -1)),
      pool.query(
        `WITH ${MNT_COSTS}
         SELECT v.id, v.brand, v.model, v.year, v.vin, v.color,
                to_char(${ARRIVED}, 'YYYY-MM-DD') AS arrived_at,
                to_char(s.sold_at, 'YYYY-MM-DD') AS sold_at,
                (s.sold_at::date - ${ARRIVED}) AS days,
                COALESCE(c.cost, 0) AS cost, COALESCE(c.other_ccy, FALSE) AS other_ccy,
                s.sale_price, s.sale_price - COALESCE(c.cost, 0) AS profit, s.payment_type,
                cu.name AS customer_name, cu.phone AS customer_phone, u.name AS sold_by_name
         FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
         LEFT JOIN costs c ON c.vehicle_id = v.id
         LEFT JOIN customers cu ON cu.id = s.customer_id
         LEFT JOIN users u ON u.id = s.sold_by
         WHERE s.company_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
         ORDER BY s.sold_at`, [cid, start, end]),
      pool.query(
        `WITH ${MNT_COSTS}
         SELECT v.id, v.brand, v.model, v.year, v.status, v.price,
                to_char(${ARRIVED}, 'YYYY-MM-DD') AS arrived_at,
                COALESCE(c.cost, 0) AS cost, COALESCE(c.other_ccy, FALSE) AS other_ccy
         FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
         WHERE v.company_id = $1 AND ${ARRIVED} >= $2 AND ${ARRIVED} < $3
         ORDER BY ${ARRIVED}`, [cid, start, end]),
      // Энэ сард бүртгэгдсэн зардал, төрлөөр
      pool.query(
        `SELECT vc.cost_type, COALESCE(vc.currency, 'MNT') AS currency, COUNT(*) AS count, SUM(vc.amount) AS amount
         FROM vehicle_costs vc JOIN vehicles v ON v.id = vc.vehicle_id
         WHERE v.company_id = $1 AND vc.created_at >= $2 AND vc.created_at < $3
         GROUP BY vc.cost_type, COALESCE(vc.currency, 'MNT')
         ORDER BY SUM(vc.amount) DESC`, [cid, start, end]),
    ]);

    const sold = soldRows.rows;
    const group = (key) => Object.values(sold.reduce((m, r) => {
      const k = r[key] || '-';
      const g = (m[k] ||= { key: k, count: 0, revenue: 0, profit: 0 });
      g.count++; g.revenue += num(r.sale_price); g.profit += num(r.profit);
      return m;
    }, {})).sort((a, b) => b.revenue - a.revenue);

    res.json({
      month: ym, summary, prev,
      sold, arrived: arrivedRows.rows,
      by_payment: group('payment_type'),
      by_brand: group('brand'),
      expenses: expenses.rows.map(r => ({ ...r, count: num(r.count), amount: num(r.amount) })),
      has_other_currency: sold.some(r => r.other_ccy) || arrivedRows.rows.some(r => r.other_ccy)
        || expenses.rows.some(r => r.currency !== 'MNT'),
    });
  } catch (err) { serverError(res, err); }
});

// GET /api/reports/year?year=YYYY — 12 сар, сар бүрээр
router.get('/year', async (req, res) => {
  const y = /^\d{4}$/.test(req.query.year || '') ? Number(req.query.year) : null;
  if (!y) return res.status(400).json({ error: 'Оныг YYYY хэлбэрээр өгнө үү' });
  const cid = req.user.company_id;
  try {
    const [sales, arrived] = await Promise.all([
      pool.query(
        `WITH ${MNT_COSTS}
         SELECT to_char(s.sold_at, 'YYYY-MM') AS month, COUNT(*) AS sold,
                SUM(s.sale_price) AS revenue, SUM(s.sale_price - COALESCE(c.cost, 0)) AS profit
         FROM sales s LEFT JOIN costs c ON c.vehicle_id = s.vehicle_id
         WHERE s.company_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
         GROUP BY 1`, [cid, `${y}-01-01`, `${y + 1}-01-01`]),
      pool.query(
        `SELECT to_char(${ARRIVED}, 'YYYY-MM') AS month, COUNT(*) AS arrived
         FROM vehicles v WHERE v.company_id = $1 AND ${ARRIVED} >= $2 AND ${ARRIVED} < $3
         GROUP BY 1`, [cid, `${y}-01-01`, `${y + 1}-01-01`]),
    ]);
    const months = Array.from({ length: 12 }, (_, i) => {
      const k = `${y}-${String(i + 1).padStart(2, '0')}`;
      const s = sales.rows.find(r => r.month === k) || {};
      const a = arrived.rows.find(r => r.month === k) || {};
      return { month: k, sold: num(s.sold), revenue: num(s.revenue), profit: num(s.profit), arrived: num(a.arrived) };
    });
    const total = months.reduce((t, m) => ({ sold: t.sold + m.sold, revenue: t.revenue + m.revenue, profit: t.profit + m.profit, arrived: t.arrived + m.arrived }),
      { sold: 0, revenue: 0, profit: 0, arrived: 0 });
    res.json({ year: y, months, total });
  } catch (err) { serverError(res, err); }
});

module.exports = router;
