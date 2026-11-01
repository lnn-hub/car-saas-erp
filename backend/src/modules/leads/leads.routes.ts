import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/http';
import { idParam, parse } from '../../lib/validate';
import { requireAuth } from '../../middleware/auth';
import { countNewLeads, deleteLead, LEAD_STATUSES, listLeads, setLeadStatus } from './leads.repo';
import { leadToCustomer } from './leads.service';

// Сайтаас ирсэн хүсэлтүүд (бүх ажилтан)
const router = Router();
router.use(requireAuth);

const NOT_FOUND = 'Хүсэлт олдсонгүй';

router.get('/', async (_req, res) => {
  res.json(await listLeads());
});

// GET /api/leads/count — цэсний тэмдэглэгээнд (шинэ хүсэлтийн тоо)
router.get('/count', async (_req, res) => {
  res.json(await countNewLeads());
});

// PATCH /api/leads/:id { status }
const statusSchema = z.object({ status: z.enum(LEAD_STATUSES, { error: 'Буруу төлөв' }) });
router.patch('/:id', async (req, res) => {
  const { status } = parse(statusSchema, req.body);
  const lead = await setLeadStatus(idParam(req.params.id, NOT_FOUND), status);
  if (!lead) throw notFound(NOT_FOUND);
  res.json(lead);
});

// POST /api/leads/:id/customer — хүсэлтийг үйлчлүүлэгч болгох
router.post('/:id/customer', async (req, res) => {
  const result = await leadToCustomer(idParam(req.params.id, NOT_FOUND));
  res.status(result.created ? 201 : 200).json(result);
});

router.delete('/:id', async (req, res) => {
  if (!(await deleteLead(idParam(req.params.id, NOT_FOUND)))) throw notFound(NOT_FOUND);
  res.json({ ok: true });
});

export default router;
