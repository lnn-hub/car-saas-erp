import pool, { type Db } from '../../db/pool';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DONE'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_KINDS = ['VIEWING', 'REQUEST'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export interface Lead {
  id: string;
  vehicle_id: string | null;
  kind: LeadKind;
  name: string;
  phone: string;
  preferred_time: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
}

// Шинэ нь эхэндээ, сүүлийн 300
export async function listLeads() {
  const { rows } = await pool.query(
    `SELECT l.id, l.kind, l.name, l.phone, l.preferred_time, l.message, l.status, l.created_at,
            v.id AS vehicle_id, v.brand, v.model, v.year
     FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id
     ORDER BY (l.status = 'NEW') DESC, l.created_at DESC
     LIMIT 300`,
  );
  return rows;
}

export async function countNewLeads() {
  const { rows } = await pool.query<{ new: number }>("SELECT COUNT(*)::int AS new FROM leads WHERE status = 'NEW'");
  return rows[0];
}

export async function insertLead(l: Omit<Lead, 'id' | 'status' | 'created_at'>) {
  await pool.query(
    `INSERT INTO leads (vehicle_id, kind, name, phone, preferred_time, message) VALUES ($1, $2, $3, $4, $5, $6)`,
    [l.vehicle_id, l.kind, l.name, l.phone, l.preferred_time, l.message],
  );
}

export async function setLeadStatus(id: string, status: LeadStatus, db: Db = pool) {
  const { rows } = await db.query<{ id: string; status: LeadStatus }>(
    'UPDATE leads SET status = $1 WHERE id = $2 RETURNING id, status',
    [status, id],
  );
  return rows[0] ?? null;
}

// Транзакц дотор түгжиж уншина (давхар үйлчлүүлэгч үүсэхээс сэргийлнэ)
export async function lockLead(id: string, db: Db) {
  const { rows } = await db.query<Lead>('SELECT * FROM leads WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function deleteLead(id: string) {
  const { rowCount } = await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  return !!rowCount;
}
