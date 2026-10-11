-- Migration 004: QPay нэхэмжлэлийн хүснэгт
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS qpay_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  qpay_invoice_id VARCHAR(100) NOT NULL,
  plan            VARCHAR(30) NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qpay_company ON qpay_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_qpay_invoice ON qpay_invoices(qpay_invoice_id);
