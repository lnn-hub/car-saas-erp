const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin, requireMoney, canSeeMoney } = auth;
const { publishPost, FbError } = require('../utils/facebook');
const { getCompany } = require('../db/company');

// GET /api/vehicles — бүх машин
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
        COALESCE(SUM(vc.amount), 0) AS total_cost,
        (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image
       FROM vehicles v
       LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
       GROUP BY v.id
       ORDER BY v.created_at DESC`
    );
    res.json(canSeeMoney(req.user) ? rows : rows.map(({ total_cost, ...r }) => r));
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/vehicles/:id — нэг машин + зардлууд
router.get('/:id', auth, async (req, res) => {
  try {
    const [vehicle, costs, images] = await Promise.all([
      pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM vehicle_costs WHERE vehicle_id = $1 ORDER BY created_at', [req.params.id]),
      pool.query('SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order', [req.params.id]),
    ]);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json({ ...vehicle.rows[0], costs: canSeeMoney(req.user) ? costs.rows : [], images: images.rows });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/vehicles — машин нэмэх
router.post('/', auth, async (req, res) => {
  const { vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description,
          arrived_at, manufactured_date, has_plates, price } = req.body;
  if (!vin || !brand || !model || !year)
    return res.status(400).json({ error: 'VIN, марк, загвар,он заавал шаардлагатай' });

  // manufactured_date comes as YYYY-MM from month input — append -01 for full date
  const mfgDate = manufactured_date ? manufactured_date + '-01' : null;
  const listPrice = price === undefined || price === null || price === '' ? null : Number(price);
  if (listPrice !== null && (!Number.isFinite(listPrice) || listPrice < 0))
    return res.status(400).json({ error: 'Зарын үнэ буруу байна' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicles (vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description, arrived_at, manufactured_date, has_plates, created_by, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PUBLISHED') RETURNING *`,
      [vin, brand, model, year, mileage || 0, color, fuel_type || 'PETROL', transmission || 'AUTO',
       engine_cc, description, arrived_at || null, mfgDate, has_plates === true || has_plates === 'true', req.user.id, listPrice]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'VIN давхардсан байна' });
    serverError(res, err);
  }
});

// PATCH /api/vehicles/:id — мэдээлэл засах
const EDITABLE = ['brand', 'model', 'year', 'mileage', 'color', 'fuel_type', 'transmission',
                  'engine_cc', 'description', 'has_plates', 'manufactured_date', 'arrived_at', 'price'];
router.patch('/:id', auth, async (req, res) => {
  const sets = [], vals = [];
  for (const key of EDITABLE) {
    if (req.body[key] === undefined) continue;
    let v = req.body[key];
    if (v === '') v = null;
    if (['brand', 'model', 'year'].includes(key) && v === null)
      return res.status(400).json({ error: 'Марк, загвар, он хоосон байж болохгүй' });
    if (key === 'price' && v !== null && (!Number.isFinite(Number(v)) || Number(v) < 0))
      return res.status(400).json({ error: 'Зарын үнэ буруу байна' });
    vals.push(v);
    sets.push(`${key} = $${vals.length}`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Өөрчлөх мэдээлэл алга' });
  try {
    // Үнэ буурвал өмнөх өндөр үнийг хадгална (сайтад "Үнэ буурсан" гэж харагдана)
    if (req.body.price !== undefined) {
      const { rows: [cur] } = await pool.query('SELECT price, prev_price FROM vehicles WHERE id=$1', [req.params.id]);
      if (cur) {
        const next = req.body.price === '' || req.body.price === null ? null : Number(req.body.price);
        const old = cur.price != null ? Number(cur.price) : null;
        const prev = cur.prev_price != null ? Number(cur.prev_price) : null;
        if (next !== old) {
          let newPrev = null;
          if (next != null && old != null && next < old) newPrev = Math.max(prev || 0, old);
          else if (next != null && prev != null && next < prev) newPrev = prev;
          vals.push(newPrev); sets.push(`prev_price = $${vals.length}`);
          sets.push('price_changed_at = NOW()');
        }
      }
    }
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE vehicles SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json(rows[0]);
  } catch (err) { serverError(res, err); }
});

// DELETE /api/vehicles/:id — борлуулалтгүй машиныг устгах
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM vehicles WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    const { rows: sold } = await pool.query('SELECT 1 FROM sales WHERE vehicle_id=$1 LIMIT 1', [req.params.id]);
    if (sold[0]) return res.status(400).json({ error: 'Борлуулалтын түүхтэй машиныг устгах боломжгүй' });

    const { rows: imgs } = await pool.query('SELECT url FROM vehicle_images WHERE vehicle_id=$1', [req.params.id]);
    for (const img of imgs) {
      try { await require('./upload').deleteImage(img.url); } catch (_) {}
    }
    await pool.query('DELETE FROM vehicles WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { serverError(res, err); }
});

// PATCH /api/vehicles/:id/status — статус өөрчлөх
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: 'Буруу статус' });

  try {
    const { rows } = await pool.query(
      `UPDATE vehicles SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/vehicles/:id/costs — зардал нэмэх
router.post('/:id/costs', auth, requireMoney, async (req, res) => {
  const { cost_type, amount, currency, note } = req.body;
  const amt = Number(amount);
  if (!cost_type || !Number.isFinite(amt) || amt === 0)
    return res.status(400).json({ error: 'Зардлын төрөл, дүн заавал шаардлагатай' });

  try {
    const own = await pool.query('SELECT 1 FROM vehicles WHERE id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Машин олдсонгүй' });

    const { rows } = await pool.query(
      `INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, cost_type, amt, currency || 'MNT', note, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '22P02') return res.status(400).json({ error: 'Зардлын төрөл буруу байна' });
    serverError(res, err);
  }
});

