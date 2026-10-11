-- Migration 002: Санхүүгийн зардлын хүснэгт
CREATE TYPE expense_category AS ENUM (
  'RENT', 'SALARY', 'UTILITY', 'MARKETING', 'TAX', 'REPAIR', 'OTHER'
);

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category     expense_category NOT NULL DEFAULT 'OTHER',
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency     VARCHAR(3) NOT NULL DEFAULT 'MNT',
  note         TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_date    ON expenses(expense_date);
