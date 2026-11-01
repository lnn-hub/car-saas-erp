import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../lib/validate';
import { requireAuth, requireMoney } from '../../middleware/auth';
import * as repo from './reports.repo';
import { num, type SoldRow } from './reports.repo';

// Сарын болон жилийн тайлан. Зөвхөн админ, нягтлан.
const router = Router();
router.use(requireAuth, requireMoney);

const monthStart = (ym: string) => `${ym}-01`;
function addMonths(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const summaryFor = (ym: string) => repo.monthSummary(ym, monthStart(ym), monthStart(addMonths(ym, 1)));

// Зарагдсан машинуудыг нэг талбараар (төлбөрийн хэлбэр, марк) бүлэглэнэ
function group(rows: SoldRow[], key: 'payment_type' | 'brand') {
  const map = new Map<string, { key: string; count: number; revenue: number; profit: number }>();
  for (const r of rows) {
    const k = r[key] || '-';
    const g = map.get(k) ?? { key: k, count: 0, revenue: 0, profit: 0 };
    g.count++;
    g.revenue += num(r.sale_price);
    g.profit += num(r.profit);
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

const monthQuery = z.object({
  month: z
    .string({ error: 'Сарыг YYYY-MM хэлбэрээр өгнө үү' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Сарыг YYYY-MM хэлбэрээр өгнө үү'),
});
const yearQuery = z.object({
  year: z
    .string({ error: 'Оныг YYYY хэлбэрээр өгнө үү' })
    .regex(/^\d{4}$/, 'Оныг YYYY хэлбэрээр өгнө үү')
    .transform(Number),
});

// GET /api/reports/month?month=YYYY-MM
router.get('/month', async (req, res) => {
  const { month } = parse(monthQuery, req.query);
  const start = monthStart(month);
  const end = monthStart(addMonths(month, 1));
  const [summary, prev, sold, arrived, expenses] = await Promise.all([
    summaryFor(month),
    summaryFor(addMonths(month, -1)),
    repo.soldInMonth(start, end),
    repo.arrivedInMonth(start, end),
    repo.expensesInMonth(start, end),
  ]);
  res.json({
    month,
    summary,
    prev,
    sold,
    arrived,
    by_payment: group(sold, 'payment_type'),
    by_brand: group(sold, 'brand'),
    expenses,
    has_other_currency:
      sold.some((r) => r.other_ccy) || arrived.some((r) => r.other_ccy) || expenses.some((e) => e.currency !== 'MNT'),
  });
});

// GET /api/reports/year?year=YYYY — 12 сар, сар бүрээр
router.get('/year', async (req, res) => {
  const { year } = parse(yearQuery, req.query);
  const [sales, arrived] = await Promise.all([repo.salesByMonth(year), repo.arrivedByMonth(year)]);
  const months = Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`;
    const s = sales.find((r) => r.month === k);
    const a = arrived.find((r) => r.month === k);
    return { month: k, sold: num(s?.sold), revenue: num(s?.revenue), profit: num(s?.profit), arrived: num(a?.arrived) };
  });
  const total = months.reduce(
    (t, m) => ({
      sold: t.sold + m.sold,
      revenue: t.revenue + m.revenue,
      profit: t.profit + m.profit,
      arrived: t.arrived + m.arrived,
    }),
    { sold: 0, revenue: 0, profit: 0, arrived: 0 },
  );
  res.json({ year, months, total });
});

export default router;
