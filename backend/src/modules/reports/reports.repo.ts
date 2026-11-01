import pool from '../../db/pool';

// Өртөг: зөвхөн төгрөгийн (MNT) зардал нийлнэ. Өөр валютын зардал байвал other_ccy = true гэж тэмдэглэнэ.
const MNT_COSTS = `costs AS (
  SELECT vehicle_id,
         COALESCE(SUM(amount) FILTER (WHERE COALESCE(currency, 'MNT') = 'MNT'), 0) AS cost,
         BOOL_OR(COALESCE(currency, 'MNT') <> 'MNT') AS other_ccy
  FROM vehicle_costs GROUP BY vehicle_id)`;
// Ирсэн огноо: заагаагүй бол бүртгэсэн өдөр
const ARRIVED = 'COALESCE(v.arrived_at, v.created_at::date)';

export const num = (x: unknown) => Number(x) || 0;

export interface MonthSummary {
  month: string;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avg_days_to_sell: number;
  arrived: number;
  arrived_cost: number;
  stock_count: number;
  stock_value: number;
}

// Сарын тойм: зарагдсан (орлого, өртөг, ашиг, дундаж хоног), ирсэн, сарын эцсийн үлдэгдэл
export async function monthSummary(ym: string, start: string, end: string): Promise<MonthSummary> {
  const [sold, arrived, stock] = await Promise.all([
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(s.sale_price), 0) AS revenue,
              COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS cost,
              COALESCE(AVG(s.sold_at::date - ${ARRIVED}), 0) AS avg_days
       FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN costs c ON c.vehicle_id = v.id
       WHERE s.sold_at >= $1 AND s.sold_at < $2`,
      [start, end],
    ),
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS cost
       FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
       WHERE ${ARRIVED} >= $1 AND ${ARRIVED} < $2`,
      [start, end],
    ),
    // Сарын эцэст агуулахад байсан: тэр сарын төгсгөлөөс өмнө ирсэн, тэр үед зарагдаагүй
    pool.query(
      `WITH ${MNT_COSTS}
       SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(c.cost, 0)), 0) AS value
       FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
       LEFT JOIN sales s ON s.vehicle_id = v.id
       WHERE ${ARRIVED} < $1 AND (s.id IS NULL OR s.sold_at >= $1)`,
      [end],
    ),
  ]);
  const so = sold.rows[0];
  const ar = arrived.rows[0];
  const st = stock.rows[0];
  const revenue = num(so.revenue);
  const cost = num(so.cost);
  const profit = revenue - cost;
  return {
    month: ym,
    sold: num(so.count),
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    avg_days_to_sell: Math.round(num(so.avg_days)),
    arrived: num(ar.count),
    arrived_cost: num(ar.cost),
    stock_count: num(st.count),
    stock_value: num(st.value),
  };
}

export interface SoldRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
  color: string | null;
  arrived_at: string;
  sold_at: string;
  days: number;
  cost: string;
  other_ccy: boolean;
  sale_price: string;
  profit: string;
  payment_type: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sold_by_name: string | null;
}

export async function soldInMonth(start: string, end: string) {
  const { rows } = await pool.query<SoldRow>(
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
     WHERE s.sold_at >= $1 AND s.sold_at < $2
     ORDER BY s.sold_at`,
    [start, end],
  );
  return rows;
}

export async function arrivedInMonth(start: string, end: string) {
  const { rows } = await pool.query<{ other_ccy: boolean } & Record<string, unknown>>(
    `WITH ${MNT_COSTS}
     SELECT v.id, v.brand, v.model, v.year, v.status, v.price,
            to_char(${ARRIVED}, 'YYYY-MM-DD') AS arrived_at,
            COALESCE(c.cost, 0) AS cost, COALESCE(c.other_ccy, FALSE) AS other_ccy
     FROM vehicles v LEFT JOIN costs c ON c.vehicle_id = v.id
     WHERE ${ARRIVED} >= $1 AND ${ARRIVED} < $2
     ORDER BY ${ARRIVED}`,
    [start, end],
  );
  return rows;
}

// Энэ сард бүртгэгдсэн зардал, төрөл ба валютаар
export async function expensesInMonth(start: string, end: string) {
  const { rows } = await pool.query<{ cost_type: string; currency: string; count: string; amount: string }>(
    `SELECT vc.cost_type, COALESCE(vc.currency, 'MNT') AS currency, COUNT(*) AS count, SUM(vc.amount) AS amount
     FROM vehicle_costs vc JOIN vehicles v ON v.id = vc.vehicle_id
     WHERE vc.created_at >= $1 AND vc.created_at < $2
     GROUP BY vc.cost_type, COALESCE(vc.currency, 'MNT')
     ORDER BY SUM(vc.amount) DESC`,
    [start, end],
  );
  return rows.map((r) => ({ ...r, count: num(r.count), amount: num(r.amount) }));
}

export async function salesByMonth(year: number) {
  const { rows } = await pool.query<{ month: string; sold: string; revenue: string; profit: string }>(
    `WITH ${MNT_COSTS}
     SELECT to_char(s.sold_at, 'YYYY-MM') AS month, COUNT(*) AS sold,
            SUM(s.sale_price) AS revenue, SUM(s.sale_price - COALESCE(c.cost, 0)) AS profit
     FROM sales s LEFT JOIN costs c ON c.vehicle_id = s.vehicle_id
     WHERE s.sold_at >= $1 AND s.sold_at < $2
     GROUP BY 1`,
    [`${year}-01-01`, `${year + 1}-01-01`],
  );
  return rows;
}

export async function arrivedByMonth(year: number) {
  const { rows } = await pool.query<{ month: string; arrived: string }>(
    `SELECT to_char(${ARRIVED}, 'YYYY-MM') AS month, COUNT(*) AS arrived
     FROM vehicles v WHERE ${ARRIVED} >= $1 AND ${ARRIVED} < $2
     GROUP BY 1`,
    [`${year}-01-01`, `${year + 1}-01-01`],
  );
  return rows;
}
