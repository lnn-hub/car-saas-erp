import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createCustomer, createUser, createVehicle, pool, resetDb } from './helpers';

let admin: string, sales: string, finance: string;

beforeAll(async () => {
  await resetDb();
  admin = (await createUser('ADMIN')).token;
  sales = (await createUser('SALES')).token;
  finance = (await createUser('FINANCE')).token;

  // 2026-03: 2 машин ирж, нэг нь 2026-04-д зарагдсан. Нэг машин 2026-04-д ирсэн, зарагдаагүй.
  const a = await createVehicle(admin, { brand: 'Toyota', arrived_at: '2026-03-05', price: 30_000_000 });
  const b = await createVehicle(admin, { brand: 'Lexus', arrived_at: '2026-03-20', price: 60_000_000 });
  await createVehicle(admin, { brand: 'Kia', arrived_at: '2026-04-02' });
  for (const [v, amount] of [
    [a, 20_000_000],
    [b, 50_000_000],
  ] as const) {
    await api().post(`/api/vehicles/${v.id}/costs`).set(auth(admin)).send({ cost_type: 'PURCHASE', amount });
  }
  await pool.query("UPDATE vehicle_costs SET created_at = '2026-03-10'");
  const c = await createCustomer(admin);
  await api()
    .post('/api/sales')
    .set(auth(admin))
    .send({ vehicle_id: a.id, customer_id: c.id, sale_price: 26_000_000, payment_type: 'CASH' });
  await pool.query("UPDATE sales SET sold_at = '2026-04-15 12:00'");
});

describe('сарын тайлан', () => {
  it('борлуулагч хандахгүй, нягтлан хандана', async () => {
    expect((await api().get('/api/reports/month?month=2026-04').set(auth(sales))).status).toBe(403);
    expect((await api().get('/api/reports/month?month=2026-04').set(auth(finance))).status).toBe(200);
  });

  it('буруу сар 400', async () => {
    expect((await api().get('/api/reports/month?month=2026-13').set(auth(admin))).status).toBe(400);
    expect((await api().get('/api/reports/year?year=26').set(auth(admin))).status).toBe(400);
  });

  it('4-р сар: 1 зарагдсан, ашиг, хоног, үлдэгдэл', async () => {
    const { body } = await api().get('/api/reports/month?month=2026-04').set(auth(admin));
    expect(body.summary).toMatchObject({
      sold: 1,
      revenue: 26_000_000,
      cost: 20_000_000,
      profit: 6_000_000,
      arrived: 1,
    });
    expect(body.summary.avg_days_to_sell).toBe(41);
    expect(body.summary.stock_count).toBe(2);
    expect(body.summary.stock_value).toBe(50_000_000);
    expect(body.sold[0]).toMatchObject({ brand: 'Toyota', sold_at: '2026-04-15', days: 41 });
    expect(body.by_payment[0]).toMatchObject({ key: 'CASH', count: 1 });
    expect(body.prev.month).toBe('2026-03');
    expect(body.prev.arrived).toBe(2);
  });

  it('3-р сар: ирсэн машин, бүртгэсэн зардал', async () => {
    const { body } = await api().get('/api/reports/month?month=2026-03').set(auth(admin));
    expect(body.summary.sold).toBe(0);
    expect(body.arrived).toHaveLength(2);
    expect(body.summary.arrived_cost).toBe(70_000_000);
    expect(body.expenses[0]).toMatchObject({ cost_type: 'PURCHASE', count: 2, amount: 70_000_000 });
    expect(body.has_other_currency).toBe(false);
  });

  it('жилийн тайлан 12 сартай', async () => {
    const { body } = await api().get('/api/reports/year?year=2026').set(auth(admin));
    expect(body.months).toHaveLength(12);
    expect(body.months[3]).toMatchObject({
      month: '2026-04',
      sold: 1,
      revenue: 26_000_000,
      profit: 6_000_000,
      arrived: 1,
    });
    expect(body.total).toMatchObject({ sold: 1, arrived: 3 });
  });
});
