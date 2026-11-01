const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { resolveFeatures } = require('../utils/features');

// Компанийн төлөв (идэвхтэй эсэх, боломжууд) - 30 секунд санах ойд хадгална
const cache = new Map();
const TTL = 30_000;

async function companyState(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit;
  const { rows } = await pool.query('SELECT is_active, features FROM companies WHERE id=$1', [id]);
  const row = rows[0];
  const st = { ts: Date.now(), exists: !!row, active: row ? row.is_active !== false : false, features: resolveFeatures(row?.features) };
  cache.set(id, st);
  return st;
}
const invalidateCompany = (id) => (id ? cache.delete(id) : cache.clear());

// Хэрэглэгчийн одоогийн эрх, идэвхтэй эсэх (эрх солигдвол / идэвхгүй болговол 30с дотор хүчинтэй)
const userCache = new Map();
async function userState(id) {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit;
  const { rows } = await pool.query('SELECT role, is_active FROM users WHERE id=$1', [id]);
  const st = { ts: Date.now(), exists: !!rows[0], active: rows[0]?.is_active !== false, role: rows[0]?.role };
  userCache.set(id, st);
  return st;
}
const invalidateUser = (id) => userCache.delete(id);

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token байхгүй' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token буруу эсвэл хугацаа дууссан' });
  }

  try {
    if (!decoded.superadmin) {
      const st = await companyState(decoded.company_id);
      if (!st.exists || !st.active) return res.status(403).json({ error: 'Танай компанийн эрх түр хаагдсан байна' });
    }
    const us = await userState(decoded.id);
    if (!us.exists || !us.active) return res.status(401).json({ error: 'Таны бүртгэл идэвхгүй байна' });
    req.user = { ...decoded, role: us.role };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const requireFeature = (key) => async (req, res, next) => {
  try {
    const st = await companyState(req.user.company_id);
    if (!st.features[key]) return res.status(403).json({ error: 'Энэ боломж танай багцад идэвхгүй байна' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const requireAdmin = (req, res, next) =>
  (req.user?.role === 'ADMIN' || req.user?.superadmin) ? next() : res.status(403).json({ error: 'Энэ үйлдэлд админ эрх шаардлагатай' });

// Өртөг, ашиг, тайлан харах эрх: Админ, Нягтлан (FINANCE). Борлуулагч (SALES) харахгүй.
const canSeeMoney = (user) => !!user && (user.role === 'ADMIN' || user.role === 'FINANCE' || !!user.superadmin);
const requireMoney = (req, res, next) =>
  canSeeMoney(req.user) ? next() : res.status(403).json({ error: 'Энэ мэдээллийг харах эрх танд байхгүй' });

module.exports = authMiddleware;
module.exports.canSeeMoney = canSeeMoney;
module.exports.requireMoney = requireMoney;
module.exports.requireAdmin = requireAdmin;
module.exports.requireFeature = requireFeature;
module.exports.invalidateCompany = invalidateCompany;
module.exports.invalidateUser = invalidateUser;
