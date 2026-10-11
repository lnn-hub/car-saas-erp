const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

const QPAY_BASE = 'https://merchant.qpay.mn/v2';

const PLANS = {
  starter:  { label: 'Starter',  amount: 29000, months: 1 },
  pro:      { label: 'Pro',      amount: 59000, months: 1 },
  business: { label: 'Business', amount: 99000, months: 1 },
};

// QPay access token авах (15 минут хүчинтэй)
async function getQPayToken() {
  const creds = Buffer.from(
    `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`
  ).toString('base64');

  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!res.ok) throw new Error('QPay token авахад алдаа гарлаа');
  const data = await res.json();
  return data.access_token;
}

const DEMO = process.env.QPAY_DEMO === 'true';

// POST /api/billing/demo/activate — demo горимд subscription шууд идэвхжүүлнэ
router.post('/demo/activate', auth, async (req, res) => {
  if (!DEMO) return res.status(403).json({ error: 'Demo горим идэвхгүй байна' });
  const { plan = 'pro' } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Буруу тариф' });
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);
  try {
    await pool.query(
      `UPDATE companies SET
         subscription_status='active',
         subscription_plan=$1,
         subscription_end_date=$2
       WHERE id=$3`,
      [plan, endDate.toISOString(), req.user.company_id]
    );
    res.json({ ok: true, plan, end_date: endDate.toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/status
router.get('/status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, subscription_status, subscription_plan,
              trial_ends_at, subscription_end_date
       FROM companies WHERE id=$1`,
      [req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Компани олдсонгүй' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/qpay/invoice — QPay нэхэмжлэл үүсгэх
router.post('/qpay/invoice', auth, async (req, res) => {
  const { plan = 'pro' } = req.body;
  const planInfo = PLANS[plan];
  if (!planInfo) return res.status(400).json({ error: 'Буруу тариф' });

  try {
    const { rows } = await pool.query(
      'SELECT name FROM companies WHERE id=$1', [req.user.company_id]
    );
    const company = rows[0];
    const senderInvoiceNo = `autoerp-${req.user.company_id.slice(0,8)}-${Date.now()}`;

    const token = await getQPayToken();

    const invoiceRes = await fetch(`${QPAY_BASE}/invoice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_code:          process.env.QPAY_INVOICE_CODE,
        sender_invoice_no:     senderInvoiceNo,
        invoice_receiver_code: 'terminal',
        invoice_description:   `AutoERP ${planInfo.label} план - 1 сар (${company.name})`,
        amount:                planInfo.amount,
        callback_url:          `${process.env.BACKEND_URL}/api/billing/qpay/callback`,
      }),
    });

    if (!invoiceRes.ok) {
      const err = await invoiceRes.text();
      return res.status(500).json({ error: `QPay алдаа: ${err}` });
    }

    const invoice = await invoiceRes.json();

    // DB-д хадгалах
    await pool.query(
      `INSERT INTO qpay_invoices (company_id, qpay_invoice_id, plan, amount)
       VALUES ($1,$2,$3,$4)`,
      [req.user.company_id, invoice.invoice_id, plan, planInfo.amount]
    );

    res.json({
      invoice_id: invoice.invoice_id,
      qr_text:    invoice.qr_text,
      qr_image:   invoice.qr_image,   // base64 PNG
      urls:       invoice.urls,        // банкны апп deep link-ууд
      amount:     planInfo.amount,
      plan_label: planInfo.label,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/qpay/check/:invoice_id — төлбөр шалгах
router.get('/qpay/check/:invoice_id', auth, async (req, res) => {
  try {
    // DB-д байгаа эсэх шалгах
    const { rows } = await pool.query(
      'SELECT * FROM qpay_invoices WHERE qpay_invoice_id=$1 AND company_id=$2',
      [req.params.invoice_id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Нэхэмжлэл олдсонгүй' });
    const inv = rows[0];

    if (inv.status === 'paid') return res.json({ paid: true });

    const token = await getQPayToken();
    const checkRes = await fetch(`${QPAY_BASE}/payment/check`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ object_type: 'INVOICE', object_id: inv.qpay_invoice_id }),
    });

    const data = await checkRes.json();
    const paid = Number(data.count) > 0;

    if (paid) {
      const plan      = inv.plan;
      const months    = PLANS[plan]?.months || 1;
      const endDate   = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      await pool.query(
        `UPDATE qpay_invoices SET status='paid', paid_at=NOW() WHERE id=$1`, [inv.id]
      );
      await pool.query(
        `UPDATE companies SET
           subscription_status='active',
           subscription_plan=$1,
           subscription_end_date=$2
         WHERE id=$3`,
        [plan, endDate.toISOString(), req.user.company_id]
      );
    }

    res.json({ paid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/qpay/callback — QPay webhook (төлбөр болсны дараа QPay дуудна)
router.post('/qpay/callback', async (req, res) => {
  const { payment_id, invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id байхгүй' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM qpay_invoices WHERE qpay_invoice_id=$1', [invoice_id]
    );
    if (!rows.length) return res.json({ ok: true });
    const inv = rows[0];

    if (inv.status !== 'paid') {
      const plan    = inv.plan;
      const months  = PLANS[plan]?.months || 1;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      await pool.query(
        `UPDATE qpay_invoices SET status='paid', paid_at=NOW() WHERE id=$1`, [inv.id]
      );
      await pool.query(
        `UPDATE companies SET
           subscription_status='active',
           subscription_plan=$1,
           subscription_end_date=$2
         WHERE id=$3`,
        [plan, endDate.toISOString(), inv.company_id]
      );
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
