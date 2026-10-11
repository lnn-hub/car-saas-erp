// Жишээ (demo) машинууд + Wikimedia Commons-ийн лицензтэй зургууд оруулна.
//   Локал:      node scripts/seed-demo.js
//   Production: DATABASE_URL='<neon>' CLOUDINARY_CLOUD_NAME=.. CLOUDINARY_API_KEY=.. \
//               CLOUDINARY_API_SECRET=.. node scripts/seed-demo.js --yes
// Дахин ажиллуулахад өмнө оруулсан DEMO машинуудыг шинэчилнэ (бусад өгөгдөлд хүрэхгүй).
require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');
const pool  = require('../src/db/pool');
const { v2: cloudinary } = require('cloudinary');

const USE_CLOUDINARY = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (USE_CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const IMAGES     = require('./demo-images.json');
const UA         = { 'User-Agent': 'car-saas-demo-seed/1.0 (demo data)' };

const BULLETS = {
  hybrid: ['Хибрид системтэй, бага шатахуун зарцуулалттай', 'Autopilot-д ойр нөхцөл: орчны камер, эгнээ барих систем', 'Дулаацуулагчтай суудал, ухаалгай түлхүүргүй орох'],
  suv:    ['4WD бүх дугуй хөтлөгчтэй', 'Арын камер, зогсоолын мэдрэгч', 'Apple CarPlay / Android Auto дэмжинэ'],
  luxury: ['Савхан тохилог салон', 'Дулаацуулагч ба сэрүүцүүлэгчтэй суудал', 'Цахилгаан шилжүүлэгчтэй, санах ойтой суудал'],
};

const CARS = [
  { key: 'rav4', brand: 'Toyota', model: 'RAV4', year: 2021, mileage: 38500, color: 'Цагаан', fuel: 'HYBRID', cc: 2487, status: 'PUBLISHED', mfg: '2021-03-12',
    costs: [['PURCHASE', 62000000], ['SHIPPING', 6500000], ['CUSTOMS', 14000000], ['REPAIR', 1200000], ['CLEANING', 300000]],
    text: 'Toyota RAV4 Hybrid - өдөр тутмын хотын хөдөлгөөн болон хөдөө аян замд тохирсон, хэмнэлттэй, тав тухтай SUV.', list: BULLETS.hybrid },
  { key: 'lc300', brand: 'Toyota', model: 'Land Cruiser 300', year: 2022, mileage: 21000, color: 'Цагаан', fuel: 'PETROL', cc: 3445, status: 'PUBLISHED', mfg: '2022-01-20',
    costs: [['PURCHASE', 175000000], ['SHIPPING', 9000000], ['CUSTOMS', 52000000], ['REPAIR', 1500000], ['CLEANING', 500000]],
    text: 'Toyota Land Cruiser 300 - шинэ үеийн TNGA платформтой, 3.5L twin-turbo хөдөлгүүртэй, хатуу замд ч хотод ч хүчтэй флагман SUV.', list: BULLETS.suv.concat(BULLETS.luxury) },
  { key: 'prado', brand: 'Toyota', model: 'Prado', year: 2020, mileage: 54000, color: 'Цагаан', fuel: 'PETROL', cc: 2694, status: 'PUBLISHED', mfg: '2020-06-05',
    costs: [['PURCHASE', 88000000], ['SHIPPING', 7000000], ['CUSTOMS', 24000000], ['REPAIR', 2200000], ['CLEANING', 300000]],
    text: 'Toyota Land Cruiser Prado 150 - найдвартай бүтэцтэй, зам тээврийн ямар ч нөхцөлд өндөр нэвтрэлттэй гэр бүлийн SUV.', list: BULLETS.suv },
  { key: 'hilux', brand: 'Toyota', model: 'Hilux', year: 2021, mileage: 47000, color: 'Саарал', fuel: 'DIESEL', cc: 2755, status: 'PUBLISHED', mfg: '2021-04-18',
    costs: [['PURCHASE', 68000000], ['SHIPPING', 6500000], ['CUSTOMS', 17000000], ['REPAIR', 1800000], ['CLEANING', 300000]],
    text: 'Toyota Hilux 2.8L дизель - ачаа тээвэр, ажил хөдөлмөр болон хөдөө аялалд зориулсан бат бөх пикап.', list: ['4WD, арын дифференциалын түгжээтэй', 'Том ачааны тэвштэй', 'Дизель хөдөлгүүрийн өндөр эргүүлэх момент'] },
  { key: 'prius', brand: 'Toyota', model: 'Prius', year: 2019, mileage: 62000, color: 'Мөнгөлөг', fuel: 'HYBRID', cc: 1798, status: 'PUBLISHED', mfg: '2019-02-10',
    costs: [['PURCHASE', 29000000], ['SHIPPING', 4500000], ['CUSTOMS', 6500000], ['REPAIR', 900000], ['CLEANING', 200000]],
    text: 'Toyota Prius XW50 - 100 км-т 4-5 литр орчим шатахуун зарцуулдаг, хотын хөдөлгөөнд хамгийн хэмнэлттэй хибрид.', list: BULLETS.hybrid },
  { key: 'camry', brand: 'Toyota', model: 'Camry', year: 2020, mileage: 41000, color: 'Мөнгөлөг', fuel: 'HYBRID', cc: 2487, status: 'PUBLISHED', mfg: '2020-08-22',
    costs: [['PURCHASE', 42000000], ['SHIPPING', 5000000], ['CUSTOMS', 10500000], ['REPAIR', 900000], ['CLEANING', 200000]],
    text: 'Toyota Camry XV70 - тансаг дотор, тайван хөдөлгөөнтэй бизнес класс седан.', list: BULLETS.hybrid.concat(['Урд ба хойд суудлын тав тух']) },
  { key: 'highlander', brand: 'Toyota', model: 'Highlander', year: 2021, mileage: 33000, color: 'Цагаан', fuel: 'HYBRID', cc: 2487, status: 'ARRIVED', mfg: '2021-09-15',
    costs: [['PURCHASE', 72000000], ['SHIPPING', 7000000], ['CUSTOMS', 18000000]],
    text: 'Toyota Highlander Hybrid - 7 хүний суудалтай, том гэр бүлд тохирсон өргөн SUV.', list: BULLETS.hybrid.concat(['7 хүний суудал']) },
  { key: 'corollacross', brand: 'Toyota', model: 'Corolla Cross', year: 2022, mileage: 18000, color: 'Мөнгөлөг', fuel: 'HYBRID', cc: 1798, status: 'PUBLISHED', mfg: '2022-05-30',
    costs: [['PURCHASE', 45000000], ['SHIPPING', 5000000], ['CUSTOMS', 11000000], ['REPAIR', 600000], ['CLEANING', 200000]],
    text: 'Toyota Corolla Cross Hybrid - авсаархан хэмжээтэй, хотод зогсоол, жолоодлогод хялбар кроссовер.', list: BULLETS.hybrid },
  { key: 'rx', brand: 'Lexus', model: 'RX 300', year: 2019, mileage: 52000, color: 'Мөнгөлөг', fuel: 'PETROL', cc: 1998, status: 'PUBLISHED', mfg: '2019-07-08',
    costs: [['PURCHASE', 74000000], ['SHIPPING', 6500000], ['CUSTOMS', 19500000], ['REPAIR', 1500000], ['CLEANING', 300000]],
    text: 'Lexus RX 300 - тансаг салон, дуу чимээ багатай, өндөр зэрэглэлийн кроссовер.', list: BULLETS.luxury },
  { key: 'alphard', brand: 'Toyota', model: 'Alphard', year: 2020, mileage: 36000, color: 'Цагаан', fuel: 'PETROL', cc: 3456, status: 'RESERVED', mfg: '2020-10-03',
    costs: [['PURCHASE', 95000000], ['SHIPPING', 7500000], ['CUSTOMS', 27000000], ['REPAIR', 1000000], ['CLEANING', 300000]],
    text: 'Toyota Alphard 3.5L V6 - 7 хүний өргөн, тансаг салонтой минивэн. VIP болон гэр бүлийн тээвэрт тохиромжтой.', list: ['Цахилгаан хаагдах хаалга', 'Captain суудал, массажтай', 'JBL аудио систем'] },
];

async function fetchBuf(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status !== 429) throw new Error(`HTTP ${r.status} ${url}`);
    await new Promise(res => setTimeout(res, 3000 * (i + 1)));
  }
  throw new Error('Too many requests ' + url);
}

