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
    req.user = decoded;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const requireSuper = (req, res, next) =>
  req.user?.superadmin ? next() : res.status(403).json({ error: 'Зөвхөн суперадмин' });

const requireFeature = (key) => async (req, res, next) => {
  try {
    const st = await companyState(req.user.company_id);
    if (!st.features[key]) return res.status(403).json({ error: 'Энэ боломж танай багцад идэвхгүй байна' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const requireAdmin = (req, res, next) =>
  (req.user?.role === 'ADMIN' || req.user?.superadmin) ? next() : res.status(403).json({ error: 'Энэ үйлдэлд админ эрх шаардлагатай' });

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireSuper = requireSuper;
module.exports.requireFeature = requireFeature;
module.exports.invalidateCompany = invalidateCompany;
