'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Lead {
  id: string; kind: 'VIEWING' | 'REQUEST'; name: string; phone: string; preferred_time: string | null;
  message: string | null; status: 'NEW' | 'CONTACTED' | 'DONE'; created_at: string;
  vehicle_id: string | null; brand: string | null; model: string | null; year: number | null;
}

const TABS: { key: string; label: string }[] = [
  { key: 'NEW', label: 'Шинэ' },
  { key: 'CONTACTED', label: 'Холбогдсон' },
  { key: 'DONE', label: 'Дууссан' },
  { key: 'ALL', label: 'Бүгд' },
];
const STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Шинэ', cls: 'bg-brand-soft text-brand' },
  CONTACTED: { label: 'Холбогдсон', cls: 'bg-amber-50 text-amber-700' },
  DONE: { label: 'Дууссан', cls: 'bg-zinc-100 text-zinc-600' },
};

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'Дөнгөж сая';
  if (m < 60) return `${m} минутын өмнө`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} өдрийн өмнө`;
  const dt = new Date(iso);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [tab, setTab] = useState('NEW');
  const [error, setError] = useState('');
  const [converted, setConverted] = useState<Record<string, { id: string; created: boolean }>>({});

  const load = () => api.getLeads().then(setLeads).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Алдаа гарлаа'));
  useEffect(() => { load(); }, []);

  async function setStatus(l: Lead, status: Lead['status']) {
    setLeads((xs) => xs?.map((x) => (x.id === l.id ? { ...x, status } : x)) ?? null);
    try { await api.updateLead(l.id, status); } catch { load(); }
  }
  async function toCustomer(l: Lead) {
    try {
      const r = await api.leadToCustomer(l.id);
      setConverted((m) => ({ ...m, [l.id]: { id: r.customer.id, created: r.created } }));
      if (l.status === 'NEW') setLeads((xs) => xs?.map((x) => (x.id === l.id ? { ...x, status: 'CONTACTED' } : x)) ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Алдаа'); }
  }
  async function remove(l: Lead) {
    if (!confirm(`${l.name}-ийн хүсэлтийг устгах уу?`)) return;
    setLeads((xs) => xs?.filter((x) => x.id !== l.id) ?? null);
    try { await api.deleteLead(l.id); } catch { load(); }
  }

  const counts = (leads || []).reduce<Record<string, number>>((m, l) => ((m[l.status] = (m[l.status] || 0) + 1), m), {});
  const shown = (leads || []).filter((l) => tab === 'ALL' || l.status === tab);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-[-0.03em] text-ink leading-tight">Хүсэлтүүд</h1>
        <p className="text-sm text-zinc-500 mt-1">Вэбсайтаас ирсэн «Үзэх цаг товлох», «Хүсэлт үлдээх» маягтууд</p>
      </div>

      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-medium border transition-colors ${tab === t.key ? 'bg-ink border-ink text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'}`}>
            {t.label}
            {t.key !== 'ALL' && counts[t.key] ? <span className="ml-1.5 opacity-60 tabular-nums">{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>

      {error && <div className="bg-danger-soft border border-danger-line rounded-2xl px-4 py-3 text-sm text-danger">{error}</div>}

      {!leads ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-[22px] bg-white ring-1 ring-ink/[0.06] animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] shadow-card px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
          </div>
          <div className="font-display text-lg font-semibold text-ink mt-4">{tab === 'NEW' ? 'Шинэ хүсэлт алга' : 'Хүсэлт алга'}</div>
          <p className="text-sm text-zinc-500 mt-1">Үйлчлүүлэгч сайтаас цаг товлоход энд гарч ирнэ.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((l) => (
            <li key={l.id} className={`bg-white rounded-[22px] ring-1 shadow-card p-4 sm:p-5 ${l.status === 'NEW' ? 'ring-brand/30' : 'ring-ink/[0.06]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{l.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span>
                    <span className="text-xs text-zinc-500">{l.kind === 'VIEWING' ? 'Үзэх цаг' : 'Машин хайлгах'}</span>
                  </div>
                  <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 mt-1.5 text-[15px] font-medium text-brand tabular-nums">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                    {l.phone}
                  </a>
                </div>
                <span className="text-xs text-zinc-500 shrink-0" suppressHydrationWarning>{ago(l.created_at)}</span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                {l.vehicle_id && (
                  <div className="text-zinc-600">Машин: <Link href={`/vehicles/${l.vehicle_id}`} className="font-medium text-ink hover:text-brand">{l.year} {l.brand} {l.model}</Link></div>
                )}
                {l.preferred_time && <div className="text-zinc-600">Хүссэн цаг: <span className="font-medium text-ink">{l.preferred_time}</span></div>}
                {l.message && <p className="text-zinc-700 bg-zinc-50 rounded-xl px-3 py-2 whitespace-pre-line">{l.message}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {l.status !== 'CONTACTED' && l.status !== 'DONE' && (
                  <button onClick={() => setStatus(l, 'CONTACTED')} className="h-9 px-4 rounded-full bg-ink hover:bg-brand text-white text-sm font-medium transition-colors">Холбогдсон</button>
                )}
                {l.status !== 'DONE' && (
                  <button onClick={() => setStatus(l, 'DONE')} className="h-9 px-4 rounded-full bg-zinc-100 hover:bg-zinc-200 text-ink text-sm font-medium transition-colors">Дууссан</button>
                )}
                {l.status !== 'NEW' && (
                  <button onClick={() => setStatus(l, 'NEW')} className="h-9 px-3 rounded-full text-sm text-zinc-500 hover:text-ink">Шинэ болгох</button>
                )}
                {converted[l.id] ? (
                  <Link href="/customers" className="h-9 px-3 rounded-full text-sm font-medium text-emerald-700 bg-emerald-50 flex items-center">
                    {converted[l.id].created ? 'Үйлчлүүлэгч болсон' : 'Үйлчлүүлэгч аль хэдийн байсан'} →
                  </Link>
                ) : (
                  <button onClick={() => toCustomer(l)} className="h-9 px-3 rounded-full text-sm font-medium text-brand hover:bg-brand-soft transition-colors">+ Үйлчлүүлэгч болгох</button>
                )}
                <button onClick={() => remove(l)} className="ml-auto h-9 px-3 rounded-full text-sm text-zinc-400 hover:text-danger">Устгах</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
