import pool from '../../db/pool';
import { updateSet } from '../../lib/sql';

// Систем нэг компанид зориулагдсан. Компанийн тохиргоо (нэр, утас, лого, Facebook...) companies хүснэгтийн
// анхны мөрөнд хадгалагдана.
const COMPANY_ROW = '(SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)';

export interface Company {
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  working_hours: string | null;
  logo_url: string | null;
  show_prices: boolean;
  messenger_url: string | null;
  viber_phone: string | null;
  whatsapp_phone: string | null;
  fb_page_id: string | null;
  fb_page_name: string | null;
  fb_page_token: string | null;
}

// Нийтэд (сайт руу) гаргаж болох талбарууд. Facebook токен хэзээ ч гарахгүй.
export const PUBLIC_FIELDS =
  'name, phone, address, email, working_hours, logo_url, show_prices, messenger_url, viber_phone, whatsapp_phone';

export async function getCompany<K extends keyof Company>(fields: readonly K[]): Promise<Pick<Company, K> | null> {
  const { rows } = await pool.query<Pick<Company, K>>(
    `SELECT ${fields.join(', ')} FROM companies ORDER BY created_at ASC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function getPublicCompany() {
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM companies ORDER BY created_at ASC LIMIT 1`);
  return (rows[0] as Omit<Company, 'fb_page_id' | 'fb_page_name' | 'fb_page_token'>) ?? null;
}

export async function getSettings() {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS}, fb_page_name, (fb_page_token IS NOT NULL) AS fb_connected
     FROM companies ORDER BY created_at ASC LIMIT 1`,
  );
  return rows[0] ?? null;
}

// Зөвхөн өгсөн талбаруудыг шинэчилнэ (undefined нь хөндөхгүй)
export async function updateCompany(values: Partial<Company>) {
  const set = updateSet(values);
  if (set.isEmpty) return;
  await pool.query(`UPDATE companies SET ${set.sql} WHERE id = ${COMPANY_ROW}`, set.params);
}
