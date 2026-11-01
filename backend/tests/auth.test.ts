import { beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createUser, pool, resetDb } from './helpers';

beforeAll(resetDb);

describe('нэвтрэх', () => {
  it('зөв и-мэйл, нууц үгээр token ба хэрэглэгчийн мэдээлэл буцаана (и-мэйлийн том жижиг үсэг хамаагүй)', async () => {
    const u = await createUser('ADMIN');
    const res = await api().post('/api/auth/login').send({ email: u.email.toUpperCase(), password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ id: u.id, role: 'ADMIN', company_name: 'Тест Салон' });
    expect(res.body.user.password).toBeUndefined();
  });

  it('буруу нууц үг ба байхгүй и-мэйл адилхан 401', async () => {
    const u = await createUser('SALES');
    const wrong = await api().post('/api/auth/login').send({ email: u.email, password: 'buruu-nuuts-ug' });
    const missing = await api().post('/api/auth/login').send({ email: 'baihgui@test.mn', password: 'x' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error).toBe(missing.body.error);
  });

  it('хоосон талбартай бол 400', async () => {
    const res = await api().post('/api/auth/login').send({ email: '' });
    expect(res.status).toBe(400);
  });

  it('идэвхгүй ажилтан нэвтэрч чадахгүй', async () => {
    const u = await createUser('SALES');
    await pool.query('UPDATE users SET is_active = FALSE WHERE id = $1', [u.id]);
    const res = await api().post('/api/auth/login').send({ email: u.email, password: u.password });
    expect(res.status).toBe(401);
  });

  it('DEMO_LOGIN унтраалттай үед танилцуулгын нэвтрэлт 404', async () => {
    const res = await api().post('/api/auth/demo');
    expect(res.status).toBe(404);
  });

  it('DEMO_LOGIN=true үед анхны идэвхтэй админаар нэвтэрнэ', async () => {
    process.env.DEMO_LOGIN = 'true';
    try {
      const res = await api().post('/api/auth/demo');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
    } finally {
      process.env.DEMO_LOGIN = '';
    }
  });
});

describe('token шалгалт', () => {
  it('token-гүй бол 401', async () => {
    const res = await api().get('/api/vehicles');
    expect(res.status).toBe(401);
  });

  it('буруу token бол 401', async () => {
    const res = await api().get('/api/vehicles').set(auth('buruu.token.baina'));
    expect(res.status).toBe(401);
  });

  it('идэвхгүй болсон ажилтны хуучин token ажиллахгүй', async () => {
    const u = await createUser('SALES', { active: false });
    const res = await api().get('/api/vehicles').set(auth(u.token));
    expect(res.status).toBe(401);
  });
});
