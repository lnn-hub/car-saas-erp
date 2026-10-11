const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/vehicles — бүх машин
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
        COALESCE(SUM(vc.amount), 0) AS total_cost,
        (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image
       FROM vehicles v
       LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
       WHERE v.company_id = $1
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehicles/:id — нэг машин + зардлууд
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM vehicles WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    const costs = await pool.query(
      'SELECT * FROM vehicle_costs WHERE vehicle_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    const images = await pool.query(
      'SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order',
      [req.params.id]
    );

    res.json({ ...rows[0], costs: costs.rows, images: images.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehicles — машин нэмэх
router.post('/', auth, async (req, res) => {
  const { vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description } = req.body;
  if (!vin || !brand || !model || !year)
    return res.status(400).json({ error: 'VIN, марк, загвар, он заавал шаардлагатай' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicles (company_id, vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.company_id, vin, brand, model, year, mileage || 0, color, fuel_type || 'PETROL', transmission || 'AUTO', engine_cc, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'VIN давхардсан байна' });
    res.status(500).json({ error: err.message });
  }
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
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehicles/:id/costs — зардал нэмэх
router.post('/:id/costs', auth, async (req, res) => {
  const { cost_type, amount, currency, note } = req.body;
  if (!cost_type || !amount)
    return res.status(400).json({ error: 'Зардлын төрөл, дүн заавал шаардлагатай' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, cost_type, amount, currency || 'MNT', note, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
