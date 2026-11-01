import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ quiet: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL тохируулаагүй байна');

// Neon руу (өөр бүс нутаг) холболт нээх нь ~1с. Холболтыг амьд байлгаж дахин ашиглана.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => console.error('pg pool error:', err.message));

export default pool;

// Транзакц: алдаа гарвал бүгдийг буцаана
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// pool эсвэл транзакцын client (repo функцууд аль алинд нь ажиллана)
export type Db = Pick<pg.Pool, 'query'> | pg.PoolClient;
