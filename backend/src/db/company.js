const pool = require('./pool');

// Систем нэг компанид зориулагдсан. Компанийн тохиргоо (нэр, утас, лого, Facebook...) companies хүснэгтийн анхны мөрөнд хадгалагдана.
const COMPANY_ROW = '(SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)';

async function getCompany(cols = '*') {
  const { rows } = await pool.query(`SELECT ${cols} FROM companies ORDER BY created_at ASC LIMIT 1`);
  return rows[0] || null;
}

module.exports = { COMPANY_ROW, getCompany };
