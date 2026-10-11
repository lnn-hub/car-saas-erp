const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

const COSTS = `cost_agg AS (SELECT vehicle_id, SUM(amount) AS total_cost FROM vehicle_costs GROUP BY vehicle_id)`;

// Build date filter for a given column (no table alias assumed)
function dateFilter(col, from, to, startIdx) {
  const conds = [], vals = [];
  let i = startIdx;
  if (from) { vals.push(from); conds.push(`${col} >= $${i++}`); }
  if (to)   { vals.push(to);   conds.push(`${col} <= $${i++}`); }
  return { where: conds.length ? ' AND ' + conds.join(' AND ') : '', vals, next: i };
}

// GET /api/finance/pl?from=&to=
router.get('/pl', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { from, to } = req.query;

  const sf = dateFilter('s.sold_at::date', from, to, 2);
  const ef = dateFilter('expense_date',    from, to, 2);

  try {
    const [salesRes, expRes] = await Promise.all([
      pool.query(`
        WITH ${COSTS}
        SELECT
          COUNT(*) AS sold_count,
          COALESCE(SUM(s.sale_price), 0) AS revenue,
          COALESCE(SUM(ca.total_cost), 0) AS cogs,
          COALESCE(SUM(s.sale_price - COALESCE(ca.total_cost,0)), 0) AS gross_profit
        FROM sales s
        LEFT JOIN cost_agg ca ON ca.vehicle_id = s.vehicle_id
        WHERE s.company_id=$1${sf.where}`,
        [cid, ...sf.vals]),

      pool.query(`
        SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE company_id=$1${ef.where}
        GROUP BY category
        ORDER BY total DESC`,
        [cid, ...ef.vals]),
    ]);

    const s            = salesRes.rows[0];
    const expenses     = expRes.rows;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.total), 0);
    const revenue      = Number(s.revenue);
    const cogs         = Number(s.cogs);
    const grossProfit  = Number(s.gross_profit);
    const netProfit    = grossProfit - totalExpenses;
    const vat          = revenue * 0.10;

    res.json({
      sold_count:     Number(s.sold_count),
      revenue,
      cogs,
      gross_profit:   grossProfit,
      gross_margin:   revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0',
      expenses,
      total_expenses: totalExpenses,
      net_profit:     netProfit,
      net_margin:     revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0',
      vat,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/finance/cashflow?from=&to=
router.get('/cashflow', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { from, to } = req.query;

  const sf = dateFilter('sold_at::date',  from, to, 2);
  const ef = dateFilter('expense_date',   from, to, 2);

  // Default to last 12 months when no date filter given
  const defaultLimit = (!from && !to) ? ` AND sold_at >= NOW() - INTERVAL '12 months'` : '';
  const defaultLimitE = (!from && !to) ? ` AND expense_date >= NOW() - INTERVAL '12 months'` : '';

  try {
    const [inflow, outflow] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(sold_at, 'YYYY-MM') AS month, SUM(sale_price) AS inflow
        FROM sales
        WHERE company_id=$1${sf.where}${defaultLimit}
        GROUP BY month ORDER BY month`,
        [cid, ...sf.vals]),

      pool.query(`
        SELECT TO_CHAR(expense_date, 'YYYY-MM') AS month, SUM(amount) AS outflow
        FROM expenses
        WHERE company_id=$1${ef.where}${defaultLimitE}
        GROUP BY month ORDER BY month`,
        [cid, ...ef.vals]),
    ]);

    const map = {};
    inflow.rows.forEach(r => {
      map[r.month] = map[r.month] || { month: r.month, inflow: 0, outflow: 0 };
      map[r.month].inflow = Number(r.inflow);
    });
    outflow.rows.forEach(r => {
      map[r.month] = map[r.month] || { month: r.month, inflow: 0, outflow: 0 };
      map[r.month].outflow = Number(r.outflow);
    });

    const rows = Object.values(map)
      .map(r => ({ ...r, net: r.inflow - r.outflow }))
      .sort((a, b) => a.month.localeCompare(b.month));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/finance/expense-summary?from=&to=
router.get('/expense-summary', auth, async (req, res) => {
  const cid = req.user.company_id;
  const { from, to } = req.query;
  const f = dateFilter('expense_date', from, to, 2);
  try {
    const { rows } = await pool.query(`
      SELECT category, COUNT(*) AS count, SUM(amount) AS total
      FROM expenses
      WHERE company_id=$1${f.where}
      GROUP BY category ORDER BY total DESC`,
      [cid, ...f.vals]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
