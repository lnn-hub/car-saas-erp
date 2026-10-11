const router     = require('express').Router();
const multer     = require('multer');
const sharp      = require('sharp');
const path       = require('path');
const fs         = require('fs');
const { v2: cloudinary } = require('cloudinary');
const pool       = require('../db/pool');
const auth       = require('../middleware/auth');

// ─── Cloudinary config ───────────────────────────────────────────────────────
const USE_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (USE_CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ─── Local fallback (dev) ────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!USE_CLOUDINARY && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Зөвхөн зураг оруулна уу'));
  },
});

async function saveImage(buffer, folder) {
  if (USE_CLOUDINARY) {
    // WebP болгоод Cloudinary-д upload
    const webpBuf = await sharp(buffer)
      .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `car-saas/${folder}`, resource_type: 'image', format: 'webp' },
        (err, result) => {
          if (err) reject(err);
          else resolve(result.secure_url);
        }
      ).end(webpBuf);
    });
  } else {
    // Local файл системд хадгалах
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await sharp(buffer)
      .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(filepath);
    return `/uploads/${filename}`;
  }
}

async function deleteImage(url) {
  if (USE_CLOUDINARY && url.includes('cloudinary.com')) {
    // public_id: "car-saas/vehicles/<id>/<filename>" — extension-гүй
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match) {
      try { await cloudinary.uploader.destroy(match[1]); } catch (_) {}
    }
  } else if (!USE_CLOUDINARY) {
    const filepath = path.join(UPLOAD_DIR, path.basename(url));
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}

// POST /api/upload/vehicle/:id
router.post('/vehicle/:id', auth, upload.array('images', 20), async (req, res) => {
  const vehicleId = req.params.id;
  try {
    const { rows } = await pool.query(
      'SELECT id FROM vehicles WHERE id=$1 AND company_id=$2',
      [vehicleId, req.user.company_id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Машин олдсонгүй' });

    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM vehicle_images WHERE vehicle_id=$1', [vehicleId]
    );
    let sortOrder = Number(existing[0].cnt);
    const saved = [];

    for (const file of req.files) {
      const url    = await saveImage(file.buffer, `vehicles/${vehicleId}`);
      const isMain = sortOrder === 0;
      const { rows: imgRows } = await pool.query(
        `INSERT INTO vehicle_images (vehicle_id, url, is_main, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [vehicleId, url, isMain, sortOrder++]
      );
      saved.push(imgRows[0]);
    }
    res.json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/upload/team/:id  (гишүүний зураг)
router.post('/team/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Зураг сонгоно уу' });
    const { rows } = await pool.query(
      'SELECT photo_url FROM team_members WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Олдсонгүй' });

    const url = await saveImage(req.file.buffer, 'team');
    if (rows[0].photo_url) await deleteImage(rows[0].photo_url);
    const { rows: upd } = await pool.query(
      'UPDATE team_members SET photo_url=$1 WHERE id=$2 RETURNING id, name, position, bio, photo_url, sort_order',
      [url, req.params.id]
    );
    res.json(upd[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/upload/image/:imageId
router.delete('/image/:imageId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT vi.*, v.company_id FROM vehicle_images vi
       JOIN vehicles v ON v.id = vi.vehicle_id WHERE vi.id=$1`,
      [req.params.imageId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Зураг олдсонгүй' });
    if (rows[0].company_id !== req.user.company_id)
      return res.status(403).json({ error: 'Эрхгүй' });

    await deleteImage(rows[0].url);
    await pool.query('DELETE FROM vehicle_images WHERE id=$1', [req.params.imageId]);

    if (rows[0].is_main) {
      await pool.query(
        `UPDATE vehicle_images SET is_main=true
         WHERE id = (SELECT id FROM vehicle_images WHERE vehicle_id=$1 ORDER BY sort_order LIMIT 1)`,
        [rows[0].vehicle_id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/upload/image/:imageId/main
router.patch('/image/:imageId/main', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT vi.*, v.company_id FROM vehicle_images vi
       JOIN vehicles v ON v.id = vi.vehicle_id WHERE vi.id=$1`,
      [req.params.imageId]
    );
    if (!rows[0] || rows[0].company_id !== req.user.company_id)
      return res.status(403).json({ error: 'Эрхгүй' });

    await pool.query('UPDATE vehicle_images SET is_main=false WHERE vehicle_id=$1', [rows[0].vehicle_id]);
    await pool.query('UPDATE vehicle_images SET is_main=true  WHERE id=$1', [req.params.imageId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
