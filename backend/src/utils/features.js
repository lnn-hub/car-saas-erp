// Компани бүрт асаах/унтраах боломжууд. Хадгалаагүй түлхүүр нь "асаалттай" гэж тооцогдоно.
const DEFAULTS = { reports: true, sales: true, team: true, leasing: true, compare: true };
const KEYS = Object.keys(DEFAULTS);

function resolveFeatures(stored) {
  const out = { ...DEFAULTS };
  if (stored && typeof stored === 'object') {
    for (const k of KEYS) if (typeof stored[k] === 'boolean') out[k] = stored[k];
  }
  return out;
}

function sanitizeFeatures(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const k of KEYS) if (typeof input[k] === 'boolean') out[k] = input[k];
  }
  return out;
}

module.exports = { DEFAULTS, KEYS, resolveFeatures, sanitizeFeatures };
