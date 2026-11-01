import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { deleteMember, insertMember, listTeam, updateMember } from './team.repo';

// Сайтын "Бидний баг" хэсэг. Бүх ажилтан уншина, зөвхөн админ засна.
const router = Router();
const adminForWrites: RequestHandler = (req, res, next) =>
  req.method === 'GET' ? next() : requireAdmin(req, res, next);
router.use(requireAuth, adminForWrites);

const createSchema = z.object({
  name: z.string({ error: 'Нэр оруулна уу' }).trim().min(1, 'Нэр оруулна уу'),
  position: z.string().nullish(),
  bio: z.string().nullish(),
});
const updateSchema = z.object({
  name: z
    .unknown()
    .optional()
    .transform((v) => (v === undefined || v === null ? null : String(v).trim()))
    .refine((v) => v === null || v.length > 0, 'Нэр оруулна уу'),
  position: z.string().nullish(),
  bio: z.string().nullish(),
});

router.get('/', async (_req, res) => {
  res.json(await listTeam());
});

router.post('/', async (req, res) => {
  const m = parse(createSchema, req.body);
  res.status(201).json(await insertMember({ name: m.name, position: m.position || null, bio: m.bio || null }));
});

router.patch('/:id', async (req, res) => {
  const id = idParam(req.params.id, 'Олдсонгүй');
  const m = parse(updateSchema, req.body);
  const member = await updateMember(id, { name: m.name, position: m.position ?? null, bio: m.bio ?? null });
  if (!member) throw notFound('Олдсонгүй');
  res.json(member);
});

router.delete('/:id', async (req, res) => {
  await deleteMember(idParam(req.params.id, 'Олдсонгүй'));
  res.json({ ok: true });
});

export default router;
