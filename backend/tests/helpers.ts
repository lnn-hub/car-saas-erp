import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import pool from '../src/db/pool';

export const api = () => request(app);
export { pool };

export type Role = 'ADMIN' | 'SALES' | 'FINANCE';

// Файл бүрийн эхэнд санг хоосон, нэг компанитай төлөвт оруулна
export async function resetDb() {
  await pool.query(
    'TRUNCATE leads, sales, vehicle_costs, vehicle_images, vehicles, customers, team_members, users RESTART IDENTITY CASCADE',
  );
  await pool.query(`UPDATE companies SET name = 'Тест Салон', phone = '99001122', address = 'Улаанбаатар', email = NULL,
    working_hours = NULL, logo_url = NULL, show_prices = TRUE, messenger_url = NULL, viber_phone = NULL,
    whatsapp_phone = NULL, fb_page_id = NULL, fb_page_name = NULL, fb_page_token = NULL`);
}

let n = 0;
// Ажилтан үүсгээд нэвтэрч token буцаана
export async function createUser(role: Role = 'ADMIN', { active = true } = {}) {
  n += 1;
  const email = `${role.toLowerCase()}${n}@test.mn`;
  const password = 'password-123';
  const hash = await bcrypt.hash(password, 4);
  const {
    rows: [user],
  } = await pool.query(
    'INSERT INTO users (name, email, password, role, is_active) VALUES ($1,$2,$3,$4,TRUE) RETURNING id',
    [`${role} хэрэглэгч`, email, hash, role],
  );
  const res = await api().post('/api/auth/login').send({ email, password });
  if (!active) await pool.query('UPDATE users SET is_active = FALSE WHERE id = $1', [user.id]);
  return { id: user.id as string, email, password, token: res.body.token as string };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let vin = 0;
export async function createVehicle(token: string, data: Record<string, unknown> = {}) {
  vin += 1;
  const res = await api()
    .post('/api/vehicles')
    .set(auth(token))
    .send({ vin: `TESTVIN${String(vin).padStart(10, '0')}`, brand: 'Toyota', model: 'Prius', year: 2020, ...data });
  if (res.status !== 201) throw new Error(`createVehicle: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; vin: string; price: string | null; status: string };
}

export async function createCustomer(token: string, data: Record<string, unknown> = {}) {
  const res = await api()
    .post('/api/customers')
    .set(auth(token))
    .send({ name: 'Болд', phone: '88112233', ...data });
  if (res.status !== 201) throw new Error(`createCustomer: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; name: string };
}
