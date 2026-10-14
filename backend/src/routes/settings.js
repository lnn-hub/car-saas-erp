const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { resolveFeatures } = require('../utils/features');

// GET /api/settings — компанийн тохиргоо авах
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, slug, phone, address, email, working_hours, logo_url, show_prices, plan, max_vehicles, features,
              (SELECT COUNT(*)::int FROM vehicles WHERE company_id = $1) AS vehicle_count
       FROM companies WHERE id=$1`,
      [req.user.company_id]
    );
    const row = rows[0];
    res.json(row ? { ...row, features: resolveFeatures(row.features) } : {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/settings — тохиргоо хадгалах
router.patch('/', auth, async (req, res) => {
  const { name, slug, phone, address, email, working_hours, logo_url, show_prices } = req.body;

  if (name !== undefined && !String(name).trim())
    return res.status(400).json({ error: 'Компанийн нэр хоосон байж болохгүй' });

  // Slug зөвхөн a-z, 0-9, - тэмдэгт байна
  if (slug && !/^[a-z0-9-]{3,50}$/.test(slug))
    return res.status(400).json({ error: 'Slug зөвхөн жижиг үсэг, тоо, зураас агуулна (3-50 тэмдэгт)' });

  try {
    // Slug давхардсан эсэх шалгах
    if (slug) {
      const { rows } = await pool.query(
        'SELECT id FROM companies WHERE slug=$1 AND id!=$2', [slug, req.user.company_id]
      );
      if (rows.length) return res.status(409).json({ error: 'Энэ slug аль хэдийн ашиглагдаж байна' });
    }

    const { rows } = await pool.query(
      `UPDATE companies SET
        slug        = COALESCE($1, slug),
        phone       = COALESCE($2, phone),
        address     = COALESCE($3, address),
        logo_url    = COALESCE($4, logo_url),
        show_prices = COALESCE($5, show_prices),
        email         = COALESCE($7, email),
        working_hours = COALESCE($8, working_hours),
        name          = COALESCE($9, name)
       WHERE id=$6
       RETURNING name, slug, phone, address, email, working_hours, logo_url, show_prices`,
      [slug || null, phone || null, address || null, logo_url || null,
       show_prices !== undefined ? show_prices : null, req.user.company_id,
       email ?? null, working_hours ?? null, name ? String(name).trim() : null]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
