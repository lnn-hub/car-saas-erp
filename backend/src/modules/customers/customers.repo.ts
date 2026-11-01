import pool, { type Db } from '../../db/pool';
import { updateSet } from '../../lib/sql';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  register: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
}
export type CustomerInput = Omit<Customer, 'id' | 'created_at'>;

// Утасны дугаарын сүүлийн 8 оронгоор харьцуулна (+976, зай, зураасыг үл тооно)
const phoneTail = (phone: string | null | undefined) =>
  String(phone || '')
    .replace(/\D/g, '')
    .slice(-8);

export async function searchCustomers(q: string) {
  const { rows } = await pool.query(
    `SELECT id, name, phone, email FROM customers
     WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 20`,
    [`%${q}%`],
  );
  return rows;
}

export async function listAllCustomers(): Promise<Customer[]> {
  const { rows } = await pool.query<Customer>('SELECT * FROM customers ORDER BY created_at DESC');
  return rows;
}

// Худалдан авалтын тоо, нийт дүнтэй жагсаалт
export async function listCustomersWithStats() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.phone, c.email, c.note, c.created_at,
            COUNT(s.id)::int AS purchases,
            COALESCE(SUM(s.sale_price), 0) AS total_spent,
            MAX(s.sold_at) AS last_purchase_at
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     GROUP BY c.id
     ORDER BY COALESCE(MAX(s.sold_at), c.created_at) DESC`,
  );
  return rows;
}

export async function findCustomer(id: string, db: Db = pool) {
  const { rows } = await db.query<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function customerExists(id: string, db: Db = pool) {
  const { rowCount } = await db.query('SELECT 1 FROM customers WHERE id = $1', [id]);
  return !!rowCount;
}

export async function findCustomerByPhone(phone: string, db: Db = pool) {
  const { rows } = await db.query<Customer>(
    `SELECT * FROM customers WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE '%' || $1 LIMIT 1`,
    [phoneTail(phone)],
  );
  return rows[0] ?? null;
}

export async function customerPurchases(customerId: string) {
  const { rows } = await pool.query(
    `SELECT s.id, s.sale_price, s.payment_type, s.sold_at, v.id AS vehicle_id, v.brand, v.model, v.year
     FROM sales s JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.customer_id = $1 ORDER BY s.sold_at DESC`,
    [customerId],
  );
  return rows;
}

// Утас нь таарсан, сайтаас ирсэн хүсэлтүүд (8-аас цөөн оронтой утсанд хайхгүй)
export async function leadsByPhone(phone: string | null) {
  const tail = phoneTail(phone);
  if (tail.length < 8) return [];
  const { rows } = await pool.query(
    `SELECT l.id, l.kind, l.preferred_time, l.message, l.status, l.created_at, v.brand, v.model, v.year
     FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id
     WHERE regexp_replace(l.phone, '\\D', '', 'g') LIKE '%' || $1
     ORDER BY l.created_at DESC LIMIT 50`,
    [tail],
  );
  return rows;
}

export async function insertCustomer(c: Partial<CustomerInput> & { name: string }, db: Db = pool) {
  const { rows } = await db.query<Customer>(
    `INSERT INTO customers (name, phone, email, register, address, note)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [c.name, c.phone ?? null, c.email ?? null, c.register ?? null, c.address ?? null, c.note ?? null],
  );
  return rows[0];
}

export async function updateCustomer(id: string, values: Partial<CustomerInput>) {
  const set = updateSet(values);
  const { rows } = await pool.query<Customer>(
    `UPDATE customers SET ${set.sql} WHERE id = $${set.params.length + 1} RETURNING *`,
    [...set.params, id],
  );
  return rows[0] ?? null;
}

export async function hasPurchases(customerId: string) {
  const { rowCount } = await pool.query('SELECT 1 FROM sales WHERE customer_id = $1 LIMIT 1', [customerId]);
  return !!rowCount;
}

export async function deleteCustomer(id: string) {
  const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  return !!rowCount;
}
