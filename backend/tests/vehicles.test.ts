import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createCustomer, createUser, createVehicle, pool, resetDb } from './helpers';

let admin: string, sales: string, finance: string;

beforeAll(async () => {
  await resetDb();
  admin = (await createUser('ADMIN')).token;
  sales = (await createUser('SALES')).token;
  finance = (await createUser('FINANCE')).token;
});

describe('машин', () => {
  it('шинэ машин нэмэхэд сайтад шууд нийтлэгдэнэ (PUBLISHED)', async () => {
    const v = await createVehicle(sales, { price: 30_000_000, manufactured_date: '2019-05', has_plates: true });
    expect(v.status).toBe('PUBLISHED');
    const res = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ brand: 'Toyota', has_plates: true });
    expect(Number(res.body.price)).toBe(30_000_000);
    expect(res.body.manufactured_date).toBeTruthy();
  });

  it('VIN, марк, загвар, он заавал', async () => {
    const res = await api().post('/api/vehicles').set(auth(admin)).send({ brand: 'Toyota' });
    expect(res.status).toBe(400);
  });

  it('давхардсан VIN 400', async () => {
    const v = await createVehicle(admin);
    const res = await api()
      .post('/api/vehicles')
      .set(auth(admin))
      .send({ vin: v.vin, brand: 'Lexus', model: 'RX', year: 2018 });
    expect(res.status).toBe(400);
  });

  it('сөрөг үнэ 400', async () => {
    const v = await createVehicle(admin);
    const res = await api().patch(`/api/vehicles/${v.id}`).set(auth(admin)).send({ price: -5 });
    expect(res.status).toBe(400);
  });

  it('үнэ буурвал өмнөх үнийг хадгална, өсвөл арилгана', async () => {
    const v = await createVehicle(admin, { price: 50_000_000 });
    const down = await api().patch(`/api/vehicles/${v.id}`).set(auth(admin)).send({ price: 45_000_000 });
    expect(Number(down.body.prev_price)).toBe(50_000_000);
    expect(down.body.price_changed_at).toBeTruthy();
    const up = await api().patch(`/api/vehicles/${v.id}`).set(auth(admin)).send({ price: 52_000_000 });
    expect(up.body.prev_price).toBeNull();
  });

  it('статус солих, буруу статус 400', async () => {
    const v = await createVehicle(admin);
    const ok = await api().patch(`/api/vehicles/${v.id}/status`).set(auth(admin)).send({ status: 'RESERVED' });
    expect(ok.body.status).toBe('RESERVED');
    const bad = await api().patch(`/api/vehicles/${v.id}/status`).set(auth(admin)).send({ status: 'GONE' });
    expect(bad.status).toBe(400);
  });

  it('байхгүй эсвэл буруу хэлбэрийн id 404', async () => {
    const res = await api().get('/api/vehicles/00000000-0000-0000-0000-000000000000').set(auth(admin));
    expect(res.status).toBe(404);
  });
});

describe('зардал ба эрх', () => {
  it('админ, нягтлан зардал нэмж, өртгийг харна', async () => {
    const v = await createVehicle(admin);
    const c1 = await api()
      .post(`/api/vehicles/${v.id}/costs`)
      .set(auth(admin))
      .send({ cost_type: 'PURCHASE', amount: 20_000_000 });
    expect(c1.status).toBe(201);
    const c2 = await api()
      .post(`/api/vehicles/${v.id}/costs`)
      .set(auth(finance))
      .send({ cost_type: 'CUSTOMS', amount: 3_000_000, currency: 'MNT' });
    expect(c2.status).toBe(201);
    const list = await api().get('/api/vehicles').set(auth(finance));
    expect(Number(list.body.find((x: { id: string }) => x.id === v.id).total_cost)).toBe(23_000_000);
    const one = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(one.body.costs).toHaveLength(2);
  });

  it('борлуулагч зардал нэмж, өртөг харж чадахгүй', async () => {
    const v = await createVehicle(admin);
    await api().post(`/api/vehicles/${v.id}/costs`).set(auth(admin)).send({ cost_type: 'REPAIR', amount: 500_000 });
    const add = await api()
      .post(`/api/vehicles/${v.id}/costs`)
      .set(auth(sales))
      .send({ cost_type: 'REPAIR', amount: 1 });
    expect(add.status).toBe(403);
    const list = await api().get('/api/vehicles').set(auth(sales));
    expect(list.body[0].total_cost).toBeUndefined();
    const one = await api().get(`/api/vehicles/${v.id}`).set(auth(sales));
    expect(one.body.costs).toEqual([]);
  });

  it('буруу зардлын төрөл, тэг дүн 400', async () => {
    const v = await createVehicle(admin);
    const badType = await api()
      .post(`/api/vehicles/${v.id}/costs`)
      .set(auth(admin))
      .send({ cost_type: 'X', amount: 5 });
    expect(badType.status).toBe(400);
    const zero = await api()
      .post(`/api/vehicles/${v.id}/costs`)
      .set(auth(admin))
      .send({ cost_type: 'OTHER', amount: 0 });
    expect(zero.status).toBe(400);
  });
});

