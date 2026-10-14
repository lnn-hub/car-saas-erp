const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { serverError } = require('../utils/http');
const { seedDemo } = require('../../scripts/seed-demo');

let state = { running: false, done: 0, total: 0, message: '', error: null, failed: [], finishedAt: null };

// Зөвхөн суперадмин ажиллуулна
function guard(req, res, next) {
  if (!req.user.superadmin) return res.status(403).json({ error: 'Зөвхөн суперадмин' });
  next();
}

router.get('/demo-seed', auth, guard, (req, res) => res.json(state));

router.post('/demo-seed', auth, guard, (req, res) => {
  if (state.running) return res.status(409).json({ error: 'Аль хэдийн ажиллаж байна', ...state });
  state = { running: true, done: 0, total: 0, message: 'Эхэлж байна...', error: null, failed: [], finishedAt: null };

  seedDemo({
    companyId: req.user.company_id,
    onProgress: ({ done, total, message }) => { state = { ...state, done, total, message }; },
  })
    .then((r) => { state = { ...state, running: false, failed: r?.failed || [], finishedAt: new Date().toISOString() }; })
    .catch(err => {
      console.error('demo-seed алдаа:', err);
      state = { ...state, running: false, error: err.message, finishedAt: new Date().toISOString() };
    });

  res.status(202).json(state);
});

module.exports = router;
