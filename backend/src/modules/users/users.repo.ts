import pool from '../../db/pool';
import { updateSet } from '../../lib/sql';
import type { Role } from '../../middleware/auth';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}
export type PublicUser = Omit<UserRow, 'password'>;

// Нууц үгийн hash-ийг хэзээ ч буцаахгүй
const FIELDS = 'id, name, email, role, is_active, created_at';

export async function findActiveUserByEmail(email: string) {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE lower(email) = lower($1) AND is_active = TRUE',
    [email],
  );
  return rows[0] ?? null;
}

export async function findFirstActiveAdmin() {
  const { rows } = await pool.query<UserRow>(
    "SELECT * FROM users WHERE role = 'ADMIN' AND is_active = TRUE ORDER BY created_at LIMIT 1",
  );
  return rows[0] ?? null;
}

export async function listUsers() {
  const { rows } = await pool.query<PublicUser>(`SELECT ${FIELDS} FROM users ORDER BY created_at`);
  return rows;
}

export async function emailExists(email: string) {
  const { rowCount } = await pool.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
  return !!rowCount;
}

export async function insertUser(u: { name: string; email: string; passwordHash: string; role: Role }) {
  const { rows } = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password, role, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING ${FIELDS}`,
    [u.name, u.email, u.passwordHash, u.role],
  );
  return rows[0];
}

export async function updateUser(
  id: string,
  values: Partial<{ name: string; role: Role; is_active: boolean; password: string }>,
) {
  const set = updateSet(values);
  const { rows } = await pool.query<PublicUser>(
    `UPDATE users SET ${set.sql} WHERE id = $${set.params.length + 1} RETURNING ${FIELDS}`,
    [...set.params, id],
  );
  return rows[0] ?? null;
}
