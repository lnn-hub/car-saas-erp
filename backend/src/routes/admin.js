const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { seedDemo } = require('../../scripts/seed-demo');

let state = { running: false, done: 0, total: 0, message: '', error: null, finishedAt: null };

// Нийтийн сайтад харагддаг (анхны) компанийн админ л ажиллуулна
async function guard(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Зөвхөн админ' });
    const { rows } = await pool.query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1');
    if (!rows[0] || rows[0].id !== req.user.company_id)
      return res.status(403).json({ error: 'Зөвхөн нийтийн сайтын компанийн админ ажиллуулна' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

router.get('/demo-seed', auth, guard, (req, res) => res.json(state));

router.post('/demo-seed', auth, guard, (req, res) => {
  if (state.running) return res.status(409).json({ error: 'Аль хэдийн ажиллаж байна', ...state });
  state = { running: true, done: 0, total: 0, message: 'Эхэлж байна...', error: null, finishedAt: null };

  seedDemo({
    companyId: req.user.company_id,
    onProgress: ({ done, total, message }) => { state = { ...state, done, total, message }; },
  })
    .then(() => { state = { ...state, running: false, finishedAt: new Date().toISOString() }; })
    .catch(err => {
      console.error('demo-seed алдаа:', err);
      state = { ...state, running: false, error: err.message, finishedAt: new Date().toISOString() };
    });

  res.status(202).json(state);
});

module.exports = router;
