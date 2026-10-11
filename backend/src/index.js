require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3000']
    : true,
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
app.use('/api/upload',    require('./routes/upload'));
app.use('/uploads',       require('express').static(require('path').join(__dirname, '../uploads')));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
require('./db/ensureSchema')()
  .catch(err => console.error('Schema шинэчлэхэд алдаа:', err.message))
  .finally(() => app.listen(PORT, () => console.log(`Server ажиллаж байна: http://localhost:${PORT}`)));
