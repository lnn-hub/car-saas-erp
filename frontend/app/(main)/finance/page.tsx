'use client';
import { useEffect, useState, useCallback } from 'react';
import { exportToExcel } from '@/lib/excel';

const API = 'http://localhost:4000/api';
function tok() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''; }
async function get(url: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok()}` } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function del(url: string) {
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function post(url: string, body: object) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Алдаа');
  return d;
}

function fmt(n: number | string | null) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' тэр₮';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + ' сая₮';
  return v.toLocaleString('mn-MN') + '₮';
}
function pct(n: number | string) { return `${Number(n).toFixed(1)}%`; }
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

const CAT_LABELS: Record<string, string> = {
  RENT: 'Түрээс', SALARY: 'Цалин', UTILITY: 'Нийтийн үйлчилгээ',
  MARKETING: 'Маркетинг', TAX: 'Татвар', REPAIR: 'Засвар үйлчилгээ', OTHER: 'Бусад',
};
const CAT_COLORS: Record<string, string> = {
  RENT: 'bg-blue-400', SALARY: 'bg-violet-400', UTILITY: 'bg-amber-400',
  MARKETING: 'bg-pink-400', TAX: 'bg-red-400', REPAIR: 'bg-orange-400', OTHER: 'bg-[#d4d4d8]',
};

interface PL {
  sold_count: number; revenue: number; cogs: number; gross_profit: number; gross_margin: string;
  expenses: { category: string; total: number }[];
  total_expenses: number; net_profit: number; net_margin: string; vat: number;
}
interface CF { month: string; inflow: number; outflow: number; net: number; }
interface Expense {
  id: string; category: string; amount: string; currency: string; note: string;
  expense_date: string; created_by_name: string;
}

type Tab = 'pl' | 'cashflow' | 'expenses';

// Preset date ranges
const PRESETS = [
  { label: 'Энэ сар',      key: 'month' },
  { label: 'Өнгөрсөн сар', key: 'prev' },
  { label: 'Энэ жил',      key: 'year' },
  { label: 'Бүгд',         key: 'all' },
];
function presetDates(key: string) {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2,'0');
  const f = (d: Date) => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  const today = f(now);
  if (key === 'month') return { from: `${now.getFullYear()}-${p(now.getMonth()+1)}-01`, to: today };
  if (key === 'prev') {
    const pm = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lpm = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: f(pm), to: f(lpm) };
  }
  if (key === 'year') return { from: `${now.getFullYear()}-01-01`, to: today };
  return { from: '', to: '' };
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`py-2.5 px-5 text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('pl');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const [pl,       setPl]       = useState<PL | null>(null);
  const [cashflow, setCashflow] = useState<CF[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(false);

  // Add expense form
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ category: 'OTHER', amount: '', note: '', expense_date: '', currency: 'MNT' });
  const [addErr,  setAddErr]    = useState('');

  useEffect(() => {
    const { from: f, to: t } = presetDates('month');
    setFrom(f); setTo(t);
    setAddForm(prev => ({ ...prev, expense_date: new Date().toISOString().slice(0,10) }));
  }, []);

  function qs() {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to)   p.set('to', to);
    return p.toString() ? '?' + p.toString() : '';
  }

  const fetchAll = useCallback(async (q: string) => {
    setLoading(true);
    try {
      await Promise.all([
        get(`${API}/finance/pl${q}`).then(setPl).catch(console.error),
        get(`${API}/finance/cashflow${q}`).then(setCashflow).catch(console.error),
        get(`${API}/expenses${q}`).then(setExpenses).catch(console.error),
      ]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (from !== '') fetchAll(qs()); }, [from, to]);

  function selectPreset(key: string) {
    setPreset(key);
    const { from: f, to: t } = presetDates(key);
    setFrom(f); setTo(t);
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault(); setAddErr('');
    try {
      await post(`${API}/expenses`, addForm);
      setShowAdd(false);
      setAddForm(prev => ({ ...prev, amount: '', note: '' }));
      fetchAll(qs());
    } catch (err: unknown) { setAddErr(err instanceof Error ? err.message : 'Алдаа'); }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Устгах уу?')) return;
    await del(`${API}/expenses/${id}`);
    fetchAll(qs());
  }

  function exportExpenses() {
    exportToExcel(expenses.map(e => ({
      'Огноо': fmtDate(e.expense_date), 'Категори': CAT_LABELS[e.category] || e.category,
      'Дүн': e.amount, 'Валют': e.currency, 'Тайлбар': e.note || '—',
      'Бүртгэсэн': e.created_by_name || '—',
    })), `Зардал_${from}_${to}`, 'Зардал');
  }

  function exportPL() {
    if (!pl) return;
    exportToExcel([
      { 'Үзүүлэлт': 'Борлуулалт (тоо)',     'Утга': pl.sold_count },
      { 'Үзүүлэлт': 'Нийт орлого',           'Утга': pl.revenue },
      { 'Үзүүлэлт': 'Бараа материалын өртөг (COGS)', 'Утга': pl.cogs },
      { 'Үзүүлэлт': 'Бүдүүн ашиг',           'Утга': pl.gross_profit },
      { 'Үзүүлэлт': 'Бүдүүн ашгийн маржин',  'Утга': pl.gross_margin + '%' },
      ...pl.expenses.map(x => ({ 'Үзүүлэлт': CAT_LABELS[x.category], 'Утга': x.total })),
      { 'Үзүүлэлт': 'Нийт үйл ажиллагааны зардал', 'Утга': pl.total_expenses },
      { 'Үзүүлэлт': 'Цэвэр ашиг',            'Утга': pl.net_profit },
      { 'Үзүүлэлт': 'Цэвэр маржин',          'Утга': pl.net_margin + '%' },
      { 'Үзүүлэлт': 'НӨАТ (10%)',             'Утга': pl.vat },
    ], `PL_Тайлан_${from}_${to}`, 'P&L');
  }

  const maxFlow = Math.max(...cashflow.map(r => Math.max(r.inflow, r.outflow)), 1);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#09090b]">Санхүү</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">P&L, мөнгөн урсгал, зардлын бүртгэл</p>
        </div>
        {tab === 'expenses' && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-[#09090b] hover:bg-[#27272a] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
            Зардал нэмэх
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg px-4 py-3 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => selectPreset(p.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${preset === p.key ? 'bg-[#09090b] text-white' : 'text-[#71717a] hover:bg-[#f4f4f5]'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-[#e4e4e7]" />
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
            className="border border-[#e4e4e7] rounded-md px-2 py-1 text-xs text-[#09090b] focus:outline-none focus:border-[#09090b]" />
          <span className="text-xs text-[#a1a1aa]">—</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('custom'); }}
            className="border border-[#e4e4e7] rounded-md px-2 py-1 text-xs text-[#09090b] focus:outline-none focus:border-[#09090b]" />
        </div>
        {loading && <span className="text-[10px] text-[#a1a1aa] ml-1">Ачааллаж...</span>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e4e4e7]">
        {([['pl','P&L Тайлан'],['cashflow','Мөнгөн урсгал'],['expenses','Зардлын бүртгэл']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm border-b-[1.5px] -mb-px transition-colors ${tab === k ? 'text-[#09090b] border-[#09090b]' : 'text-[#a1a1aa] border-transparent hover:text-[#71717a]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── P&L ── */}
      {tab === 'pl' && pl && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportPL}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Excel татах
            </button>
          </div>

          {/* P&L table */}
          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            {/* ОРЛОГО */}
            <div className="px-5 py-3 bg-[#fafafa] border-b border-[#e4e4e7]">
              <span className="text-[11px] font-semibold text-[#09090b] uppercase tracking-wider">Орлого</span>
            </div>
            <div className="divide-y divide-[#f4f4f5]">
              <PLRow label={`Машин борлуулалт (${pl.sold_count} ш)`} value={fmt(pl.revenue)} bold />
              <PLRow label="Бараа материалын өртөг (COGS)" value={`- ${fmt(pl.cogs)}`} sub />
            </div>
            <div className="px-5 py-3 border-t border-[#e4e4e7] flex items-center justify-between bg-emerald-50">
              <span className="text-sm font-semibold text-emerald-700">Бүдүүн ашиг</span>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(pl.gross_profit)}</span>
                <span className="text-xs text-emerald-600 ml-2">({pct(pl.gross_margin)})</span>
              </div>
            </div>

            {/* ЗАРДАЛ */}
            <div className="px-5 py-3 bg-[#fafafa] border-y border-[#e4e4e7] mt-2">
              <span className="text-[11px] font-semibold text-[#09090b] uppercase tracking-wider">Үйл ажиллагааны зардал</span>
            </div>
            <div className="divide-y divide-[#f4f4f5]">
              {pl.expenses.length === 0 ? (
                <div className="px-5 py-4 text-sm text-[#a1a1aa]">Зардал бүртгэгдээгүй байна</div>
              ) : pl.expenses.map(x => (
                <PLRow key={x.category} label={CAT_LABELS[x.category] || x.category} value={`- ${fmt(x.total)}`} sub dot={CAT_COLORS[x.category]} />
              ))}
              <PLRow label="Нийт зардал" value={`- ${fmt(pl.total_expenses)}`} bold />
            </div>

            {/* ЦЭВЭР АШИГ */}
            <div className={`px-5 py-4 border-t border-[#e4e4e7] flex items-center justify-between ${pl.net_profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <span className={`text-base font-bold ${pl.net_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>Цэвэр ашиг</span>
              <div className="text-right">
                <span className={`text-lg font-bold tabular-nums ${pl.net_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(pl.net_profit)}</span>
                <span className={`text-xs ml-2 ${pl.net_profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>({pct(pl.net_margin)})</span>
              </div>
            </div>

            {/* НӨАТ */}
            <div className="px-5 py-3 border-t border-[#e4e4e7] flex items-center justify-between bg-[#fafafa]">
              <span className="text-xs text-[#71717a]">НӨАТ (орлогын 10%)</span>
              <span className="text-sm text-[#71717a] tabular-nums font-medium">{fmt(pl.vat)}</span>
            </div>
          </div>

          {/* Summary mini-cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Нийт орлого',    value: fmt(pl.revenue),        color: 'text-[#09090b]' },
              { label: 'Бүдүүн ашиг',   value: `${fmt(pl.gross_profit)} (${pct(pl.gross_margin)})`, color: 'text-emerald-600' },
              { label: 'Нийт зардал',   value: fmt(pl.total_expenses), color: 'text-red-500' },
              { label: 'Цэвэр ашиг',    value: `${fmt(pl.net_profit)} (${pct(pl.net_margin)})`, color: pl.net_profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-[#e4e4e7] rounded-lg px-4 py-3">
                <div className="text-[11px] text-[#a1a1aa] uppercase tracking-wider mb-1.5">{c.label}</div>
                <div className={`text-sm font-semibold tabular-nums ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CASH FLOW ── */}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          {/* Bar chart */}
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-5">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-5">Орлого vs Зарлага</div>
            {cashflow.length === 0 ? (
              <div className="text-center text-[#a1a1aa] text-sm py-8">Өгөгдөл байхгүй байна</div>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {cashflow.map(r => (
                  <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5" style={{ height: '100px' }}>
                      <div className="flex-1 bg-emerald-400 rounded-t-sm transition-all"
                        style={{ height: `${(r.inflow / maxFlow) * 100}%` }} title={fmt(r.inflow)} />
                      <div className="flex-1 bg-red-300 rounded-t-sm transition-all"
                        style={{ height: `${(r.outflow / maxFlow) * 100}%` }} title={fmt(r.outflow)} />
                    </div>
                    <div className="text-[9px] text-[#a1a1aa] tabular-nums">{r.month.slice(5)}-р сар</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-[#71717a]"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />Орлого</div>
              <div className="flex items-center gap-1.5 text-xs text-[#71717a]"><span className="w-2.5 h-2.5 rounded-sm bg-red-300" />Зарлага</div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Сар</TH><TH right>Орлого</TH><TH right>Зарлага</TH><TH right>Цэвэр</TH>
              </tr></thead>
              <tbody>
                {[...cashflow].reverse().map((r, i) => (
                  <tr key={r.month} className={`hover:bg-[#fafafa] ${i < cashflow.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] tabular-nums font-medium">{r.month}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 tabular-nums">{fmt(r.inflow)}</td>
                    <td className="px-5 py-3 text-right text-red-500 tabular-nums">{r.outflow > 0 ? `- ${fmt(r.outflow)}` : '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">
                      <span className={r.net >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(r.net)}</span>
                    </td>
                  </tr>
                ))}
                {cashflow.length === 0 && <tr><td colSpan={4} className="text-center text-[#a1a1aa] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXPENSES ── */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{expenses.length} бүртгэл · нийт {fmt(expenses.reduce((s,e)=>s+Number(e.amount),0))}</span>
            <button onClick={exportExpenses}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Excel татах
            </button>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Огноо</TH><TH>Категори</TH><TH>Тайлбар</TH><TH>Бүртгэсэн</TH><TH right>Дүн</TH><TH>{''}</TH>
              </tr></thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={e.id} className={`hover:bg-[#fafafa] ${i < expenses.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] tabular-nums whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${CAT_COLORS[e.category] || 'bg-[#d4d4d8]'}`} />
                        <span className="text-xs text-[#71717a]">{CAT_LABELS[e.category] || e.category}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#71717a] text-xs">{e.note || '—'}</td>
                    <td className="px-5 py-3 text-[#a1a1aa] text-xs">{e.created_by_name || '—'}</td>
                    <td className="px-5 py-3 text-right text-red-500 font-medium tabular-nums whitespace-nowrap">- {Number(e.amount).toLocaleString('mn-MN')}{e.currency === 'MNT' ? '₮' : ` ${e.currency}`}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteExpense(e.id)}
                        className="text-[#d4d4d8] hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={6} className="text-center text-[#a1a1aa] text-sm py-12">Зардал бүртгэгдээгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add expense modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-[#09090b] mb-4">Зардал нэмэх</h2>
            <form onSubmit={submitExpense} className="space-y-3">
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Категори</label>
                <select value={addForm.category} onChange={e => setAddForm(p=>({...p,category:e.target.value}))}
                  className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] bg-white focus:outline-none focus:border-[#09090b]">
                  {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#71717a] block mb-1.5">Дүн</label>
                  <input type="number" placeholder="500000" value={addForm.amount} onChange={e => setAddForm(p=>({...p,amount:e.target.value}))}
                    className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] focus:outline-none focus:border-[#09090b]" required />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] block mb-1.5">Валют</label>
                  <select value={addForm.currency} onChange={e => setAddForm(p=>({...p,currency:e.target.value}))}
                    className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] bg-white focus:outline-none focus:border-[#09090b]">
                    <option value="MNT">MNT ₮</option>
                    <option value="USD">USD $</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Огноо</label>
                <input type="date" value={addForm.expense_date} onChange={e => setAddForm(p=>({...p,expense_date:e.target.value}))}
                  className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] focus:outline-none focus:border-[#09090b]" required />
              </div>
              <div>
                <label className="text-xs text-[#71717a] block mb-1.5">Тайлбар</label>
                <input placeholder="Жишээ: 1-р сарын түрээс" value={addForm.note} onChange={e => setAddForm(p=>({...p,note:e.target.value}))}
                  className="w-full border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b]" />
              </div>
              {addErr && <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">{addErr}</div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 text-sm text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors">
                  Болих
                </button>
                <button type="submit"
                  className="flex-1 py-2 text-sm font-medium bg-[#09090b] hover:bg-[#27272a] text-white rounded-md transition-colors">
                  Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PLRow({ label, value, bold, sub, dot }: { label: string; value: string; bold?: boolean; sub?: boolean; dot?: string }) {
  return (
    <div className={`px-5 py-3 flex items-center justify-between ${sub ? 'bg-[#fafafa]' : ''}`}>
      <div className="flex items-center gap-2">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <span className={`text-sm ${bold ? 'font-semibold text-[#09090b]' : 'text-[#71717a]'} ${sub ? 'text-xs' : ''}`}>{label}</span>
      </div>
      <span className={`tabular-nums ${bold ? 'font-semibold text-[#09090b]' : 'text-[#71717a]'} ${sub ? 'text-xs' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
