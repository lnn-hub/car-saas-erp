const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// ── Simple in-memory cache (GET requests only, 30 sec TTL) ──────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000;

function getCached(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  return null;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}
export function invalidateCache(prefix?: string) {
  if (!prefix) { cache.clear(); return; }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request(path: string, options: RequestInit = {}, useCache = false, _retry = 0): Promise<any> {
  const token = getToken();
  const cacheKey = path + (token || '');

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    if (useCache) setCached(cacheKey, data);
    return data;
  } catch (err) {
    // Render cold start (~30s) — сүлжээний алдаа бол 5 удаа retry
    const isNetworkErr = err instanceof TypeError;
    const DELAYS = [3000, 5000, 8000, 12000, 15000];
    if (isNetworkErr && _retry < DELAYS.length) {
      await new Promise(r => setTimeout(r, DELAYS[_retry]));
      return request(path, options, useCache, _retry + 1);
    }
    throw err;
  }
}

// Render free tier-ийн cold start-аас сэргийлж warm-up ping хийх
export function warmUp() {
  fetch(`${BACKEND}/health`, { method: 'GET' }).catch(() => {});
}

export const api = {
  login: (email: string, password: string) => {
    invalidateCache();
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },

  register: (data: { company_name: string; name: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getBillingStatus: () => request('/billing/status', {}, true),
  createQPayInvoice: (plan: string) =>
    request('/billing/qpay/invoice', { method: 'POST', body: JSON.stringify({ plan }) }),
  checkQPayInvoice: (invoice_id: string) =>
    request(`/billing/qpay/check/${invoice_id}`),

  getVehicles: () => request('/vehicles', {}, true),
  getVehicle:  (id: string) => request(`/vehicles/${id}`, {}, true),
  createVehicle: (data: object) => {
    invalidateCache('/vehicles');
    return request('/vehicles', { method: 'POST', body: JSON.stringify(data) });
  },
  updateStatus: (id: string, status: string) => {
    invalidateCache('/vehicles');
    return request(`/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  addCost: (id: string, data: object) => {
    invalidateCache(`/vehicles/${id}`);
    return request(`/vehicles/${id}/costs`, { method: 'POST', body: JSON.stringify(data) });
  },

  getSettings: () => request('/settings', {}, true),
  saveSettings: (data: object) => {
    invalidateCache('/settings');
    return request('/settings', { method: 'PATCH', body: JSON.stringify(data) });
  },

  getSales:   () => request('/sales', {}, true),
  getSummary: () => request('/sales/summary', {}, true),
  createSale: (data: object) => {
    invalidateCache('/sales');
    return request('/sales', { method: 'POST', body: JSON.stringify(data) });
  },

  searchCustomers: (q: string) =>
    request(`/customers?q=${encodeURIComponent(q)}`),
  createCustomer: (data: { name: string; phone: string }) =>
    request('/customers', { method: 'POST', body: JSON.stringify(data) }),
};
