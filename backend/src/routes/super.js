const router = require('express').Router();
const { serverError } = require('../utils/http');
const bcrypt = require('bcryptjs');
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { requireSuper, invalidateCompany } = auth;
const { resolveFeatures, sanitizeFeatures } = require('../utils/features');

router.use(auth, requireSuper);

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

// GET /api/super/companies - бүх компани, хэрэглээний тоотой
router.get('/companies', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug, c.plan, c.is_active, c.max_vehicles, c.features, c.created_at,
              c.phone, c.email,
              (SELECT COUNT(*)::int FROM vehicles v WHERE v.company_id = c.id) AS vehicles,
              (SELECT COUNT(*)::int FROM vehicle_images i JOIN vehicles v ON v.id = i.vehicle_id WHERE v.company_id = c.id) AS images,
              (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS users,
              (SELECT COUNT(*)::int FROM sales s WHERE s.company_id = c.id) AS sales
       FROM companies c ORDER BY c.created_at ASC`
    );
    res.json(rows.map(r => ({ ...r, features: resolveFeatures(r.features) })));
  } catch (err) { serverError(res, err); }
});

// POST /api/super/companies - шинэ компани + админ хэрэглэгч
router.post('/companies', async (req, res) => {
  const { name, slug, plan, max_vehicles, admin_name, admin_email, admin_password } = req.body;
  if (!name?.trim() || !admin_name?.trim() || !admin_email?.trim() || !admin_password)
    return res.status(400).json({ error: 'Нэр, админы нэр, и-мэйл, нууц үгийг бөглөнө үү' });
  if (!SLUG_RE.test(slug || ''))
    return res.status(400).json({ error: 'Slug: жижиг латин үсэг, тоо, зураас (3-40 тэмдэгт)' });
  if (admin_password.length < 8)
    return res.status(400).json({ error: 'Нууц үг хамгийн багадаа 8 тэмдэгт байна' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if ((await client.query('SELECT 1 FROM companies WHERE slug=$1', [slug])).rowCount)
      { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Энэ slug аль хэдийн ашиглагдаж байна' }); }
    if ((await client.query('SELECT 1 FROM users WHERE email=$1', [admin_email.trim()])).rowCount)
      { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Энэ и-мэйл аль хэдийн бүртгэлтэй байна' }); }

    const { rows: [company] } = await client.query(
      `INSERT INTO companies (name, slug, plan, max_vehicles) VALUES ($1,$2,$3,$4) RETURNING id, name, slug, plan, max_vehicles`,
      [name.trim(), slug, plan || 'basic', max_vehicles === '' || max_vehicles == null ? null : Number(max_vehicles)]
    );
    const hash = await bcrypt.hash(admin_password, 10);
    await client.query(
      `INSERT INTO users (company_id, name, email, password, role) VALUES ($1,$2,$3,$4,'ADMIN')`,
      [company.id, admin_name.trim(), admin_email.trim(), hash]
    );
    await client.query('COMMIT');
    res.status(201).json(company);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    serverError(res, err);
  } finally { client.release(); }
});

// PATCH /api/super/companies/:id - нэр, slug, багц, хязгаар, идэвхтэй эсэх, боломжууд
router.patch('/companies/:id', async (req, res) => {
  const { name, slug, plan, max_vehicles, is_active, features } = req.body;
  const sets = [], vals = [];
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if (name !== undefined) { if (!String(name).trim()) return res.status(400).json({ error: 'Нэр хоосон байж болохгүй' }); add('name', String(name).trim()); }
  if (slug !== undefined) { if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'Slug буруу' }); add('slug', slug); }
  if (plan !== undefined) add('plan', String(plan).slice(0, 30));
  if (max_vehicles !== undefined) add('max_vehicles', max_vehicles === '' || max_vehicles === null ? null : Number(max_vehicles));
  if (is_active !== undefined) add('is_active', !!is_active);
  if (features !== undefined) add('features', JSON.stringify(sanitizeFeatures(features)));
  if (!sets.length) return res.status(400).json({ error: 'Өөрчлөх мэдээлэл алга' });

  try {
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE companies SET ${sets.join(', ')} WHERE id = $${vals.length}
       RETURNING id, name, slug, plan, max_vehicles, is_active, features`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Компани олдсонгүй' });
    invalidateCompany(rows[0].id);
    res.json({ ...rows[0], features: resolveFeatures(rows[0].features) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Энэ slug аль хэдийн ашиглагдаж байна' });
    serverError(res, err);
  }
});

// GET /api/super/companies/:id/users
router.get('/companies/:id/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE company_id=$1 ORDER BY created_at', [req.params.id]);
    res.json(rows);
  } catch (err) { serverError(res, err); }
});

// POST /api/super/companies/:id/password { user_id, password }
router.post('/companies/:id/password', async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password || password.length < 8)
    return res.status(400).json({ error: 'Хэрэглэгч, 8+ тэмдэгттэй нууц үг шаардлагатай' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query('UPDATE users SET password=$1 WHERE id=$2 AND company_id=$3', [hash, user_id, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
    res.json({ ok: true });
  } catch (err) { serverError(res, err); }
});

module.exports = router;
