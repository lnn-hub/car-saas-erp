-- Дутуу баганууд нэмэх
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug VARCHAR(60) UNIQUE,
  ADD COLUMN IF NOT EXISTS show_prices BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;

-- vehicles дээр дутуу баганууд
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS arrived_at DATE,
  ADD COLUMN IF NOT EXISTS manufactured_date DATE,
  ADD COLUMN IF NOT EXISTS has_plates BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- vehicle_images хүснэгт үүсгэх (байхгүй бол)
CREATE TABLE IF NOT EXISTS vehicle_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_main    BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
