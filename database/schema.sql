-- ============================================================
-- Car Sales ERP — өгөгдлийн сангийн бүтэц (нэг компанид зориулсан)
-- Шинэ сан үүсгэхэд: psql "$DATABASE_URL" -f database/schema.sql
-- Backend асахдаа (src/db/ensureSchema.js) дутуу багана, индексийг өөрөө нэмдэг.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Компанийн тохиргоо (ганц мөр)
CREATE TABLE companies (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    phone          VARCHAR(20),
    address        TEXT,
    email          VARCHAR(255),
    working_hours  VARCHAR(255),
    about_text     TEXT,
    logo_url       TEXT,
    show_prices    BOOLEAN DEFAULT TRUE,
    messenger_url  VARCHAR(255),
    viber_phone    VARCHAR(30),
    whatsapp_phone VARCHAR(30),
    fb_page_id     VARCHAR(40),
    fb_page_name   VARCHAR(255),
    fb_page_token  TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- Ажилтнууд
CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES', 'FINANCE');

CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,  -- bcrypt hash
    role       user_role DEFAULT 'SALES',
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Машин
CREATE TYPE vehicle_status AS ENUM ('ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD');
CREATE TYPE fuel_type AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');
CREATE TYPE transmission AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE vehicles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin               VARCHAR(17) UNIQUE NOT NULL,
    brand             VARCHAR(50) NOT NULL,
    model             VARCHAR(50) NOT NULL,
    year              INT NOT NULL,
    mileage           INT DEFAULT 0,          -- км
    color             VARCHAR(30),
    fuel_type         fuel_type DEFAULT 'PETROL',
    transmission      transmission DEFAULT 'AUTO',
    engine_cc         INT,
    status            vehicle_status DEFAULT 'ARRIVED',
    description       TEXT,
    arrived_at        DATE,
    manufactured_date DATE,
    has_plates        BOOLEAN DEFAULT FALSE,
    price             NUMERIC(15, 2),         -- зарын үнэ
    prev_price        NUMERIC(15, 2),         -- үнэ буурахаас өмнөх үнэ
    price_changed_at  TIMESTAMPTZ,
    fb_post_url       VARCHAR(255),
    fb_posted_at      TIMESTAMPTZ,
    created_by        UUID REFERENCES users(id),
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vehicle_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    is_main    BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Машины зардал (өртөг)
CREATE TYPE cost_type AS ENUM ('PURCHASE', 'SHIPPING', 'CUSTOMS', 'REPAIR', 'CLEANING', 'OTHER');

CREATE TABLE vehicle_costs (
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
CREATE TABLE customers (
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
CREATE TYPE payment_type AS ENUM ('CASH', 'LOAN', 'LEASING');

CREATE TABLE sales (
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
CREATE TABLE team_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(120) NOT NULL,
    position   VARCHAR(120),
    bio        TEXT,
    photo_url  TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сайтаас ирсэн хүсэлт (үзэх цаг товлох, машин хайлгах)
CREATE TABLE leads (
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

CREATE INDEX idx_vehicle_costs_vid ON vehicle_costs(vehicle_id);
CREATE INDEX idx_sales_vehicle     ON sales(vehicle_id);
