import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createUser, createVehicle, resetDb } from './helpers';

let admin: string, sales: string, finance: string;

beforeAll(async () => {
  await resetDb();
  admin = (await createUser('ADMIN')).token;
  sales = (await createUser('SALES')).token;
  finance = (await createUser('FINANCE')).token;
});

describe('нийтийн сайт', () => {
  it('компанийн мэдээлэл (нууц талбаргүй)', async () => {
    const res = await api().get('/api/public');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Тест Салон', phone: '99001122', show_prices: true });
    expect(res.body.fb_page_token).toBeUndefined();
    expect(res.body.id).toBeUndefined();
  });

  it('зөвхөн нийтлэгдсэн машин, дотоод талбаргүй', async () => {
    const pub = await createVehicle(admin, { price: 40_000_000 });
    const hidden = await createVehicle(admin);
    await api().patch(`/api/vehicles/${hidden.id}/status`).set(auth(admin)).send({ status: 'ARRIVED' });
    const res = await api().get('/api/public/vehicles');
    const ids = res.body.vehicles.map((v: { id: string }) => v.id);
    expect(ids).toContain(pub.id);
    expect(ids).not.toContain(hidden.id);
    const v = res.body.vehicles.find((x: { id: string }) => x.id === pub.id);
    expect(v.vin).toBeUndefined();
    expect(v.status).toBeUndefined();
    expect(Number(v.price)).toBe(40_000_000);
    expect((await api().get(`/api/public/vehicles/${hidden.id}`)).status).toBe(404);
    const one = await api().get(`/api/public/vehicles/${pub.id}`);
    expect(one.body.company.name).toBe('Тест Салон');
  });

  it('үнэ буурсныг 30 хоног харуулна', async () => {
    const v = await createVehicle(admin, { price: 30_000_000 });
    await api().patch(`/api/vehicles/${v.id}`).set(auth(admin)).send({ price: 27_000_000 });
    const one = await api().get(`/api/public/vehicles/${v.id}`);
    expect(Number(one.body.prev_price)).toBe(30_000_000);
  });

  it('үнэ нуух тохиргоотой бол үнэ харагдахгүй', async () => {
    await api().patch('/api/settings').set(auth(admin)).send({ show_prices: false });
    const res = await api().get('/api/public/vehicles');
    expect(res.body.show_prices).toBe(false);
    expect(res.body.vehicles.every((v: { price: unknown }) => v.price === null)).toBe(true);
    await api().patch('/api/settings').set(auth(admin)).send({ show_prices: true });
  });

  it('буруу хэлбэрийн id 404', async () => {
    expect((await api().get('/api/public/vehicles/abc')).status).toBe(404);
  });
});

describe('тохиргоо', () => {
  it('хэн ч уншина, зөвхөн админ засна', async () => {
    const read = await api().get('/api/settings').set(auth(sales));
    expect(read.body).toMatchObject({ name: 'Тест Салон', fb_connected: false });
    expect(read.body.fb_page_token).toBeUndefined();
    expect((await api().patch('/api/settings').set(auth(sales)).send({ name: 'X' })).status).toBe(403);
  });

  it('мэдээлэл, чатын суваг хадгалах; хоосон утга сувгийг устгана; нэр хоосон байж болохгүй', async () => {
    const res = await api()
      .patch('/api/settings')
      .set(auth(admin))
      .send({ phone: '77007700', working_hours: '09-18', messenger_url: 'm.me/salon', viber_phone: '99112233' });
    expect(res.body).toMatchObject({ phone: '77007700', working_hours: '09-18', messenger_url: 'm.me/salon' });
    const cleared = await api().patch('/api/settings').set(auth(admin)).send({ viber_phone: '' });
    expect(cleared.body.viber_phone).toBeNull();
    expect((await api().patch('/api/settings').set(auth(admin)).send({ name: '  ' })).status).toBe(400);
    const pub = await api().get('/api/public');
    expect(pub.body.messenger_url).toBe('m.me/salon');
  });

  it('Facebook токен хэт богино бол 400', async () => {
    expect((await api().post('/api/settings/facebook').set(auth(admin)).send({ token: 'x' })).status).toBe(400);
    expect(
      (
        await api()
          .post('/api/settings/facebook')
          .set(auth(finance))
          .send({ token: 'x'.repeat(30) })
      ).status,
    ).toBe(403);
  });
});

describe('баг (team)', () => {
  it('админ нэмж, засаж, устгана; бусад нь зөвхөн уншина; сайтад харагдана', async () => {
    const add = await api().post('/api/team').set(auth(admin)).send({ name: 'Дорж', position: 'Менежер' });
    expect(add.status).toBe(201);
    expect((await api().post('/api/team').set(auth(sales)).send({ name: 'X' })).status).toBe(403);
    expect((await api().post('/api/team').set(auth(admin)).send({ name: ' ' })).status).toBe(400);
    const upd = await api().patch(`/api/team/${add.body.id}`).set(auth(admin)).send({ bio: 'Туршлагатай' });
    expect(upd.body).toMatchObject({ name: 'Дорж', bio: 'Туршлагатай' });
    expect((await api().get('/api/team').set(auth(sales))).body).toHaveLength(1);
    expect((await api().get('/api/public/team')).body[0].name).toBe('Дорж');
    expect((await api().delete(`/api/team/${add.body.id}`).set(auth(admin))).status).toBe(200);
    expect((await api().get('/api/public/team')).body).toEqual([]);
  });
});

describe('ажилтан', () => {
  it('зөвхөн админ удирдана', async () => {
    expect((await api().get('/api/users').set(auth(finance))).status).toBe(403);
    const list = await api().get('/api/users').set(auth(admin));
    expect(list.body.length).toBeGreaterThanOrEqual(3);
    expect(list.body[0].password).toBeUndefined();
  });

  it('шинэ ажилтан: и-мэйл, нууц үгийн шалгалт, давхардал', async () => {
    const send = (b: object) => api().post('/api/users').set(auth(admin)).send(b);
    expect((await send({ name: 'А', email: 'bad', password: 'password-1' })).status).toBe(400);
    expect((await send({ name: 'А', email: 'a@test.mn', password: 'short' })).status).toBe(400);
    const ok = await send({ name: 'Ану', email: 'Anu@Test.mn', password: 'password-1', role: 'FINANCE' });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ email: 'anu@test.mn', role: 'FINANCE', is_active: true });
    expect((await send({ name: 'Ану 2', email: 'anu@test.mn', password: 'password-1' })).status).toBe(409);
    const login = await api().post('/api/auth/login').send({ email: 'anu@test.mn', password: 'password-1' });
    expect(login.status).toBe(200);
  });

  it('эрх солих, идэвхгүй болгох, өөрийгөө бууруулахгүй', async () => {
    const me = (await api().get('/api/users').set(auth(admin))).body.find((u: { role: string }) => u.role === 'ADMIN');
    expect((await api().patch(`/api/users/${me.id}`).set(auth(admin)).send({ role: 'SALES' })).status).toBe(400);
    const other = await createUser('SALES');
    const res = await api()
      .patch(`/api/users/${other.id}`)
      .set(auth(admin))
      .send({ role: 'FINANCE', is_active: false });
    expect(res.body).toMatchObject({ role: 'FINANCE', is_active: false });
    expect((await api().patch(`/api/users/${other.id}`).set(auth(admin)).send({ role: 'BOSS' })).status).toBe(400);
  });
});
