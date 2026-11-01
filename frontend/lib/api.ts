const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Токен дууссан/буруу үед нэвтрэх хуудас руу буцаана
function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Бүрэн дахин ачаалж (кэш, төлөвийг цэвэрлэнэ) нэвтрэх хуудас руу шилжинэ
  if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'; // eslint-disable-line @next/next/no-location-assign-relative-destination
}

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
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

async function request(
  path: string,
  options: RequestInit = {},
  useCache = false,
  _retry = 0,
  // Хариуны төрлийг дуудаж буй газар нь заана (backend-ийн төрлүүд хуваалцагдах хүртэл)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
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
    if (res.status === 401 && token) {
      handleUnauthorized();
      throw new Error('Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү');
    }
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    if (useCache) setCached(cacheKey, data);
    return data;
  } catch (err) {
    // Render cold start (~30s) — сүлжээний алдаа бол 5 удаа retry
    const isNetworkErr = err instanceof TypeError;
    const DELAYS = [3000, 5000, 8000, 12000, 15000];
    if (isNetworkErr && _retry < DELAYS.length) {
      await new Promise((r) => setTimeout(r, DELAYS[_retry]));
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
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  demoLogin: () => {
    invalidateCache();
    return request('/auth/demo', { method: 'POST' });
  },

  getVehicles: () => request('/vehicles', {}, true),
  getVehicle: (id: string) => request(`/vehicles/${id}`, {}, true),
  createVehicle: (data: object) => {
    invalidateCache('/vehicles');
    return request('/vehicles', { method: 'POST', body: JSON.stringify(data) });
  },
  updateStatus: (id: string, status: string) => {
    invalidateCache('/vehicles');
    return request(`/vehicles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  addCost: (id: string, data: object) => {
    invalidateCache(`/vehicles/${id}`);
    return request(`/vehicles/${id}/costs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSettings: () => request('/settings', {}, true),
  saveSettings: (data: object) => {
    invalidateCache('/settings');
    return request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getSales: () => request('/sales', {}, true),
  getSummary: () => request('/sales/summary', {}, true),
  createSale: (data: object) => {
    invalidateCache('/sales');
    return request('/sales', { method: 'POST', body: JSON.stringify(data) });
  },

  updateVehicle: (id: string, data: object) => {
    invalidateCache('/vehicles');
    return request(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteVehicle: (id: string) => {
    invalidateCache('/vehicles');
    return request(`/vehicles/${id}`, { method: 'DELETE' });
  },
  uploadVehicleImage: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('images', file);
    const res = await fetch(`${BACKEND}/api/upload/vehicle/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: fd,
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү');
    }
    if (!res.ok) throw new Error(data.error || 'Upload алдаа');
    invalidateCache('/vehicles');
    return data;
  },
  reorderImages: (vehicleId: string, ids: string[]) => {
    invalidateCache('/vehicles');
    return request(`/upload/vehicle/${vehicleId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  },
  deleteVehicleImage: (imageId: string) => {
    invalidateCache('/vehicles');
    return request(`/upload/image/${imageId}`, { method: 'DELETE' });
  },

  getMonthReport: (month: string) => request(`/reports/month?month=${month}`),
  getYearReport: (year: number) => request(`/reports/year?year=${year}`),

  uploadLogo: async (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    const res = await fetch(`${BACKEND}/api/upload/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: fd,
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү');
    }
    if (!res.ok) throw new Error(data.error || 'Upload алдаа');
    invalidateCache('/settings');
    return data as { logo_url: string };
  },
  deleteLogo: () => {
    invalidateCache('/settings');
    return request('/upload/logo', { method: 'DELETE' });
  },

  getTeam: () => request('/team'),
  createTeamMember: (data: { name: string; position: string; bio: string }) =>
    request('/team', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: { name: string; position: string; bio: string }) =>
    request(`/team/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) => request(`/team/${id}`, { method: 'DELETE' }),
  uploadTeamPhoto: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch(`${BACKEND}/api/upload/team/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: fd,
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү');
    }
    if (!res.ok) throw new Error(data.error || 'Upload алдаа');
    return data;
  },

  fbConnect: (token: string, page_id?: string) => {
    invalidateCache('/settings');
    return request('/settings/facebook', {
      method: 'POST',
      body: JSON.stringify({ token, page_id }),
    });
  },
  fbDisconnect: () => {
    invalidateCache('/settings');
    return request('/settings/facebook', { method: 'DELETE' });
  },
  fbPreview: (vehicleId: string) => request(`/vehicles/${vehicleId}/facebook/preview`),
  fbPublish: (vehicleId: string) => {
    invalidateCache('/vehicles');
    return request(`/vehicles/${vehicleId}/facebook`, { method: 'POST' });
  },

  getLeads: () => request('/leads'),
  leadsCount: () => request('/leads/count'),
  updateLead: (id: string, status: string) =>
    request(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteLead: (id: string) => request(`/leads/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/users'),
  createUser: (data: { name: string; email: string; password: string; role: string }) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: object) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getCustomers: () => request('/customers/list'),
  getCustomer: (id: string) => request(`/customers/${id}`),
  updateCustomer: (id: string, data: object) =>
    request(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),
  leadToCustomer: (id: string) => request(`/leads/${id}/customer`, { method: 'POST' }),

  searchCustomers: (q: string) => request(`/customers?q=${encodeURIComponent(q)}`),
  createCustomer: (data: { name: string; phone: string; email?: string; note?: string }) =>
    request('/customers', { method: 'POST', body: JSON.stringify(data) }),
};
