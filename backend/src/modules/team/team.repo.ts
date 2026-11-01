import pool from '../../db/pool';

export interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
}

const FIELDS = 'id, name, position, bio, photo_url, sort_order';

export async function listTeam(): Promise<TeamMember[]> {
  const { rows } = await pool.query<TeamMember>(`SELECT ${FIELDS} FROM team_members ORDER BY sort_order, created_at`);
  return rows;
}

// Сайтад харагдах талбарууд
export async function listPublicTeam() {
  const { rows } = await pool.query(
    'SELECT id, name, position, bio, photo_url FROM team_members ORDER BY sort_order, created_at',
  );
  return rows;
}

export async function insertMember(m: { name: string; position: string | null; bio: string | null }) {
  const { rows } = await pool.query<TeamMember>(
    `INSERT INTO team_members (name, position, bio, sort_order)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM team_members))
     RETURNING ${FIELDS}`,
    [m.name, m.position, m.bio],
  );
  return rows[0];
}

// null талбар хэвээр үлдэнэ
export async function updateMember(
  id: string,
  m: { name: string | null; position: string | null; bio: string | null },
) {
  const { rows } = await pool.query<TeamMember>(
    `UPDATE team_members SET
       name     = COALESCE($1, name),
       position = COALESCE($2, position),
       bio      = COALESCE($3, bio)
     WHERE id = $4
     RETURNING ${FIELDS}`,
    [m.name, m.position, m.bio, id],
  );
  return rows[0] ?? null;
}

export async function deleteMember(id: string) {
  await pool.query('DELETE FROM team_members WHERE id = $1', [id]);
}

export async function findMemberPhoto(id: string) {
  const { rows } = await pool.query<{ photo_url: string | null }>('SELECT photo_url FROM team_members WHERE id = $1', [
    id,
  ]);
  return rows[0] ?? null;
}

export async function setMemberPhoto(id: string, url: string) {
  const { rows } = await pool.query<TeamMember>(
    `UPDATE team_members SET photo_url = $1 WHERE id = $2 RETURNING ${FIELDS}`,
    [url, id],
  );
  return rows[0];
}
