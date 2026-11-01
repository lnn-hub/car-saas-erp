import pool, { type Db } from '../../db/pool';

export const PAYMENT_TYPES = ['CASH', 'LOAN', 'LEASING'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export interface Sale {
  id: string;
  vehicle_id: string;
  customer_id: string;
  sold_by: string | null;
  sale_price: string;
  payment_type: PaymentType;
  note: string | null;
  sold_at: string;
}

// Жагсаалт: машин, үйлчлүүлэгч, борлуулагч, нийт өртөг, цэвэр ашигтай
export async function listSales() {
  const { rows } = await pool.query<Sale & Record<string, unknown>>(
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
     ORDER BY s.sold_at DESC`,
  );
  return rows;
}

// Машиныг транзакц дотор түгжиж уншина (нэг машиныг зэрэг хоёр удаа зарахаас сэргийлнэ)
export async function lockVehicle(vehicleId: string, db: Db) {
  const { rows } = await db.query<{ id: string; status: string }>(
    'SELECT id, status FROM vehicles WHERE id = $1 FOR UPDATE',
    [vehicleId],
  );
  return rows[0] ?? null;
}

export async function insertSale(
  s: {
    vehicle_id: string;
    customer_id: string;
    sold_by: string;
    sale_price: number;
    payment_type: PaymentType;
    note: string | null;
    sold_at: string | null; // null бол одоо
  },
  db: Db,
) {
  const { rows } = await db.query<Sale>(
    `INSERT INTO sales (vehicle_id, customer_id, sold_by, sale_price, payment_type, note, sold_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamp, NOW())) RETURNING *`,
    [s.vehicle_id, s.customer_id, s.sold_by, s.sale_price, s.payment_type, s.note, s.sold_at],
  );
  return rows[0];
}

export async function markVehicleSold(vehicleId: string, db: Db) {
  await db.query("UPDATE vehicles SET status = 'SOLD', updated_at = NOW() WHERE id = $1", [vehicleId]);
}

// Нийт тойм. Тайлантай адил: зөвхөн төгрөгийн зардал өртөгт орно.
export async function salesSummary() {
  const { rows } = await pool.query<{
    total_sold: string;
    total_revenue: string;
    total_profit: string;
    avg_profit: string;
  }>(
    `SELECT
       COUNT(*) AS total_sold,
       COALESCE(SUM(s.sale_price), 0) AS total_revenue,
       COALESCE(SUM(s.sale_price - COALESCE(costs.total_cost, 0)), 0) AS total_profit,
       COALESCE(AVG(s.sale_price - COALESCE(costs.total_cost, 0)), 0) AS avg_profit
     FROM sales s
     LEFT JOIN (
       SELECT vehicle_id, SUM(amount) FILTER (WHERE COALESCE(currency, 'MNT') = 'MNT') AS total_cost
       FROM vehicle_costs GROUP BY vehicle_id
     ) costs ON costs.vehicle_id = s.vehicle_id`,
  );
  return rows[0];
}