// ─── Facebook пэйж рүү нийтлэх ──────────────────────────────────────────────
const FUEL = { PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан' };
const siteUrl = () => process.env.PUBLIC_SITE_URL
  || (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).find((u) => u && !u.includes('localhost'))
  || '';
const fmtMoney = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} сая ₮` : `${Math.round(n).toLocaleString('en-US')} ₮`);
// Facebook зөвхөн нийтэд нээлттэй https зургийг татна. Cloudinary бол JPG, 1600px болгоно.
const fbImage = (u) => {
  if (!/^https:\/\//.test(u || '')) return null;
  return u.includes('res.cloudinary.com') && u.includes('/upload/') ? u.replace('/upload/', '/upload/f_jpg,q_auto,w_1600/') : u;
};

function buildMessage(v, company) {
  const specs = [
    v.mileage > 0 ? `${Number(v.mileage).toLocaleString('en-US')} км` : null,
    FUEL[v.fuel_type],
    v.transmission === 'AUTO' ? 'Автомат' : v.transmission === 'MANUAL' ? 'Механик' : null,
    v.engine_cc ? `${(v.engine_cc / 1000).toFixed(1)}L` : null,
  ].filter(Boolean).join(' · ');
  const lines = (v.description || '').split('\n').map((l) => l.trim());
  const about = lines.filter((l) => l && !l.startsWith('Зургийн эх сурвалж')).join('\n');
  const url = siteUrl() ? `${siteUrl().replace(/\/$/, '')}/vehicle/${v.id}` : '';
  return [
    `${v.year} ${v.brand} ${v.model}`,
    company.show_prices && Number(v.price) > 0 ? `Үнэ: ${fmtMoney(Number(v.price))}` : 'Үнэ: тохиролцоно',
    specs,
    [v.color, v.has_plates ? 'Дугаартай' : null].filter(Boolean).join(' · '),
    about ? `\n${about}` : '',
    url ? `\nДэлгэрэнгүй: ${url}` : '',
    company.phone ? `Утас: ${company.phone}` : '',
  ].filter(Boolean).join('\n');
}

// POST /api/vehicles/:id/facebook
router.post('/:id/facebook', auth, async (req, res) => {
  try {
    const [{ rows: [v] }, company, { rows: imgs }] = await Promise.all([
      pool.query('SELECT * FROM vehicles WHERE id=$1', [req.params.id]),
      getCompany('phone, show_prices, fb_page_id, fb_page_token'),
      pool.query('SELECT url FROM vehicle_images WHERE vehicle_id=$1 ORDER BY sort_order', [req.params.id]),
    ]);
    if (!v) return res.status(404).json({ error: 'Машин олдсонгүй' });
    if (!company?.fb_page_token) return res.status(400).json({ error: 'Facebook пэйж холбоогүй байна. Тохиргоо хэсгээс холбоно уу' });
    const imageUrls = imgs.map((i) => fbImage(i.url)).filter(Boolean);
    const message = buildMessage(v, company);
    const post = await publishPost({
      pageId: company.fb_page_id, token: company.fb_page_token, message, imageUrls,
      link: siteUrl() ? `${siteUrl().replace(/\/$/, '')}/vehicle/${v.id}` : null,
    });
    await pool.query('UPDATE vehicles SET fb_post_url=$1, fb_posted_at=NOW() WHERE id=$2', [post.url, v.id]);
    res.json({ ...post, skipped_images: imgs.length - Math.min(imageUrls.length, 10) > 0 ? imgs.length - post.photos : 0 });
  } catch (err) {
    if (err instanceof FbError) return res.status(400).json({ error: err.message });
    if (err.code === '22P02') return res.status(404).json({ error: 'Машин олдсонгүй' });
    serverError(res, err);
  }
});

// GET /api/vehicles/:id/facebook/preview — постын бичвэрийг урьдчилан харах
router.get('/:id/facebook/preview', auth, async (req, res) => {
  try {
    const [{ rows: [v] }, company] = await Promise.all([
      pool.query('SELECT * FROM vehicles WHERE id=$1', [req.params.id]),
      getCompany('phone, show_prices'),
    ]);
    if (!v) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json({ message: buildMessage(v, company) });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Машин олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
