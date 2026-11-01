import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createCustomer, createUser, createVehicle, pool, resetDb } from './helpers';

let admin: string, sales: string, finance: string;

beforeAll(async () => {
  await resetDb();
  admin = (await createUser('ADMIN')).token;
  sales = (await createUser('SALES')).token;
  finance = (await createUser('FINANCE')).token;
});

async function vehicleWithCost(cost: number) {
  const v = await createVehicle(admin, { price: cost * 1.2 });
  await api().post(`/api/vehicles/${v.id}/costs`).set(auth(admin)).send({ cost_type: 'PURCHASE', amount: cost });
  return v;
}

describe('борлуулалт', () => {
  it('машин зарахад SOLD болж, ашгийг тооцно', async () => {
    const v = await vehicleWithCost(20_000_000);
    const c = await createCustomer(sales);
    const res = await api()
      .post('/api/sales')
      .set(auth(sales))
      .send({ vehicle_id: v.id, customer_id: c.id, sale_price: 26_000_000, payment_type: 'LEASING' });
    expect(res.status).toBe(201);
    const after = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(after.body.status).toBe('SOLD');
    const list = await api().get('/api/sales').set(auth(admin));
    const row = list.body.find((s: { vehicle_id: string }) => s.vehicle_id === v.id);
    expect(Number(row.net_profit)).toBe(6_000_000);
    expect(row.customer_name).toBe('Болд');
    expect(row.payment_type).toBe('LEASING');
  });

  it('нэг машиныг хоёр удаа зарахгүй (409)', async () => {
    const v = await vehicleWithCost(10_000_000);
    const c = await createCustomer(admin);
    const body = { vehicle_id: v.id, customer_id: c.id, sale_price: 12_000_000 };
    expect((await api().post('/api/sales').set(auth(admin)).send(body)).status).toBe(201);
    expect((await api().post('/api/sales').set(auth(admin)).send(body)).status).toBe(409);
  });

  it('буруу үнэ, төлбөрийн хэлбэр 400; байхгүй машин, үйлчлүүлэгч 404', async () => {
    const v = await createVehicle(admin);
    const c = await createCustomer(admin);
    const send = (b: object) => api().post('/api/sales').set(auth(admin)).send(b);
    expect((await send({ vehicle_id: v.id, customer_id: c.id, sale_price: 0 })).status).toBe(400);
    expect((await send({ vehicle_id: v.id, customer_id: c.id, sale_price: 5, payment_type: 'CRYPTO' })).status).toBe(
      400,
    );
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect((await send({ vehicle_id: ghost, customer_id: c.id, sale_price: 5 })).status).toBe(404);
    expect((await send({ vehicle_id: v.id, customer_id: ghost, sale_price: 5 })).status).toBe(404);
  });

  it('борлуулагч ашиг харахгүй, нягтлан харна', async () => {
    const forSales = await api().get('/api/sales').set(auth(sales));
    expect(forSales.body[0].net_profit).toBeUndefined();
    expect(forSales.body[0].total_cost).toBeUndefined();
    const sum = await api().get('/api/sales/summary').set(auth(sales));
    expect(sum.body.total_profit).toBeUndefined();
    expect(Number(sum.body.total_sold)).toBe(2);
    const fin = await api().get('/api/sales/summary').set(auth(finance));
    expect(Number(fin.body.total_profit)).toBe(8_000_000);
    expect(Number(fin.body.total_revenue)).toBe(38_000_000);
  });

  it('хураангуйд зөвхөн төгрөгийн зардал орно', async () => {
    const v = await vehicleWithCost(1_000_000);
    await pool.query(
      "INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency) VALUES ($1, 'SHIPPING', 999, 'USD')",
      [v.id],
    );
    const c = await createCustomer(admin);
    await api()
      .post('/api/sales')
      .set(auth(admin))
      .send({ vehicle_id: v.id, customer_id: c.id, sale_price: 2_000_000 });
    const fin = await api().get('/api/sales/summary').set(auth(finance));
    expect(Number(fin.body.total_profit)).toBe(9_000_000);
  });
});
