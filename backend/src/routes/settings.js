const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;
const { resolveFeatures } = require('../utils/features');
const { resolvePage, FbError } = require('../utils/facebook');

// GET /api/settings — компанийн тохиргоо авах
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, slug, phone, address, email, working_hours, logo_url, show_prices, plan, max_vehicles, features,
              messenger_url, viber_phone, whatsapp_phone, fb_page_name, (fb_page_token IS NOT NULL) AS fb_connected,
              (SELECT COUNT(*)::int FROM vehicles WHERE company_id = $1) AS vehicle_count
       FROM companies WHERE id=$1`,
      [req.user.company_id]
    );
    const row = rows[0];
    res.json(row ? { ...row, features: resolveFeatures(row.features) } : {});
  } catch (err) { serverError(res, err); }
});

// PATCH /api/settings — тохиргоо хадгалах
router.patch('/', auth, requireAdmin, async (req, res) => {
  const { name, phone, address, email, working_hours, logo_url, show_prices } = req.body;
  // Slug (нийтийн хаяг)-ыг зөвхөн суперадмин өөрчилнө
  const slug = req.user.superadmin ? req.body.slug : undefined;

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

    // Холбоо барих сувгууд: хоосон утга явуулбал устгана
    for (const key of ['messenger_url', 'viber_phone', 'whatsapp_phone']) {
      if (req.body[key] === undefined) continue;
      const val = String(req.body[key] || '').trim().slice(0, key === 'messenger_url' ? 255 : 30) || null;
      await pool.query(`UPDATE companies SET ${key} = $1 WHERE id = $2`, [val, req.user.company_id]);
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
       RETURNING name, slug, phone, address, email, working_hours, logo_url, show_prices, messenger_url, viber_phone, whatsapp_phone`,
      [slug || null, phone || null, address || null, logo_url || null,
       show_prices !== undefined ? show_prices : null, req.user.company_id,
       email ?? null, working_hours ?? null, name ? String(name).trim() : null]
    );
    res.json(rows[0]);
  } catch (err) { serverError(res, err); }
});

// POST /api/settings/facebook { token, page_id? } — Facebook пэйж холбох (токеныг хөтөч рүү буцаахгүй)
router.post('/facebook', auth, requireAdmin, async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (token.length < 20) return res.status(400).json({ error: 'Facebook токеноо оруулна уу' });
  try {
    const page = await resolvePage(token, req.body.page_id ? String(req.body.page_id) : undefined);
    await pool.query('UPDATE companies SET fb_page_id=$1, fb_page_name=$2, fb_page_token=$3 WHERE id=$4',
      [page.id, page.name, page.token, req.user.company_id]);
    res.json({ fb_connected: true, fb_page_name: page.name, pages: page.pages });
  } catch (err) {
    if (err instanceof FbError) return res.status(400).json({ error: err.message });
    serverError(res, err);
  }
});

// DELETE /api/settings/facebook — салгах
router.delete('/facebook', auth, requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE companies SET fb_page_id=NULL, fb_page_name=NULL, fb_page_token=NULL WHERE id=$1', [req.user.company_id]);
    res.json({ fb_connected: false });
  } catch (err) { serverError(res, err); }
});

module.exports = router;
