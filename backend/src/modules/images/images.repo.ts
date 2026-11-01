import pool, { withTransaction } from '../../db/pool';

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  url: string;
  is_main: boolean;
  sort_order: number;
  created_at: string;
}

export async function listVehicleImages(vehicleId: string): Promise<VehicleImage[]> {
  const { rows } = await pool.query<VehicleImage>(
    'SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order',
    [vehicleId],
  );
  return rows;
}

export async function findImage(id: string) {
  const { rows } = await pool.query<VehicleImage>('SELECT * FROM vehicle_images WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function imageStats(vehicleId: string) {
  const { rows } = await pool.query<{ cnt: number; max: number }>(
    'SELECT COUNT(*)::int AS cnt, COALESCE(MAX(sort_order), -1)::int AS max FROM vehicle_images WHERE vehicle_id = $1',
    [vehicleId],
  );
  return rows[0];
}

export async function insertImage(img: { vehicle_id: string; url: string; is_main: boolean; sort_order: number }) {
  const { rows } = await pool.query<VehicleImage>(
    'INSERT INTO vehicle_images (vehicle_id, url, is_main, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
    [img.vehicle_id, img.url, img.is_main, img.sort_order],
  );
  return rows[0];
}

// Зургийг устгаад, үндсэн зураг байсан бол дараагийнхыг үндсэн болгоно
export async function deleteImageRow(img: VehicleImage) {
  await withTransaction(async (db) => {
    await db.query('DELETE FROM vehicle_images WHERE id = $1', [img.id]);
    if (img.is_main) {
      await db.query(
        `UPDATE vehicle_images SET is_main = TRUE
         WHERE id = (SELECT id FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order LIMIT 1)`,
        [img.vehicle_id],
      );
    }
  });
}

// Шинэ дараалал. Эхний зураг үндсэн болно.
export async function reorderImages(ids: string[]) {
  await withTransaction(async (db) => {
    for (const [i, id] of ids.entries()) {
      await db.query('UPDATE vehicle_images SET sort_order = $1, is_main = $2 WHERE id = $3', [i, i === 0, id]);
    }
  });
}
