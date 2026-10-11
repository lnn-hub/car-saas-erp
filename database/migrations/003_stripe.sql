-- Migration 003: Stripe subscription талбарууд
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status    VARCHAR(30) DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_plan      VARCHAR(30) DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);
