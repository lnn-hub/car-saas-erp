-- Үндсэн бүтэц. Шинэ сан дээр бүх хүснэгтийг үүсгэнэ. Аль хэдийн ажиллаж буй сан дээр (migration
-- системээс өмнө үүссэн) юу ч эвдэхгүй: зөвхөн дутуу хүснэгт, багана, индексийг нэмнэ.

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES', 'FINANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vehicle_status AS ENUM ('ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE fuel_type AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transmission AS ENUM ('AUTO', 'MANUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cost_type AS ENUM ('PURCHASE', 'SHIPPING', 'CUSTOMS', 'REPAIR', 'CLEANING', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_type AS ENUM ('CASH', 'LOAN', 'LEASING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Компанийн тохиргоо (ганц мөр)
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  address    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS working_hours  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,
  ADD COLUMN IF NOT EXISTS show_prices    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS messenger_url  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS viber_phone    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS fb_page_id     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS fb_page_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fb_page_token  TEXT;
INSERT INTO companies (name) SELECT 'Автосалон' WHERE NOT EXISTS (SELECT 1 FROM companies);

-- Ажилтнууд
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL, -- bcrypt hash
  role       user_role DEFAULT 'SALES',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Машин
CREATE TABLE IF NOT EXISTS vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin          VARCHAR(17) UNIQUE NOT NULL,
  brand        VARCHAR(50) NOT NULL,
  model        VARCHAR(50) NOT NULL,
  year         INT NOT NULL,
  mileage      INT DEFAULT 0, -- км
  color        VARCHAR(30),
  fuel_type    fuel_type DEFAULT 'PETROL',
  transmission transmission DEFAULT 'AUTO',
  engine_cc    INT,
  status       vehicle_status DEFAULT 'ARRIVED',
  description  TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS arrived_at        DATE,
  ADD COLUMN IF NOT EXISTS manufactured_date DATE,
  ADD COLUMN IF NOT EXISTS has_plates        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price             NUMERIC(15, 2), -- зарын үнэ
  ADD COLUMN IF NOT EXISTS prev_price        NUMERIC(15, 2), -- үнэ буурахаас өмнөх үнэ
  ADD COLUMN IF NOT EXISTS price_changed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fb_post_url       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fb_posted_at      TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS vehicle_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_main    BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Машины зардал (өртөг)
CREATE TABLE IF NOT EXISTS vehicle_costs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  cost_type  cost_type NOT NULL,
  amount     NUMERIC(15, 2) NOT NULL,
  currency   VARCHAR(3) DEFAULT 'MNT',
  note       TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Үйлчлүүлэгч
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(100),
  register   VARCHAR(20),
  address    TEXT,
  note       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Борлуулалт
CREATE TABLE IF NOT EXISTS sales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID NOT NULL REFERENCES vehicles(id),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  sold_by      UUID REFERENCES users(id),
  sale_price   NUMERIC(15, 2) NOT NULL,
  payment_type payment_type DEFAULT 'CASH',
  note         TEXT,
  sold_at      TIMESTAMP DEFAULT NOW()
);

-- Сайтын "Бидний баг" хэсэг
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  position   VARCHAR(120),
  bio        TEXT,
  photo_url  TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сайтаас ирсэн хүсэлт (үзэх цаг товлох, машин хайлгах)
CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  kind           VARCHAR(20) NOT NULL DEFAULT 'VIEWING',
  name           VARCHAR(120) NOT NULL,
  phone          VARCHAR(30) NOT NULL,
  preferred_time VARCHAR(120),
  message        TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'NEW',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексүүд
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_vid ON vehicle_costs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
-- Нэг машин нэг л удаа зарагдана. Хуучин сан дээр давхардсан борлуулалт байвал индекс үүсэхгүй (анхааруулга өгнө),
-- гэхдээ migration амжилттай дуусна. Давхардлыг гараар цэвэрлээд шинэ migration-д индексийг нэмнэ.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_vehicle_unique ON sales(vehicle_id);
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'idx_sales_vehicle_unique үүсгэсэнгүй: нэг машин хэд хэдэн борлуулалттай байна';
END $$;
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
