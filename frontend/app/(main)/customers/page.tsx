'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRole } from '@/lib/role';

interface Customer {
  id: string; name: string; phone: string | null; email: string | null; note: string | null; created_at: string;
  purchases: number; total_spent: string; last_purchase_at: string | null;
}
interface Detail extends Customer {
  register: string | null; address: string | null;
  sales: { id: string; sale_price: string; payment_type: string; sold_at: string; vehicle_id: string; brand: string; model: string; year: number }[];
  leads: { id: string; kind: string; preferred_time: string | null; message: string | null; status: string; created_at: string; brand: string | null; model: string | null; year: number | null }[];
}

const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг' };
const LEAD_STATUS: Record<string, string> = { NEW: 'Шинэ', CONTACTED: 'Холбогдсон', DONE: 'Дууссан' };
const money = (n: string | number) => `${Math.round(Number(n)).toLocaleString('en-US')}₮`;
const date = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10).replace(/-/g, '.') : '—');
const inp = 'w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-zinc-400 focus:outline-none focus:border-ink/40 transition-colors';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function CustomersPage() {
  const { isAdmin } = useRole();
  const [list, setList] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', register: '', address: '', note: '' });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getCustomers().then(setList).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Алдаа'));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    setDetail(null); setError('');
    api.getCustomer(openId).then((d: Detail) => {
      setDetail(d);
      setForm({ name: d.name || '', phone: d.phone || '', email: d.email || '', register: d.register || '', address: d.address || '', note: d.note || '' });
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Алдаа'));
  }, [openId]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, '');
    return (list || []).filter((c) => !t || c.name.toLowerCase().includes(t) || (digits && (c.phone || '').replace(/\D/g, '').includes(digits)));
  }, [list, q]);

  function openNew() {
    setCreating(true); setOpenId(null); setError('');
    setForm({ name: '', phone: '', email: '', register: '', address: '', note: '' });
  }
  function close() { setCreating(false); setOpenId(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (creating) {
        const c = await api.createCustomer(form);
        setCreating(false); await load(); setOpenId(c.id);
      } else if (openId) {
        await api.updateCustomer(openId, form);
        await load(); close();
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!openId || !detail || !confirm(`${detail.name}-г устгах уу?`)) return;
    try { await api.deleteCustomer(openId); close(); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Алдаа'); }
  }

  const panelOpen = creating || !!openId;
  const buyers = (list || []).filter((c) => c.purchases > 0).length;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-[-0.03em] text-ink leading-tight">Үйлчлүүлэгчид</h1>
          <p className="text-sm text-zinc-500 mt-1">{list ? `${list.length} үйлчлүүлэгч · ${buyers} нь машин авсан` : 'Ачааллаж байна...'}</p>
        </div>
        <button onClick={openNew} className="h-11 px-5 rounded-full bg-ink hover:bg-brand text-white text-sm font-medium transition-colors">+ Үйлчлүүлэгч нэмэх</button>
      </div>

      <div className="relative">
        <svg className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7.5" /><path d="M20.5 20.5L16.5 16.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр эсвэл утасны дугаараар хайх"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-zinc-200 text-[15px] text-ink placeholder-zinc-400 focus:outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition" />
      </div>

      {error && !panelOpen && <div className="bg-danger-soft border border-danger-line rounded-2xl px-4 py-3 text-sm text-danger">{error}</div>}

      {!list ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-white ring-1 ring-ink/[0.06] animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] shadow-card px-6 py-14 text-center">
          <div className="font-display text-lg font-semibold text-ink">{q ? 'Олдсонгүй' : 'Үйлчлүүлэгч алга'}</div>
          <p className="text-sm text-zinc-500 mt-1">{q ? 'Өөр нэр, дугаараар хайгаад үзээрэй.' : 'Машин зарах үед эсвэл "Хүсэлтүүд"-ээс үйлчлүүлэгч нэмэгдэнэ.'}</p>
        </div>
      ) : (
        <ul className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] shadow-card divide-y divide-zinc-100 overflow-hidden">
          {shown.map((c) => (
            <li key={c.id}>
              <button onClick={() => { setCreating(false); setOpenId(c.id); }} className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${c.purchases ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-600'}`}>{initials(c.name)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{c.name}</span>
                  <span className="block text-xs text-zinc-500 tabular-nums">{c.phone || 'Утасгүй'}{c.note ? ` · ${c.note.split('\n')[0].slice(0, 40)}` : ''}</span>
                </span>
                <span className="text-right shrink-0">
                  {c.purchases > 0 ? (
                    <>
                      <span className="block text-sm font-medium text-ink tabular-nums">{c.purchases} машин</span>
                      <span className="block text-xs text-zinc-500">{date(c.last_purchase_at)}</span>
                    </>
                  ) : <span className="text-xs text-zinc-400">Авалтгүй</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Дэлгэрэнгүй / шинэ — баруун талаас гарах самбар */}
      {panelOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-[pageIn_0.2s_ease-out]" onClick={close} />
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[460px] bg-canvas shadow-lift flex flex-col animate-[fadeUp_0.3s_var(--ease-out-expo)]">
            <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-200/70 bg-white shrink-0">
              <span className="font-display text-lg font-semibold text-ink">{creating ? 'Шинэ үйлчлүүлэгч' : detail?.name || '...'}</span>
              <button onClick={close} aria-label="Хаах" className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-ink">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!creating && !detail && !error && <div className="h-40 rounded-2xl bg-white animate-pulse" />}

              {(creating || detail) && (
                <form onSubmit={save} className="bg-white rounded-2xl ring-1 ring-ink/[0.06] p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Нэр *" required className={`${inp} col-span-2`} />
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Утас" inputMode="tel" className={inp} />
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="И-мэйл" type="email" className={inp} />
                    <input value={form.register} onChange={(e) => setForm({ ...form, register: e.target.value })} placeholder="Регистр" className={inp} />
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Хаяг" className={inp} />
                    <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Тэмдэглэл (сонирхож буй машин, төсөв г.м.)" rows={3} className={`${inp} col-span-2 resize-none`} />
                  </div>
                  {error && <div className="bg-danger-soft border border-danger-line rounded-xl px-3 py-2 text-xs text-danger">{error}</div>}
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={busy} className="flex-1 h-11 rounded-full bg-ink hover:bg-brand disabled:opacity-40 text-white text-sm font-medium transition-colors">
                      {busy ? 'Хадгалж байна...' : creating ? 'Нэмэх' : 'Хадгалах'}
                    </button>
                    {detail?.phone && (
                      <a href={`tel:${detail.phone}`} className="h-11 px-4 rounded-full bg-brand-soft text-brand text-sm font-medium flex items-center">Залгах</a>
                    )}
                  </div>
                </form>
              )}

              {detail && (
                <section className="bg-white rounded-2xl ring-1 ring-ink/[0.06] overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-ink">Худалдан авалт ({detail.sales.length})</div>
                  {detail.sales.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-zinc-500 text-center">Машин аваагүй байна</div>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {detail.sales.map((s) => (
                        <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0">
                            <Link href={`/vehicles/${s.vehicle_id}`} className="font-medium text-ink hover:text-brand">{s.year} {s.brand} {s.model}</Link>
                            <span className="block text-xs text-zinc-500">{date(s.sold_at)} · {PAYMENT[s.payment_type] || s.payment_type}</span>
                          </span>
                          <span className="font-medium tabular-nums text-ink shrink-0">{money(s.sale_price)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {detail && detail.leads.length > 0 && (
                <section className="bg-white rounded-2xl ring-1 ring-ink/[0.06] overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-ink">Сайтаас ирсэн хүсэлт ({detail.leads.length})</div>
                  <ul className="divide-y divide-zinc-100">
                    {detail.leads.map((l) => (
                      <li key={l.id} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-ink">{l.brand ? `${l.year} ${l.brand} ${l.model}` : l.kind === 'REQUEST' ? 'Машин хайлгах' : 'Үзэх цаг'}</span>
                          <span className="text-xs text-zinc-500">{date(l.created_at)} · {LEAD_STATUS[l.status]}</span>
                        </div>
                        {l.preferred_time && <div className="text-xs text-zinc-500 mt-0.5">{l.preferred_time}</div>}
                        {l.message && <div className="text-xs text-zinc-600 mt-1">{l.message}</div>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail && isAdmin && detail.sales.length === 0 && (
                <button onClick={remove} className="w-full h-10 rounded-full text-sm text-zinc-500 hover:text-danger hover:bg-danger-soft transition-colors">Үйлчлүүлэгчийг устгах</button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
