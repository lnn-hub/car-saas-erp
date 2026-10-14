const router = require('express').Router();
const pool = require('../db/pool');

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
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/vehicles  (slug-гүй) - компани ба машинуудыг зэрэг асууна
router.get('/vehicles', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(slugOf(req)),
      pool.query(
        `SELECT v.id, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission,
                v.engine_cc, v.mileage, v.description, v.has_plates, v.manufactured_date,
                COALESCE(SUM(vc.amount), 0) AS total_cost,
                (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image,
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
         WHERE v.company_id=${companyBySlug(1)} AND v.status='PUBLISHED'
         GROUP BY v.id
         ORDER BY v.created_at DESC`,
        [slugOf(req)]
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });

    res.json({
      company_id: comp.id,
      show_prices: comp.show_prices,
      vehicles: rows.map(v => ({ ...v, total_cost: comp.show_prices ? v.total_cost : null })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/vehicles/:id  (slug-гүй)
router.get('/vehicles/:id', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(slugOf(req)),
      pool.query(
        `SELECT v.*, COALESCE(SUM(vc.amount), 0) AS total_cost,
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
         WHERE v.id=$1 AND v.company_id=${companyBySlug(2)} AND v.status='PUBLISHED'
         GROUP BY v.id`,
        [req.params.id, slugOf(req)]
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    res.json({
      ...rows[0],
      total_cost: comp.show_prices ? rows[0].total_cost : null,
      company: comp,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/:slug/vehicles/:id
router.get('/:slug/vehicles/:id', async (req, res) => {
  try {
    const comp = await findCompany(req.params.slug);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });

    const { rows } = await pool.query(
      `SELECT v.*, COALESCE(SUM(vc.amount), 0) AS total_cost,
              ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
       FROM vehicles v
       LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
       WHERE v.id=$1 AND v.company_id=$2 AND v.status='PUBLISHED'
       GROUP BY v.id`,
      [req.params.id, comp.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    res.json({
      ...rows[0],
      total_cost: comp.show_prices ? rows[0].total_cost : null,
      company: comp,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
