const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/settings — компанийн тохиргоо авах
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, slug, phone, address, logo_url, show_prices FROM companies WHERE id=$1',
      [req.user.company_id]
    );
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/settings — тохиргоо хадгалах
router.patch('/', auth, async (req, res) => {
  const { slug, phone, address, logo_url, show_prices } = req.body;

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
        show_prices = COALESCE($5, show_prices)
       WHERE id=$6
       RETURNING name, slug, phone, address, logo_url, show_prices`,
      [slug || null, phone || null, address || null, logo_url || null,
       show_prices !== undefined ? show_prices : null, req.user.company_id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
