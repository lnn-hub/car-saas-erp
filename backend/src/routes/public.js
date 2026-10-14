const router = require('express').Router();
const pool = require('../db/pool');
const { serverError } = require('../utils/http');

const { resolveFeatures } = require('../utils/features');

// Компанийг slug-аар олно. Slug өгөөгүй бол анхны компани (нэг компанит байршуулалт). Идэвхгүй компани харагдахгүй.
const companyBySlug = (n) => `(SELECT id FROM companies WHERE is_active IS NOT FALSE AND ($${n}::text IS NULL OR slug = $${n}) ORDER BY created_at ASC LIMIT 1)`;
async function findCompany(slug) {
  const { rows } = await pool.query(
    `SELECT id, name, phone, address, email, working_hours, logo_url, show_prices, features
     FROM companies
     WHERE is_active IS NOT FALSE AND ($1::text IS NULL OR slug = $1)
     ORDER BY created_at ASC LIMIT 1`,
    [slug || null]
  );
  const c = rows[0];
  if (!c) return null;
  return { ...c, features: resolveFeatures(c.features) };
}
const slugOf = (req) => (typeof req.query.company === 'string' && req.query.company ? req.query.company : null);

// GET /api/public  (slug-гүй, анхны компани)
router.get('/', async (req, res) => {
  try {
    const comp = await findCompany(slugOf(req));
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });
    res.json(comp);
  } catch (err) { serverError(res, err); }
});

// GET /api/public/team
router.get('/team', async (req, res) => {
  try {
    const comp = await findCompany(slugOf(req));
    if (!comp || !comp.features.team) return res.json([]);
    const { rows } = await pool.query(
      'SELECT id, name, position, bio, photo_url FROM team_members WHERE company_id=$1 ORDER BY sort_order, created_at',
      [comp.id]
    );
    res.json(rows);
  } catch (err) { serverError(res, err); }
});

// Нийтэд харагдах талбарууд (whitelist). vin, created_by, company_id, status, зардал зэрэг дотоод мэдээлэл ОРОХГҮЙ.
const PUBLIC_COLS = `v.id, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission,
  v.engine_cc, v.mileage, v.description, v.has_plates, v.manufactured_date, v.price`;

// GET /api/public/vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(slugOf(req)),
      pool.query(
        `SELECT ${PUBLIC_COLS},
                (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image,
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         WHERE v.company_id=${companyBySlug(1)} AND v.status='PUBLISHED'
         ORDER BY v.created_at DESC`,
        [slugOf(req)]
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });

    res.json({
      company_id: comp.id,
      show_prices: comp.show_prices,
      vehicles: rows.map(v => ({ ...v, price: comp.show_prices ? v.price : null })),
    });
  } catch (err) { serverError(res, err); }
});

// GET /api/public/vehicles/:id
router.get('/vehicles/:id', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(slugOf(req)),
      pool.query(
        `SELECT ${PUBLIC_COLS},
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         WHERE v.id=$1 AND v.company_id=${companyBySlug(2)} AND v.status='PUBLISHED'`,
        [req.params.id, slugOf(req)]
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    res.json({ ...rows[0], price: comp.show_prices ? rows[0].price : null, company: comp });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Машин олдсонгүй' });
    serverError(res, err);
  }
});

module.exports = router;
