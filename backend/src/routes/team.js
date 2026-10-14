const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { requireFeature } = auth;

router.use(auth, requireFeature('team'));

const FIELDS = 'id, name, position, bio, photo_url, sort_order';

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${FIELDS} FROM team_members WHERE company_id=$1 ORDER BY sort_order, created_at`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, position, bio } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Нэр оруулна уу' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO team_members (company_id, name, position, bio, sort_order)
       VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM team_members WHERE company_id=$1))
       RETURNING ${FIELDS}`,
      [req.user.company_id, name.trim(), position || null, bio || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  const { name, position, bio } = req.body;
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: 'Нэр оруулна уу' });
  try {
    const { rows } = await pool.query(
      `UPDATE team_members SET
         name     = COALESCE($1, name),
         position = COALESCE($2, position),
         bio      = COALESCE($3, bio)
       WHERE id=$4 AND company_id=$5
       RETURNING ${FIELDS}`,
      [name ? String(name).trim() : null, position ?? null, bio ?? null, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Олдсонгүй' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM team_members WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
