import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { currentUser, invalidateUser, requireAdmin, requireAuth, ROLES } from '../../middleware/auth';
import { emailExists, insertUser, listUsers, updateUser } from './users.repo';

// Ажилтан удирдах (зөвхөн админ)
const router = Router();
router.use(requireAuth, requireAdmin);

const PASSWORD_MSG = 'Нууц үг хамгийн багадаа 8 тэмдэгт';

const createSchema = z
  .object({
    name: z
      .unknown()
      .optional()
      .transform((v) => String(v ?? '').trim()),
    email: z
      .unknown()
      .optional()
      .transform((v) =>
        String(v ?? '')
          .trim()
          .toLowerCase(),
      ),
    password: z
      .unknown()
      .optional()
      .transform((v) => String(v ?? '')),
    role: z
      .unknown()
      .optional()
      .transform((v) => (ROLES.includes(v as never) ? (v as (typeof ROLES)[number]) : 'SALES')),
  })
  .refine((u) => u.name && /^\S+@\S+\.\S+$/.test(u.email), 'Нэр, зөв и-мэйл оруулна уу')
  .refine((u) => u.password.length >= 8, PASSWORD_MSG);

const updateSchema = z.object({
  name: z
    .unknown()
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v).trim()))
    .refine((v) => v === undefined || v.length > 0, 'Нэр хоосон байж болохгүй'),
  role: z.enum(ROLES, { error: 'Буруу эрх' }).optional(),
  is_active: z
    .unknown()
    .optional()
    .transform((v) => (v === undefined ? undefined : !!v)),
  password: z
    .unknown()
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v)))
    .refine((v) => v === undefined || v.length >= 8, PASSWORD_MSG),
});

// GET /api/users
router.get('/', async (_req, res) => {
  res.json(await listUsers());
});

// POST /api/users { name, email, password, role }
router.post('/', async (req, res) => {
  const u = parse(createSchema, req.body);
  if (await emailExists(u.email)) throw conflict('Энэ и-мэйлээр бүртгэл аль хэдийн байна');
  const passwordHash = await bcrypt.hash(u.password, 10);
  res.status(201).json(await insertUser({ name: u.name, email: u.email, passwordHash, role: u.role }));
});

// PATCH /api/users/:id { name?, role?, is_active?, password? }
router.patch('/:id', async (req, res) => {
  const id = idParam(req.params.id, 'Ажилтан олдсонгүй');
  const { password, ...rest } = parse(updateSchema, req.body);
  // Өөрийгөө админаас буулгах, идэвхгүй болгохоос сэргийлнэ (компани админгүй үлдэхгүй)
  if (id === currentUser(req).id && ((rest.role && rest.role !== 'ADMIN') || rest.is_active === false))
    throw badRequest('Өөрийнхөө эрхийг бууруулах, идэвхгүй болгох боломжгүй');
  const values = { ...rest, password: password === undefined ? undefined : await bcrypt.hash(password, 10) };
  if (Object.values(values).every((v) => v === undefined)) throw badRequest('Өөрчлөх зүйл алга');
  const user = await updateUser(id, values);
  if (!user) throw notFound('Ажилтан олдсонгүй');
  invalidateUser(user.id);
  res.json(user);
});

export default router;
