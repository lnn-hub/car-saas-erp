require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/vehicles',  require('./routes/vehicles'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports',   require('./routes/reports'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server ажиллаж байна: http://localhost:${PORT}`));
