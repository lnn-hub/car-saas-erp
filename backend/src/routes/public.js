const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/public/:slug — компанийн мэдээлэл
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, address, logo_url, show_prices
       FROM companies WHERE slug=$1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Компани олдсонгүй' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/:slug/vehicles — нийтэд харагдах машинууд
router.get('/:slug/vehicles', async (req, res) => {
  try {
    const comp = await pool.query(
      'SELECT id, show_prices FROM companies WHERE slug=$1', [req.params.slug]
    );
    if (!comp.rows[0]) return res.status(404).json({ error: 'Компани олдсонгүй' });
    const { id: company_id, show_prices } = comp.rows[0];

    const { rows } = await pool.query(
      `SELECT v.id, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission,
              v.engine_cc, v.mileage, v.description, v.has_plates, v.manufactured_date,
              COALESCE(SUM(vc.amount), 0) AS total_cost,
              (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image,
              ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
       FROM vehicles v
       LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
       WHERE v.company_id=$1 AND v.status='PUBLISHED'
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [company_id]
    );

    const vehicles = rows.map(v => ({
      ...v,
      total_cost: show_prices ? v.total_cost : null,
    }));

    res.json({ company_id, show_prices, vehicles });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/:slug/vehicles/:id — нэг машины дэлгэрэнгүй
router.get('/:slug/vehicles/:id', async (req, res) => {
  try {
    const comp = await pool.query(
      'SELECT id, name, phone, show_prices FROM companies WHERE slug=$1', [req.params.slug]
    );
    if (!comp.rows[0]) return res.status(404).json({ error: 'Компани олдсонгүй' });
    const { id: company_id, show_prices } = comp.rows[0];

    const { rows } = await pool.query(
      `SELECT v.*, COALESCE(SUM(vc.amount), 0) AS total_cost,
              ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
       FROM vehicles v
       LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
       WHERE v.id=$1 AND v.company_id=$2 AND v.status='PUBLISHED'
       GROUP BY v.id`,
      [req.params.id, company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    res.json({
      ...rows[0],
      total_cost: show_prices ? rows[0].total_cost : null,
      company: comp.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
