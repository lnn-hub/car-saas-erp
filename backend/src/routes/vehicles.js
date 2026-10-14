const router = require('express').Router();
const { serverError } = require('../utils/http');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;

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
    serverError(res, err);
  }
});

// GET /api/vehicles/:id — нэг машин + зардлууд
router.get('/:id', auth, async (req, res) => {
  try {
    const [vehicle, costs, images] = await Promise.all([
      pool.query('SELECT * FROM vehicles WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]),
      pool.query('SELECT * FROM vehicle_costs WHERE vehicle_id = $1 ORDER BY created_at', [req.params.id]),
      pool.query('SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order', [req.params.id]),
    ]);
    if (!vehicle.rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json({ ...vehicle.rows[0], costs: costs.rows, images: images.rows });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/vehicles — машин нэмэх
router.post('/', auth, async (req, res) => {
  try {
    const { rows: lim } = await pool.query(
      `SELECT c.max_vehicles, (SELECT COUNT(*)::int FROM vehicles WHERE company_id = c.id) AS cnt
       FROM companies c WHERE c.id = $1`, [req.user.company_id]);
    if (lim[0] && lim[0].max_vehicles != null && lim[0].cnt >= lim[0].max_vehicles)
      return res.status(403).json({ error: `Багцын хязгаарт (${lim[0].max_vehicles} машин) хүрсэн байна. Багцаа ахиулна уу` });
  } catch (err) { return serverError(res, err); }
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
      `INSERT INTO vehicles (company_id, vin, brand, model, year, mileage, color, fuel_type, transmission, engine_cc, description, arrived_at, manufactured_date, has_plates, created_by, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'PUBLISHED') RETURNING *`,
      [req.user.company_id, vin, brand, model, year, mileage || 0, color, fuel_type || 'PETROL', transmission || 'AUTO',
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
    vals.push(req.params.id, req.user.company_id);
    const { rows } = await pool.query(
      `UPDATE vehicles SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length - 1} AND company_id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json(rows[0]);
  } catch (err) { serverError(res, err); }
});

// DELETE /api/vehicles/:id — борлуулалтгүй машиныг устгах
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]
    );
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
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });
    res.json(rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/vehicles/:id/costs — зардал нэмэх
router.post('/:id/costs', auth, async (req, res) => {
  const { cost_type, amount, currency, note } = req.body;
  const amt = Number(amount);
  if (!cost_type || !Number.isFinite(amt) || amt === 0)
    return res.status(400).json({ error: 'Зардлын төрөл, дүн заавал шаардлагатай' });

  try {
    // Машин нэвтэрсэн компанийнх мөн эсэхийг шалгана
    const own = await pool.query('SELECT 1 FROM vehicles WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
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

module.exports = router;
