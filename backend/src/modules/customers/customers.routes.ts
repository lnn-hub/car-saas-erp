import { Router } from 'express';
import { z } from 'zod';
import { badRequest, notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as repo from './customers.repo';

const router = Router();
router.use(requireAuth);

const NOT_FOUND = 'Үйлчлүүлэгч олдсонгүй';

// Хоосон мөрийг null болгож, урт хязгаарлана. Ирээгүй талбар undefined (хөндөхгүй).
const text = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : String(v).trim().slice(0, max) || null));

const fields = {
  phone: text(30),
  email: text(120),
  register: text(20),
  address: text(500),
  note: text(2000),
};
const createSchema = z.object({
  name: text(120).refine((v) => !!v, 'Нэр заавал шаардлагатай'),
  ...fields,
});
const updateSchema = z.object({
  name: text(120).refine((v) => v !== null, 'Нэр хоосон байж болохгүй'),
  ...fields,
});

// GET /api/customers?q= — нэр/утсаар хайх (зарах цонхонд); q-гүй бол бүгд
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(q ? await repo.searchCustomers(q) : await repo.listAllCustomers());
});

// GET /api/customers/list — бүх үйлчлүүлэгч, худалдан авалтын тоотой
router.get('/list', async (_req, res) => {
  res.json(await repo.listCustomersWithStats());
});

// GET /api/customers/:id — дэлгэрэнгүй: худалдан авалт, сайтаас ирсэн хүсэлтүүд
router.get('/:id', async (req, res) => {
  const customer = await repo.findCustomer(idParam(req.params.id, NOT_FOUND));
  if (!customer) throw notFound(NOT_FOUND);
  const [sales, leads] = await Promise.all([repo.customerPurchases(customer.id), repo.leadsByPhone(customer.phone)]);
  res.json({ ...customer, sales, leads });
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, ...rest } = parse(createSchema, req.body);
  res.status(201).json(await repo.insertCustomer({ ...rest, name: name! }));
});

// PATCH /api/customers/:id
router.patch('/:id', async (req, res) => {
  const id = idParam(req.params.id, NOT_FOUND);
  const values = parse(updateSchema, req.body);
  if (Object.values(values).every((v) => v === undefined)) throw badRequest('Өөрчлөх зүйл алга');
  const customer = await repo.updateCustomer(id, { ...values, name: values.name ?? undefined });
  if (!customer) throw notFound(NOT_FOUND);
  res.json(customer);
});

// DELETE /api/customers/:id — худалдан авалтгүй үйлчлүүлэгчийг (админ)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = idParam(req.params.id, NOT_FOUND);
  if (await repo.hasPurchases(id)) throw badRequest('Худалдан авалтын түүхтэй үйлчлүүлэгчийг устгах боломжгүй');
  if (!(await repo.deleteCustomer(id))) throw notFound(NOT_FOUND);
  res.json({ ok: true });
});

export default router;
