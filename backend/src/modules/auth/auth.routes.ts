import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config, demoLoginEnabled } from '../../config';
import { notFound } from '../../lib/http';
import { parse } from '../../lib/validate';
import { demoLogin, login } from './auth.service';

// Нийтийн бүртгэл байхгүй. Ажилтныг админ Тохиргоо → Ажилтнууд хэсгээс нэмнэ.
const router = Router();

// Нэвтрэх оролдлогыг хязгаарлана (нууц үг таах халдлагаас)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: 'Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу' },
});

const loginSchema = z.object({
  email: z.string({ error: 'Email, нууц үг оруулна уу' }).min(1, 'Email, нууц үг оруулна уу'),
  password: z.string({ error: 'Email, нууц үг оруулна уу' }).min(1, 'Email, нууц үг оруулна уу'),
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  res.json(await login(email, password));
});

// POST /api/auth/demo — танилцуулгын горим: нууц үггүйгээр анхны админаар нэвтэрнэ.
// Зөвхөн DEMO_LOGIN=true үед ажиллана. Бодит ашиглалтад унтраасан байх ёстой.
router.post('/demo', async (_req, res) => {
  if (!demoLoginEnabled()) throw notFound('Олдсонгүй');
  res.json(await demoLogin());
});

export default router;
