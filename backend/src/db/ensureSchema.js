const pool = require('./pool');

// Олон компани, олон зурагтай үед удаашрахаас сэргийлэх индексүүд (дахин ажиллуулахад аюулгүй)
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_sales_company_sold_at ON sales(company_id, sold_at)',
  'CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique ON companies(slug) WHERE slug IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id, sort_order)',
  // Нэг машин олон удаа зарагдахаас хамгаална (давхардал байвал үүсэхгүй, лог руу бичигдэнэ)
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_vehicle_unique ON sales(vehicle_id)',
];

async function ensureIndexes() {
  for (const sql of INDEXES) {
    try { await pool.query(sql); }
    catch (err) { console.error('Индекс үүсгэхэд алдаа:', err.message); }
  }
}

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
      ADD COLUMN IF NOT EXISTS working_hours VARCHAR(255),
      ADD COLUMN IF NOT EXISTS about_text    TEXT,
      ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS plan           VARCHAR(30) NOT NULL DEFAULT 'basic',
      ADD COLUMN IF NOT EXISTS max_vehicles   INT,
      ADD COLUMN IF NOT EXISTS features       JSONB NOT NULL DEFAULT '{}'::jsonb
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name       VARCHAR(120) NOT NULL,
      position   VARCHAR(120),
      bio        TEXT,
      photo_url  TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Машины "зарын үнэ" (public) нь өртгөөс тусдаа талбар. Анх үүсэхэд нэг удаа өмнөх харагдаж байсан
  // үнийг (өртгийн нийлбэр) хуулж, сайтад үнэ алга болохоос сэргийлнэ. Админ дараа нь засна.
  const { rows: col } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name='vehicles' AND column_name='price'"
  );
  if (!col.length) {
    await pool.query('ALTER TABLE vehicles ADD COLUMN price NUMERIC(15,2)');
    await pool.query(
      `UPDATE vehicles v SET price = c.total
       FROM (SELECT vehicle_id, SUM(amount) AS total FROM vehicle_costs GROUP BY vehicle_id) c
       WHERE c.vehicle_id = v.id AND c.total > 0`
    );
  }
}

module.exports = async function run() {
  await ensureSchema();
  await ensureIndexes();
};
