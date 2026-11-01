import pool from '../../db/pool';
import { updateSet } from '../../lib/sql';
import type { CreateVehicleInput } from './vehicles.schema';

export interface Vehicle {
  id: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  engine_cc: number | null;
  status: string;
  description: string | null;
  arrived_at: string | null;
  manufactured_date: string | null;
  has_plates: boolean;
  price: string | null;
  prev_price: string | null;
  price_changed_at: string | null;
  fb_post_url: string | null;
  fb_posted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Админы жагсаалт: нийт өртөг, үндсэн зурагтай
export async function listVehicles() {
  const { rows } = await pool.query<Vehicle & { total_cost: string; main_image: string | null }>(
    `SELECT v.*,
       COALESCE(SUM(vc.amount), 0) AS total_cost,
       (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image
     FROM vehicles v
     LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
     GROUP BY v.id
     ORDER BY v.created_at DESC`,
  );
  return rows;
}

// Нийтэд харагдах талбарууд (whitelist). vin, created_by, status, зардал зэрэг дотоод мэдээлэл ОРОХГҮЙ.
// Үнэ буурсныг 30 хоногийн турш харуулна.
const PUBLIC_COLS = `v.id, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission,
  v.engine_cc, v.mileage, v.description, v.has_plates, v.manufactured_date, v.price,
  CASE WHEN v.prev_price > v.price AND v.price_changed_at > NOW() - INTERVAL '30 days' THEN v.prev_price END AS prev_price`;

export type PublicVehicle = Pick<
  Vehicle,
  | 'id'
  | 'brand'
  | 'model'
  | 'year'
  | 'color'
  | 'fuel_type'
  | 'transmission'
  | 'engine_cc'
  | 'mileage'
  | 'description'
  | 'has_plates'
  | 'manufactured_date'
  | 'price'
  | 'prev_price'
> & { images: string[] };

// Сайтын жагсаалт: зөвхөн нийтлэгдсэн машин, үндсэн зураг ба бүх зургийн холбоос
export async function listPublicVehicles() {
  const { rows } = await pool.query<PublicVehicle & { main_image: string | null }>(
    `SELECT ${PUBLIC_COLS},
       (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image,
       ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
     FROM vehicles v
     WHERE v.status = 'PUBLISHED'
     ORDER BY v.created_at DESC`,
  );
  return rows;
}

export async function findPublicVehicle(id: string) {
  const { rows } = await pool.query<PublicVehicle>(
    `SELECT ${PUBLIC_COLS},
       ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
     FROM vehicles v
     WHERE v.id = $1 AND v.status = 'PUBLISHED'`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findVehicle(id: string) {
  const { rows } = await pool.query<Vehicle>('SELECT * FROM vehicles WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function vehicleExists(id: string) {
  const { rowCount } = await pool.query('SELECT 1 FROM vehicles WHERE id = $1', [id]);
  return !!rowCount;
}

export async function insertVehicle(v: CreateVehicleInput, createdBy: string) {
  const { rows } = await pool.query<Vehicle>(
    `INSERT INTO vehicles (vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description,
                           arrived_at, manufactured_date, has_plates, created_by, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED') RETURNING *`,
    [
      v.vin,
      v.brand,
      v.model,
      v.year,
      v.mileage,
      v.color,
      v.fuel_type,
      v.transmission,
      v.engine_cc,
      v.description,
      v.arrived_at,
      v.manufactured_date,
      v.has_plates,
      createdBy,
      v.price,
    ],
  );
  return rows[0];
}

// Өгсөн талбаруудыг шинэчилнэ. touchPrice бол үнэ өөрчлөгдсөн огноог тэмдэглэнэ.
export async function updateVehicle(id: string, values: Record<string, unknown>, { touchPrice = false } = {}) {
  const set = updateSet(values);
  const extra = [touchPrice && 'price_changed_at = NOW()', 'updated_at = NOW()'].filter(Boolean).join(', ');
  const { rows } = await pool.query<Vehicle>(
    `UPDATE vehicles SET ${set.isEmpty ? '' : `${set.sql}, `}${extra} WHERE id = $${set.params.length + 1} RETURNING *`,
    [...set.params, id],
  );
  return rows[0] ?? null;
}

export async function hasSale(vehicleId: string) {
  const { rowCount } = await pool.query('SELECT 1 FROM sales WHERE vehicle_id = $1 LIMIT 1', [vehicleId]);
  return !!rowCount;
}

// Машиныг устгахад зураг, зардал нь хамт устгагдана (ON DELETE CASCADE)
export async function deleteVehicle(id: string) {
  await pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
}

export async function listCosts(vehicleId: string) {
  const { rows } = await pool.query('SELECT * FROM vehicle_costs WHERE vehicle_id = $1 ORDER BY created_at', [
    vehicleId,
  ]);
  return rows;
}

export async function insertCost(
  vehicleId: string,
  c: { cost_type: string; amount: number; currency: string; note?: string | null },
  createdBy: string,
) {
  const { rows } = await pool.query(
    `INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [vehicleId, c.cost_type, c.amount, c.currency, c.note ?? null, createdBy],
  );
  return rows[0];
}

export async function setFacebookPost(vehicleId: string, url: string) {
  await pool.query('UPDATE vehicles SET fb_post_url = $1, fb_posted_at = NOW() WHERE id = $2', [url, vehicleId]);
}
