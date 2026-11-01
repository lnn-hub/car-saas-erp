const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;
const { COMPANY_ROW, getCompany } = require('../db/company');
const { resolvePage, FbError } = require('../utils/facebook');

// GET /api/settings — компанийн тохиргоо авах
router.get('/', auth, async (req, res) => {
  try {
    const row = await getCompany(
      `name, phone, address, email, working_hours, logo_url, show_prices,
       messenger_url, viber_phone, whatsapp_phone, fb_page_name, (fb_page_token IS NOT NULL) AS fb_connected`,
    );
    res.json(row || {});
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /api/settings — тохиргоо хадгалах
router.patch('/', auth, requireAdmin, async (req, res) => {
  const { name, phone, address, email, working_hours, logo_url, show_prices } = req.body;

  if (name !== undefined && !String(name).trim())
    return res.status(400).json({ error: 'Компанийн нэр хоосон байж болохгүй' });

  try {
    // Холбоо барих сувгууд: хоосон утга явуулбал устгана
    for (const key of ['messenger_url', 'viber_phone', 'whatsapp_phone']) {
      if (req.body[key] === undefined) continue;
      const val =
        String(req.body[key] || '')
          .trim()
          .slice(0, key === 'messenger_url' ? 255 : 30) || null;
      await pool.query(`UPDATE companies SET ${key} = $1 WHERE id = ${COMPANY_ROW}`, [val]);
    }

    const { rows } = await pool.query(
      `UPDATE companies SET
        phone         = COALESCE($1, phone),
        address       = COALESCE($2, address),
        logo_url      = COALESCE($3, logo_url),
        show_prices   = COALESCE($4, show_prices),
        email         = COALESCE($5, email),
        working_hours = COALESCE($6, working_hours),
        name          = COALESCE($7, name)
       WHERE id = ${COMPANY_ROW}
       RETURNING name, phone, address, email, working_hours, logo_url, show_prices, messenger_url, viber_phone, whatsapp_phone`,
      [
        phone || null,
        address || null,
        logo_url || null,
        show_prices !== undefined ? show_prices : null,
        email ?? null,
        working_hours ?? null,
        name ? String(name).trim() : null,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/settings/facebook { token, page_id? } — Facebook пэйж холбох (токеныг хөтөч рүү буцаахгүй)
router.post('/facebook', auth, requireAdmin, async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (token.length < 20) return res.status(400).json({ error: 'Facebook токеноо оруулна уу' });
  try {
    const page = await resolvePage(token, req.body.page_id ? String(req.body.page_id) : undefined);
    await pool.query(
      `UPDATE companies SET fb_page_id=$1, fb_page_name=$2, fb_page_token=$3 WHERE id = ${COMPANY_ROW}`,
      [page.id, page.name, page.token],
    );
    res.json({ fb_connected: true, fb_page_name: page.name, pages: page.pages });
  } catch (err) {
    if (err instanceof FbError) return res.status(400).json({ error: err.message });
    serverError(res, err);
  }
});

// DELETE /api/settings/facebook — салгах
router.delete('/facebook', auth, requireAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE companies SET fb_page_id=NULL, fb_page_name=NULL, fb_page_token=NULL WHERE id = ${COMPANY_ROW}`,
    );
    res.json({ fb_connected: false });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
