import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createCustomer, createUser, createVehicle, resetDb } from './helpers';

let admin: string, sales: string;

beforeAll(async () => {
  await resetDb();
  admin = (await createUser('ADMIN')).token;
  sales = (await createUser('SALES')).token;
});

describe('сайтаас ирэх хүсэлт', () => {
  it('нэр, утас шалгана; утасны дугаарыг цэвэрлэнэ', async () => {
    const bad = await api().post('/api/public/leads').send({ name: 'Бат', phone: '123' });
    expect(bad.status).toBe(400);
    const v = await createVehicle(admin);
    const ok = await api()
      .post('/api/public/leads')
      .send({
        name: '  Бат  ',
        phone: '9911-2233',
        kind: 'VIEWING',
        preferred_time: 'Маргааш 14:00',
        vehicle_id: v.id,
      });
    expect(ok.status).toBe(201);
    const list = await api().get('/api/leads').set(auth(sales));
    expect(list.body[0]).toMatchObject({ name: 'Бат', phone: '99112233', status: 'NEW', brand: 'Toyota' });
  });

  it('spam бот (нуусан талбар бөглөсөн) хадгалагдахгүй', async () => {
    const before = (await api().get('/api/leads').set(auth(admin))).body.length;
    const res = await api().post('/api/public/leads').send({ name: 'Bot', phone: '99999999', website: 'http://spam' });
    expect(res.status).toBe(201);
    expect((await api().get('/api/leads').set(auth(admin))).body.length).toBe(before);
  });

  it('шинэ хүсэлтийн тоо, төлөв солих, буруу төлөв 400', async () => {
    await api()
      .post('/api/public/leads')
      .send({ name: 'Дорж', phone: '88001122', kind: 'REQUEST', message: 'Prius хайж байна' });
    const count = await api().get('/api/leads/count').set(auth(admin));
    expect(count.body.new).toBe(2);
    const lead = (await api().get('/api/leads').set(auth(admin))).body.find((l: { name: string }) => l.name === 'Дорж');
    const done = await api().patch(`/api/leads/${lead.id}`).set(auth(admin)).send({ status: 'DONE' });
    expect(done.body.status).toBe('DONE');
    expect((await api().patch(`/api/leads/${lead.id}`).set(auth(admin)).send({ status: 'X' })).status).toBe(400);
    expect((await api().get('/api/leads/count').set(auth(admin))).body.new).toBe(1);
  });

  it('хүсэлтийг үйлчлүүлэгч болгоход утсаар давхцвал байгааг ашиглана', async () => {
    await api().post('/api/public/leads').send({ name: 'Сараа', phone: '95001122' });
    const lead = (await api().get('/api/leads').set(auth(admin))).body.find(
      (l: { name: string }) => l.name === 'Сараа',
    );
    const first = await api().post(`/api/leads/${lead.id}/customer`).set(auth(admin));
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(true);
    const again = await api().post(`/api/leads/${lead.id}/customer`).set(auth(admin));
    expect(again.status).toBe(200);
    expect(again.body.created).toBe(false);
    expect(again.body.customer.id).toBe(first.body.customer.id);
    const after = (await api().get('/api/leads').set(auth(admin))).body.find((l: { id: string }) => l.id === lead.id);
    expect(after.status).toBe('CONTACTED');
  });

  it('хүсэлт устгах, байхгүйг устгавал 404', async () => {
    const lead = (await api().get('/api/leads').set(auth(admin))).body[0];
    expect((await api().delete(`/api/leads/${lead.id}`).set(auth(admin))).status).toBe(200);
    expect((await api().delete(`/api/leads/${lead.id}`).set(auth(admin))).status).toBe(404);
  });
});

describe('үйлчлүүлэгч', () => {
  it('нэр заавал, үүсгэх, засах', async () => {
    expect((await api().post('/api/customers').set(auth(admin)).send({ phone: '1' })).status).toBe(400);
    const c = await createCustomer(admin, { name: 'Нараа', phone: '99887766', register: 'УБ99112233' });
    const upd = await api()
      .patch(`/api/customers/${c.id}`)
      .set(auth(sales))
      .send({ email: 'n@test.mn', name: 'Нараа Б' });
    expect(upd.body).toMatchObject({ name: 'Нараа Б', email: 'n@test.mn', register: 'УБ99112233' });
    expect((await api().patch(`/api/customers/${c.id}`).set(auth(admin)).send({ name: '' })).status).toBe(400);
  });

  it('хайлт, жагсаалт дахь худалдан авалтын тоо', async () => {
    const c = await createCustomer(admin, { name: 'Ганбат', phone: '99550011' });
    const v = await createVehicle(admin);
    await api()
      .post('/api/sales')
      .set(auth(admin))
      .send({ vehicle_id: v.id, customer_id: c.id, sale_price: 15_000_000 });
    const search = await api().get('/api/customers?q=ганбат').set(auth(sales));
    expect(search.body.map((x: { id: string }) => x.id)).toContain(c.id);
    const list = await api().get('/api/customers/list').set(auth(admin));
    const row = list.body.find((x: { id: string }) => x.id === c.id);
    expect(row.purchases).toBe(1);
    expect(Number(row.total_spent)).toBe(15_000_000);
  });

  it('дэлгэрэнгүйд худалдан авалт болон утсаар таарсан хүсэлтүүд орно', async () => {
    const c = await createCustomer(admin, { name: 'Од', phone: '+976 9911 0000' });
    await api().post('/api/public/leads').send({ name: 'Од', phone: '99110000' });
    const res = await api().get(`/api/customers/${c.id}`).set(auth(admin));
    expect(res.body.leads).toHaveLength(1);
    expect(res.body.sales).toEqual([]);
  });

  it('зөвхөн админ, худалдан авалтгүй үйлчлүүлэгчийг устгана', async () => {
    const c = await createCustomer(admin, { name: 'Устгах' });
    expect((await api().delete(`/api/customers/${c.id}`).set(auth(sales))).status).toBe(403);
    expect((await api().delete(`/api/customers/${c.id}`).set(auth(admin))).status).toBe(200);
    const buyer = (await api().get('/api/customers?q=Ганбат').set(auth(admin))).body[0];
    expect((await api().delete(`/api/customers/${buyer.id}`).set(auth(admin))).status).toBe(400);
  });
});
