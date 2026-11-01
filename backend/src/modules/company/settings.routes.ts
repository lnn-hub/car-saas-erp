import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { parse } from '../../lib/validate';
import { resolvePage } from '../facebook/facebook.client';
import { getPublicCompany, getSettings, updateCompany } from './company.repo';

const router = Router();
router.use(requireAuth);

// Хоосон утга ирвэл өмнөх утгаа хадгална (утас, хаяг, лого)
const keepIfEmpty = z
  .unknown()
  .optional()
  .transform((v) => (v ? String(v) : undefined));
// Хоосон утга ирвэл сувгийг устгана
const channel = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) =>
      v === undefined
        ? undefined
        : String(v ?? '')
            .trim()
            .slice(0, max) || null,
    );

const settingsSchema = z.object({
  name: z
    .unknown()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === null) return undefined;
      const name = String(v).trim();
      if (!name) {
        ctx.addIssue({ code: 'custom', message: 'Компанийн нэр хоосон байж болохгүй' });
        return z.NEVER;
      }
      return name;
    }),
  phone: keepIfEmpty,
  address: keepIfEmpty,
  logo_url: keepIfEmpty,
  show_prices: z.boolean().optional(),
  email: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  working_hours: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  messenger_url: channel(255),
  viber_phone: channel(30),
  whatsapp_phone: channel(30),
});

// GET /api/settings — компанийн тохиргоо
router.get('/', async (_req, res) => {
  res.json((await getSettings()) || {});
});

// PATCH /api/settings — тохиргоо хадгалах
router.patch('/', requireAdmin, async (req, res) => {
  await updateCompany(parse(settingsSchema, req.body));
  res.json(await getPublicCompany());
});

// POST /api/settings/facebook { token, page_id? } — Facebook пэйж холбох (токеныг хөтөч рүү буцаахгүй)
const facebookSchema = z.object({
  token: z
    .unknown()
    .optional()
    .transform((v) => String(v ?? '').trim())
    .refine((v) => v.length >= 20, 'Facebook токеноо оруулна уу'),
  page_id: z
    .unknown()
    .optional()
    .transform((v) => (v ? String(v) : undefined)),
});
router.post('/facebook', requireAdmin, async (req, res) => {
  const { token, page_id } = parse(facebookSchema, req.body);
  const page = await resolvePage(token, page_id);
  await updateCompany({ fb_page_id: page.id, fb_page_name: page.name, fb_page_token: page.token });
  res.json({ fb_connected: true, fb_page_name: page.name, pages: page.pages });
});

// DELETE /api/settings/facebook — салгах
router.delete('/facebook', requireAdmin, async (_req, res) => {
  await updateCompany({ fb_page_id: null, fb_page_name: null, fb_page_token: null });
  res.json({ fb_connected: false });
});

export default router;
