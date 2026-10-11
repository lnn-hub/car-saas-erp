const pool = require('./pool');

const DEMO_TEAM = [
  ['Бат-Эрдэнэ Ганбаатар', 'Гүйцэтгэх захирал', 'Автомашины зах зээлд 15 гаруй жил ажилласан туршлагатай. Компанийн чиглэл, чанарын бодлогыг тодорхойлдог.'],
  ['Сарнай Баярсайхан', 'Борлуулалтын менежер', 'Худалдан авагч бүрт тохирох машиныг сонгоход тусалж, бүртгэл болон баримт бичгийн ажлыг дэмждэг.'],
  ['Төмөрбаатар Лхагва', 'Ахлах механик инженер', 'Машин бүрийн техникийн үзлэг, оношилгоог хариуцан борлуулалтын өмнө бүрэн шалгана.'],
  ['Оюунчимэг Дорж', 'Үйлчилгээний зөвлөх', 'Үйлчлүүлэгчийн асуулт, үзэх цаг товлох болон худалдааны дараах үйлчилгээг хариуцна.'],
];

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
      ADD COLUMN IF NOT EXISTS working_hours VARCHAR(255),
      ADD COLUMN IF NOT EXISTS about_text    TEXT
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

  const { rows } = await pool.query('SELECT id, phone, address, email, working_hours FROM companies ORDER BY created_at ASC LIMIT 1');
  const c = rows[0];
  if (!c) return;

  // Хоосон талбарт жишээ мэдээлэл тавина (Тохиргоо хэсгээс өөрчилж болно)
  await pool.query(
    `UPDATE companies SET
       phone         = COALESCE(NULLIF(phone, ''), '99112233'),
       address       = COALESCE(NULLIF(address, ''), 'Улаанбаатар хот, Баянгол дүүрэг, 3-р хороолол'),
       email         = COALESCE(NULLIF(email, ''), 'info@autodealer.mn'),
       working_hours = COALESCE(NULLIF(working_hours, ''), 'Даваа - Бямба: 09:00 - 19:00')
     WHERE id = $1`,
    [c.id]
  );

  const { rows: cnt } = await pool.query('SELECT COUNT(*)::int AS n FROM team_members WHERE company_id=$1', [c.id]);
  if (cnt[0].n === 0) {
    for (let i = 0; i < DEMO_TEAM.length; i++) {
      const [name, position, bio] = DEMO_TEAM[i];
      await pool.query(
        'INSERT INTO team_members (company_id, name, position, bio, sort_order) VALUES ($1,$2,$3,$4,$5)',
        [c.id, name, position, bio, i]
      );
    }
  }
}

module.exports = ensureSchema;