async function ensureImage(key, i, src) {
  if (USE_CLOUDINARY) {
    const buf  = await fetchBuf(src.url);
    const webp = await sharp(buf).resize(1600, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const url = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'car-saas/demo', public_id: `${key}-${i}`, overwrite: true, resource_type: 'image', format: 'webp' },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      ).end(webp);
    });
    await new Promise(res => setTimeout(res, 800));
    return url;
  }
  const name = `demo-${key}-${i}.webp`;
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) {
    const buf = await fetchBuf(src.url);
    await sharp(buf).resize(1600, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(file);
    await new Promise(res => setTimeout(res, 800));
  }
  return `/uploads/${name}`;
}

(async () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const m     = dbUrl.match(/@([^/:?]+)/);
  const host  = m ? m[1] : (dbUrl.startsWith('postgresql://localhost') || !dbUrl ? 'localhost' : 'танигдаагүй-хаяг');
  const remote = !/^(localhost|127\.0\.0\.1)$/.test(host);
  console.log(`DB: ${host} | Зураг: ${USE_CLOUDINARY ? 'Cloudinary' : 'локал /uploads'}`);
  if (remote && !process.argv.includes('--yes')) {
    console.error('Алсын (production) DB илэрлээ. Мэдэгдэж байгаа бол --yes нэмж дахин ажиллуулна уу.');
    process.exit(1);
  }
  if (remote && !USE_CLOUDINARY) {
    console.error('Production-д CLOUDINARY_* хувьсагч шаардлагатай (локал /uploads Render дээр хадгалагдахгүй).');
    process.exit(1);
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const { rows: [company] } = await pool.query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1');
  if (!company) throw new Error('Компани олдсонгүй');
  const { rows: [admin] } = await pool.query("SELECT id FROM users WHERE company_id=$1 AND role='ADMIN' ORDER BY created_at LIMIT 1", [company.id]);

  await pool.query("DELETE FROM vehicles WHERE company_id=$1 AND vin LIKE 'DEMO%'", [company.id]);

  for (const [n, c] of CARS.entries()) {
    const imgs = IMAGES[c.key];
    const credit = [...new Set(imgs.map(x => `${x.author} (${x.license})`))].join(', ');
    const description = `${c.text}\n\n${c.list.map(l => `• ${l}`).join('\n')}\n\nЗургийн эх сурвалж: Wikimedia Commons - ${credit}.`;
    const vin = `DEMO${c.key.toUpperCase().padEnd(8, '0').slice(0, 8)}${c.year}${n}`;
    const { rows: [v] } = await pool.query(
      `INSERT INTO vehicles (company_id, vin, brand, model, year, mileage, color, fuel_type, transmission,
                             engine_cc, status, description, arrived_at, manufactured_date, has_plates, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'AUTO',$9,$10,$11, CURRENT_DATE - $12::int, $13, $14, $15) RETURNING id`,
      [company.id, vin, c.brand, c.model, c.year, c.mileage, c.color, c.fuel, c.cc, c.status, description,
       10 + n * 3, c.mfg, n % 2 === 0, admin?.id || null]
    );
    for (const [type, amount] of c.costs)
      await pool.query('INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency, created_by) VALUES ($1,$2,$3,\'MNT\',$4)', [v.id, type, amount, admin?.id || null]);
    for (const [i, src] of imgs.entries()) {
      const url = await ensureImage(c.key, i, src);
      await pool.query('INSERT INTO vehicle_images (vehicle_id, url, is_main, sort_order) VALUES ($1,$2,$3,$4)', [v.id, url, i === 0, i]);
    }
    console.log(`+ ${c.brand} ${c.model} ${c.year} (${c.status}) - ${imgs.length} зураг`);
  }
  await pool.end();
  console.log('Дууслаа.');
})().catch(e => { console.error(e); process.exit(1); });
