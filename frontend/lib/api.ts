const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
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
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (data: { company_name: string; name: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getBillingStatus: () => request('/billing/status'),
  createQPayInvoice: (plan: string) =>
    request('/billing/qpay/invoice', { method: 'POST', body: JSON.stringify({ plan }) }),
  checkQPayInvoice: (invoice_id: string) =>
    request(`/billing/qpay/check/${invoice_id}`),

  getVehicles: () => request('/vehicles'),
  getVehicle: (id: string) => request(`/vehicles/${id}`),
  createVehicle: (data: object) =>
    request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request(`/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addCost: (id: string, data: object) =>
    request(`/vehicles/${id}/costs`, { method: 'POST', body: JSON.stringify(data) }),

  getSettings: () => request('/settings'),
  saveSettings: (data: object) =>
    request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  getSales: () => request('/sales'),
  getSummary: () => request('/sales/summary'),
  createSale: (data: object) =>
    request('/sales', { method: 'POST', body: JSON.stringify(data) }),
};
