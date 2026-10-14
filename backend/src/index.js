require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
// FRONTEND_URL нь таслалаар тусгаарласан олон домэйн байж болно (компани бүрийн нийтийн сайт)
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? [...allowedOrigins, 'http://localhost:3000'] : true,
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/vehicles',  require('./routes/vehicles'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/finance',   require('./routes/finance'));
app.use('/api/billing',   require('./routes/billing'));
app.use('/api/public',    require('./routes/public'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/team',      require('./routes/team'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/super',     require('./routes/super'));
app.use('/api/upload',    require('./routes/upload'));
app.use('/uploads',       require('express').static(require('path').join(__dirname, '../uploads')));

const pool = require('./db/pool');
// /health нь Render-ийг сэрүүн байлгахад ашиглагдана. Мэдээллийн санг сэрээхгүй (Neon-ийн
// үнэгүй цагийг хэмнэнэ). Мэдээллийн сангийн шалгалт хэрэгтэй бол /health?db=1
app.get('/health', async (req, res) => {
  if (!req.query.db) return res.json({ status: 'ok' });
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: true }); }
  catch { res.json({ status: 'ok', db: false }); }
});

const PORT = process.env.PORT || 4000;
require('./db/ensureSchema')()
  .catch(err => console.error('Schema шинэчлэхэд алдаа:', err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`Server ажиллаж байна: http://localhost:${PORT}`));
  });