describe('машин устгах', () => {
  it('зөвхөн админ устгана', async () => {
    const v = await createVehicle(admin);
    const res = await api().delete(`/api/vehicles/${v.id}`).set(auth(sales));
    expect(res.status).toBe(403);
    const ok = await api().delete(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(ok.status).toBe(200);
    const gone = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(gone.status).toBe(404);
  });

  it('борлуулалтын түүхтэй машиныг устгахгүй', async () => {
    const v = await createVehicle(admin);
    const c = await createCustomer(admin);
    await api()
      .post('/api/sales')
      .set(auth(admin))
      .send({ vehicle_id: v.id, customer_id: c.id, sale_price: 1_000_000 });
    const res = await api().delete(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(res.status).toBe(400);
  });
});

describe('зургийн дараалал', () => {
  it('эхний зураг үндсэн болно, жагсаалт таарахгүй бол 400', async () => {
    const v = await createVehicle(admin);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { rows } = await pool.query(
        'INSERT INTO vehicle_images (vehicle_id, url, is_main, sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
        [v.id, `/uploads/test-${i}.webp`, i === 0, i],
      );
      ids.push(rows[0].id);
    }
    const order = [ids[2], ids[0], ids[1]];
    const res = await api().patch(`/api/upload/vehicle/${v.id}/order`).set(auth(admin)).send({ ids: order });
    expect(res.status).toBe(200);
    const one = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(one.body.images.map((i: { id: string }) => i.id)).toEqual(order);
    expect(one.body.images[0].is_main).toBe(true);
    const bad = await api()
      .patch(`/api/upload/vehicle/${v.id}/order`)
      .set(auth(admin))
      .send({ ids: [ids[0]] });
    expect(bad.status).toBe(400);
  });

  it('зураг устгахад дараагийнх нь үндсэн болно', async () => {
    const v = await createVehicle(admin);
    const { rows } = await pool.query(
      `INSERT INTO vehicle_images (vehicle_id, url, is_main, sort_order)
       VALUES ($1, '/uploads/a.webp', TRUE, 0), ($1, '/uploads/b.webp', FALSE, 1) RETURNING id`,
      [v.id],
    );
    const res = await api().delete(`/api/upload/image/${rows[0].id}`).set(auth(admin));
    expect(res.status).toBe(200);
    const one = await api().get(`/api/vehicles/${v.id}`).set(auth(admin));
    expect(one.body.images).toHaveLength(1);
    expect(one.body.images[0].is_main).toBe(true);
  });
});

describe('Facebook', () => {
  it('пэйж холбоогүй бол нийтлэхгүй, урьдчилсан бичвэр гаргана', async () => {
    const v = await createVehicle(admin, { price: 25_000_000, mileage: 50000 });
    const post = await api().post(`/api/vehicles/${v.id}/facebook`).set(auth(admin));
    expect(post.status).toBe(400);
    const prev = await api().get(`/api/vehicles/${v.id}/facebook/preview`).set(auth(admin));
    expect(prev.status).toBe(200);
    expect(prev.body.message).toContain('2020 Toyota Prius');
    expect(prev.body.message).toContain('25 сая ₮');
    expect(prev.body.message).toContain('Утас: 99001122');
  });
});
