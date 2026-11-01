const pool = require('./pool');

// Олон машин, олон зурагтай үед удаашрахаас сэргийлэх индексүүд (дахин ажиллуулахад аюулгүй)
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)',
  'CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at)',
  // Нэг машин олон удаа зарагдахаас хамгаална (давхардал байвал үүсэхгүй, лог руу бичигдэнэ)
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_vehicle_unique ON sales(vehicle_id)',
];

async function ensureIndexes() {
  for (const sql of INDEXES) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('Индекс үүсгэхэд алдаа:', err.message);
    }
  }
}

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
      ADD COLUMN IF NOT EXISTS working_hours VARCHAR(255),
      ADD COLUMN IF NOT EXISTS about_text    TEXT,
      ADD COLUMN IF NOT EXISTS messenger_url  VARCHAR(255),
      ADD COLUMN IF NOT EXISTS viber_phone    VARCHAR(30),
      ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS fb_page_id     VARCHAR(40),
      ADD COLUMN IF NOT EXISTS fb_page_name   VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fb_page_token  TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(120) NOT NULL,
      position   VARCHAR(120),
      bio        TEXT,
      photo_url  TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Үнэ буурсныг харуулах: өмнөх (өндөр) үнэ, өөрчилсөн огноо
  await pool.query(`
    ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS prev_price       NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS price_changed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS fb_post_url      VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fb_posted_at     TIMESTAMPTZ
  `);
  // Сайтаас ирсэн хүсэлт (үзэх цаг товлох, машин захиалах)
  await pool.query(`
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
    )
  `);

  // Машины "зарын үнэ" (public) нь өртгөөс тусдаа талбар. Анх үүсэхэд нэг удаа өмнөх харагдаж байсан
  // үнийг (өртгийн нийлбэр) хуулж, сайтад үнэ алга болохоос сэргийлнэ. Админ дараа нь засна.
  const { rows: col } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name='vehicles' AND column_name='price'",
  );
  if (!col.length) {
    await pool.query('ALTER TABLE vehicles ADD COLUMN price NUMERIC(15,2)');
    await pool.query(
      `UPDATE vehicles v SET price = c.total
       FROM (SELECT vehicle_id, SUM(amount) AS total FROM vehicle_costs GROUP BY vehicle_id) c
       WHERE c.vehicle_id = v.id AND c.total > 0`,
    );
  }
}

// Систем нэг компанит болсон: хүснэгтүүдийн company_id баганыг заавал бөглөх шаардлагагүй болгоно.
// Багана, өгөгдөл устахгүй. Анх шилжихэд үндсэн компаниас бусад (тест) компанийн ажилтнуудыг идэвхгүй болгоно,
// эс бөгөөс тэд энэ компанийн бүх өгөгдлийг харах болно.
const OLD_TENANT_TABLES = ['users', 'vehicles', 'customers', 'sales', 'leads', 'team_members'];
async function dropTenancy() {
  const { rows } = await pool.query(
    `SELECT table_name, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'company_id' AND table_name = ANY($1)`,
    [OLD_TENANT_TABLES],
  );
  if (!rows.some((r) => r.is_nullable === 'NO')) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE users SET is_active = FALSE
       WHERE is_active AND company_id IS DISTINCT FROM (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)`,
    );
    if (rowCount) console.log(`Нэг компанит шилжилт: бусад компанийн ${rowCount} ажилтныг идэвхгүй болголоо`);
    for (const r of rows) await client.query(`ALTER TABLE ${r.table_name} ALTER COLUMN company_id DROP NOT NULL`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = async function run() {
  await ensureSchema();
  // Компанийн тохиргооны мөр заавал нэг байна
  await pool.query("INSERT INTO companies (name) SELECT 'Автосалон' WHERE NOT EXISTS (SELECT 1 FROM companies)");
  await dropTenancy();
  await ensureIndexes();
};
