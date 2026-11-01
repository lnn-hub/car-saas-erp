const router = require('express').Router();
const pool = require('../db/pool');
const { serverError } = require('../utils/http');
const rateLimit = require('express-rate-limit');

const { getCompany } = require('../db/company');

// Сайтад харагдах компанийн мэдээлэл
const findCompany = () =>
  getCompany(
    'name, phone, address, email, working_hours, logo_url, show_prices, messenger_url, viber_phone, whatsapp_phone',
  );

// GET /api/public
router.get('/', async (req, res) => {
  try {
    const comp = await findCompany();
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });
    res.json(comp);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/public/team
router.get('/team', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, position, bio, photo_url FROM team_members ORDER BY sort_order, created_at',
    );
    res.json(rows);
  } catch (err) {
    serverError(res, err);
  }
});

// Нийтэд харагдах талбарууд (whitelist). vin, created_by, status, зардал зэрэг дотоод мэдээлэл ОРОХГҮЙ.
const PUBLIC_COLS = `v.id, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission,
  v.engine_cc, v.mileage, v.description, v.has_plates, v.manufactured_date, v.price,
  CASE WHEN v.prev_price > v.price AND v.price_changed_at > NOW() - INTERVAL '30 days' THEN v.prev_price END AS prev_price`;

// GET /api/public/vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(),
      pool.query(
        `SELECT ${PUBLIC_COLS},
                (SELECT url FROM vehicle_images WHERE vehicle_id = v.id AND is_main = TRUE LIMIT 1) AS main_image,
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         WHERE v.status='PUBLISHED'
         ORDER BY v.created_at DESC`,
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });

    res.json({
      show_prices: comp.show_prices,
      vehicles: rows.map((v) => ({
        ...v,
        price: comp.show_prices ? v.price : null,
        prev_price: comp.show_prices ? v.prev_price : null,
      })),
    });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/public/vehicles/:id
router.get('/vehicles/:id', async (req, res) => {
  try {
    const [comp, { rows }] = await Promise.all([
      findCompany(),
      pool.query(
        `SELECT ${PUBLIC_COLS},
                ARRAY(SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order) AS images
         FROM vehicles v
         WHERE v.id=$1 AND v.status='PUBLISHED'`,
        [req.params.id],
      ),
    ]);
    if (!comp) return res.status(404).json({ error: 'Компани олдсонгүй' });
    if (!rows[0]) return res.status(404).json({ error: 'Машин олдсонгүй' });

    res.json({
      ...rows[0],
      price: comp.show_prices ? rows[0].price : null,
      prev_price: comp.show_prices ? rows[0].prev_price : null,
      company: comp,
    });
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Машин олдсонгүй' });
    serverError(res, err);
  }
});

// POST /api/public/leads — сайтаас ирэх хүсэлт (үзэх цаг товлох / машин захиалах)
const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу' },
});
router.post('/leads', leadLimiter, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // spam бот (нуусан талбар бөглөсөн)
  const name = String(b.name || '')
    .trim()
    .slice(0, 120);
  const phone = String(b.phone || '')
    .replace(/[^\d+]/g, '')
    .slice(0, 20);
  const kind = b.kind === 'REQUEST' ? 'REQUEST' : 'VIEWING';
  const preferred =
    String(b.preferred_time || '')
      .trim()
      .slice(0, 120) || null;
  const message =
    String(b.message || '')
      .trim()
      .slice(0, 1000) || null;
  if (!name || phone.replace(/\D/g, '').length < 8)
    return res.status(400).json({ error: 'Нэр болон зөв утасны дугаар оруулна уу' });
  try {
    let vehicleId = null;
    if (b.vehicle_id && /^[0-9a-f-]{36}$/i.test(b.vehicle_id)) {
      const { rows } = await pool.query('SELECT id FROM vehicles WHERE id=$1', [b.vehicle_id]);
      vehicleId = rows[0]?.id || null;
    }
    await pool.query(
      `INSERT INTO leads (vehicle_id, kind, name, phone, preferred_time, message)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [vehicleId, kind, name, phone, preferred, message],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
