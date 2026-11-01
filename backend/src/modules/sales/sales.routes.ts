import { Router } from 'express';
import { parse } from '../../lib/validate';
import { canSeeMoney, currentUser, requireAuth } from '../../middleware/auth';
import { listSales, salesSummary } from './sales.repo';
import { createSale, saleSchema } from './sales.service';

const router = Router();
router.use(requireAuth);

// GET /api/sales — борлуулалтын жагсаалт. Өртөг, ашгийг борлуулагч харахгүй.
router.get('/', async (req, res) => {
  const rows = await listSales();
  res.json(canSeeMoney(req.user) ? rows : rows.map(({ total_cost: _cost, net_profit: _profit, ...rest }) => rest));
});

// POST /api/sales — машин зарах
router.post('/', async (req, res) => {
  res.status(201).json(await createSale(parse(saleSchema, req.body), currentUser(req).id));
});

// GET /api/sales/summary — нийт тойм
router.get('/summary', async (req, res) => {
  const s = await salesSummary();
  res.json(canSeeMoney(req.user) ? s : { total_sold: s.total_sold, total_revenue: s.total_revenue });
});

export default router;
