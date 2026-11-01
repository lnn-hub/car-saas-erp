import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../../config';
import { notFound } from '../../lib/http';
import { idParam, isUuid, parse } from '../../lib/validate';
import { getPublicCompany } from '../company/company.repo';
import { createLead } from '../leads/leads.service';
import { listPublicTeam } from '../team/team.repo';
import { findPublicVehicle, listPublicVehicles } from '../vehicles/vehicles.repo';

// Нийтийн вэбсайтын API. Нэвтрэлт шаардахгүй; зөвхөн нийтлэгдсэн машин, нууц биш талбарууд.
const router = Router();

const COMPANY_NOT_FOUND = 'Компани олдсонгүй';
const VEHICLE_NOT_FOUND = 'Машин олдсонгүй';

// GET /api/public — компанийн мэдээлэл
router.get('/', async (_req, res) => {
  const company = await getPublicCompany();
  if (!company) throw notFound(COMPANY_NOT_FOUND);
  res.json(company);
});

// GET /api/public/team
router.get('/team', async (_req, res) => {
  res.json(await listPublicTeam());
});

// Үнэ нуух тохиргоотой бол үнийг хоосон болгоно
const withPrices = <T extends { price: unknown; prev_price: unknown }>(v: T, show: boolean) => ({
  ...v,
  price: show ? v.price : null,
  prev_price: show ? v.prev_price : null,
});

// GET /api/public/vehicles — нийтлэгдсэн машинууд
router.get('/vehicles', async (_req, res) => {
  const [company, vehicles] = await Promise.all([getPublicCompany(), listPublicVehicles()]);
  if (!company) throw notFound(COMPANY_NOT_FOUND);
  res.json({ show_prices: company.show_prices, vehicles: vehicles.map((v) => withPrices(v, company.show_prices)) });
});

// GET /api/public/vehicles/:id
router.get('/vehicles/:id', async (req, res) => {
  const id = idParam(req.params.id, VEHICLE_NOT_FOUND);
  const [company, vehicle] = await Promise.all([getPublicCompany(), findPublicVehicle(id)]);
  if (!company) throw notFound(COMPANY_NOT_FOUND);
  if (!vehicle) throw notFound(VEHICLE_NOT_FOUND);
  res.json({ ...withPrices(vehicle, company.show_prices), company });
});

// POST /api/public/leads — сайтаас ирэх хүсэлт (үзэх цаг товлох / машин захиалах)
const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу' },
});
const text = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) =>
      String(v ?? '')
        .trim()
        .slice(0, max),
    );
const leadSchema = z
  .object({
    name: text(120),
    phone: z
      .unknown()
      .optional()
      .transform((v) =>
        String(v ?? '')
          .replace(/[^\d+]/g, '')
          .slice(0, 20),
      ),
    kind: z
      .unknown()
      .optional()
      .transform((v) => (v === 'REQUEST' ? 'REQUEST' : 'VIEWING') as 'REQUEST' | 'VIEWING'),
    preferred_time: text(120).transform((v) => v || null),
    message: text(1000).transform((v) => v || null),
    vehicle_id: z
      .unknown()
      .optional()
      .transform((v) => (isUuid(v) ? v : undefined)),
  })
  .refine((l) => l.name && l.phone.replace(/\D/g, '').length >= 8, 'Нэр болон зөв утасны дугаар оруулна уу');

router.post('/leads', leadLimiter, async (req, res) => {
  const body = req.body ?? {};
  // Spam бот: хүн харахгүй нуусан талбарыг бөглөсөн бол хадгалахгүй (амжилттай мэт хариулна)
  if (body.website) {
    res.status(201).json({ ok: true });
    return;
  }
  await createLead(parse(leadSchema, body));
  res.status(201).json({ ok: true });
});

export default router;
