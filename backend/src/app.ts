import path from 'node:path';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config';
import pool from './db/pool';
import { apiNotFound, errorHandler } from './lib/http';
import authRoutes from './modules/auth/auth.routes';
import settingsRoutes from './modules/company/settings.routes';
import customersRoutes from './modules/customers/customers.routes';
import imagesRoutes from './modules/images/images.routes';
import leadsRoutes from './modules/leads/leads.routes';
import publicRoutes from './modules/public/public.routes';
import reportsRoutes from './modules/reports/reports.routes';
import salesRoutes from './modules/sales/sales.routes';
import teamRoutes from './modules/team/team.routes';
import usersRoutes from './modules/users/users.routes';
import vehiclesRoutes from './modules/vehicles/vehicles.routes';

const app = express();
app.set('trust proxy', 1); // Render-ийн proxy ард (бодит IP rate limit-д хэрэгтэй)

app.use(
  cors({
    origin: config.frontendOrigins.length ? [...config.frontendOrigins, 'http://localhost:3000'] : true,
    credentials: true,
  }),
);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest,
  }),
);

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', imagesRoutes);
// Cloudinary тохируулаагүй (хөгжүүлэлтийн) үед зураг эндээс үйлчилнэ
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// /health нь Render-ийг сэрүүн байлгахад ашиглагдана. Мэдээллийн санг сэрээхгүй (Neon-ийн
// үнэгүй цагийг хэмнэнэ). Мэдээллийн сангийн шалгалт хэрэгтэй бол /health?db=1
app.get('/health', async (req, res) => {
  if (!req.query.db) {
    res.json({ status: 'ok' });
    return;
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: true });
  } catch {
    res.json({ status: 'ok', db: false });
  }
});

app.use('/api', apiNotFound);
app.use(errorHandler);

export default app;
