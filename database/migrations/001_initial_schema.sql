-- ============================================================
-- Car Sales ERP - Үндсэн Schema
-- ============================================================

-- UUID өргөтгөл идэвхжүүлэх
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. КОМПАНИ (Multi-tenancy)
-- ============================================================
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    address     TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. ХЭРЭГЛЭГЧ & ЭРХ
-- ============================================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES', 'FINANCE');

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,  -- bcrypt hash
    role         user_role DEFAULT 'SALES',
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. МАШИН (Vehicle)
-- ============================================================
CREATE TYPE vehicle_status AS ENUM ('ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD');
CREATE TYPE fuel_type AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');
CREATE TYPE transmission AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vin             VARCHAR(17) UNIQUE NOT NULL,
    brand           VARCHAR(50) NOT NULL,   -- Toyota, Hyundai...
    model           VARCHAR(50) NOT NULL,   -- Camry, Tucson...
    year            INT NOT NULL,
    mileage         INT DEFAULT 0,          -- км
    color           VARCHAR(30),
    fuel_type       fuel_type DEFAULT 'PETROL',
    transmission    transmission DEFAULT 'AUTO',
    engine_cc       INT,                    -- Хөдөлгүүрийн багтаамж
    status          vehicle_status DEFAULT 'ARRIVED',
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. МАШИНЫ ЗУРАГ
-- ============================================================
CREATE TABLE vehicle_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,              -- Cloudinary/S3 URL
    is_main     BOOLEAN DEFAULT FALSE,      -- Үндсэн зураг
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. ЗАРДЛЫН БҮРТГЭЛ (Costing Engine)
-- ============================================================
CREATE TYPE cost_type AS ENUM (
    'PURCHASE',     -- Авсан үнэ
    'SHIPPING',     -- Тээврийн зардал
    'CUSTOMS',      -- Гаалийн татвар
    'REPAIR',       -- Засвар
    'CLEANING',     -- Угаалга/Засмал
    'OTHER'         -- Бусад
);

CREATE TABLE vehicle_costs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    cost_type   cost_type NOT NULL,
    amount      NUMERIC(15, 2) NOT NULL,    -- Мөнгөн дүн
    currency    VARCHAR(3) DEFAULT 'MNT',   -- MNT, USD, JPY
    note        TEXT,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. ҮЙЛЧЛҮҮЛЭГЧ (Customer)
-- ============================================================
CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    register    VARCHAR(20),                -- Регистрийн дугаар
    address     TEXT,
    note        TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. БОРЛУУЛАЛТ (Sale)
-- ============================================================
CREATE TYPE payment_type AS ENUM ('CASH', 'LOAN', 'LEASING');

CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    customer_id     UUID NOT NULL REFERENCES customers(id),
    sold_by         UUID REFERENCES users(id),  -- Борлуулсан ажилтан
    sale_price      NUMERIC(15, 2) NOT NULL,    -- Зарагдсан үнэ
    payment_type    payment_type DEFAULT 'CASH',
    note            TEXT,
    sold_at         TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. VIEW: МАШИН + НИЙТ ӨРТӨГ + АШИГ
-- ============================================================
CREATE VIEW vehicle_profit_summary AS
SELECT
    v.id,
    v.company_id,
    v.vin,
    v.brand,
    v.model,
    v.year,
    v.status,
    COALESCE(SUM(vc.amount), 0)             AS total_cost,
    s.sale_price,
    s.sale_price - COALESCE(SUM(vc.amount), 0) AS net_profit,
    s.sold_at
FROM vehicles v
LEFT JOIN vehicle_costs vc ON vc.vehicle_id = v.id
LEFT JOIN sales s ON s.vehicle_id = v.id
GROUP BY v.id, v.company_id, v.vin, v.brand, v.model, v.year, v.status, s.sale_price, s.sold_at;

-- ============================================================
-- 9. ИНДЕКС (Хурдасгах)
-- ============================================================
CREATE INDEX idx_vehicles_company    ON vehicles(company_id);
CREATE INDEX idx_vehicles_status     ON vehicles(status);
CREATE INDEX idx_vehicle_costs_vid   ON vehicle_costs(vehicle_id);
CREATE INDEX idx_sales_company       ON sales(company_id);
CREATE INDEX idx_sales_vehicle       ON sales(vehicle_id);
CREATE INDEX idx_users_company       ON users(company_id);
