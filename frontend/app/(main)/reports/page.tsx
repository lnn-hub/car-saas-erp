'use client';
import { useEffect, useState, useCallback } from 'react';
import { exportToExcel } from '@/lib/excel';

const API = 'http://localhost:4000/api/reports';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''; }
async function get(path: string) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// --- Formatters ---
function fmt(n: string | number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}
function fmtNum(n: string | number | null) {
  if (n == null) return '—';
  return Number(n).toLocaleString('mn-MN');
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

// --- Preset date ranges ---
const PRESETS: { label: string; key: string }[] = [
  { label: 'Өнөөдөр',      key: 'today' },
  { label: '7 хоног',       key: '7d' },
  { label: 'Энэ сар',       key: 'month' },
  { label: 'Өнгөрсөн сар',  key: 'prev' },
  { label: 'Энэ жил',       key: 'year' },
  { label: 'Бүгд',          key: 'all' },
];
function presetDates(key: string): { from: string; to: string } {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const f = (d: Date) => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  const today = f(now);
  if (key === 'today')   return { from: today, to: today };
  if (key === '7d')      { const d = new Date(now); d.setDate(d.getDate()-6); return { from: f(d), to: today }; }
  if (key === 'month')   return { from: `${now.getFullYear()}-${p(now.getMonth()+1)}-01`, to: today };
  if (key === 'prev')    {
    const pm = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lpm = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: f(pm), to: f(lpm) };
  }
  if (key === 'year')    return { from: `${now.getFullYear()}-01-01`, to: today };
  return { from: '', to: '' }; // 'all'
}

// --- Types ---
interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_sale_price: string; avg_profit: string; total_vehicles: number; status_counts: Record<string,number>; }
interface DayRow   { day: string; sold_count: string; revenue: string; profit: string; vehicles_sold: string; }
interface MonthRow { month: string; sold_count: string; revenue: string; profit: string; }
interface BrandRow { brand: string; sold_count: string; revenue: string; avg_profit: string; total_profit: string; avg_days_to_sell: string; }
interface PersonRow { user_id: string; name: string; role: string; sold_count: string; revenue: string; avg_sale_price: string; total_profit: string; avg_profit: string; }
interface AgingRow  { id: string; brand: string; model: string; year: number; status: string; days_in_stock: number; total_cost: string; }
interface DetailRow {
  id: string; sold_at: string;
  brand: string; model: string; year: number; vin: string;
  color: string; fuel_type: string; transmission: string; mileage: number;
  customer_name: string; customer_phone: string;
  sold_by_name: string;
  total_cost: string; sale_price: string; net_profit: string;
  payment_type: string;
}
interface ActivityData {
  registrations: { id: string; name: string; role: string; registered_count: string }[];
  sales:         { id: string; name: string; role: string; sold_count: string; revenue: string; profit: string }[];
  monthly_reg:   { month: string; name: string; count: string }[];
  monthly_sales: { month: string; name: string; count: string; revenue: string }[];
}

const PAYMENT: Record<string,string> = { CASH:'Бэлэн', LOAN:'Зээл', LEASING:'Лизинг' };
const AGING_COLORS: Record<string,string> = { '0-30':'bg-emerald-400','31-60':'bg-amber-400','61-90':'bg-orange-400','90+':'bg-red-400' };
const AGING_TEXT:   Record<string,string> = { '0-30':'text-emerald-600','31-60':'text-amber-600','61-90':'text-orange-600','90+':'text-red-500' };

type TabKey = 'overview' | 'detail' | 'daily' | 'monthly' | 'salesperson' | 'brands' | 'aging' | 'activity';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',    label: 'Ерөнхий' },
  { key: 'activity',   label: 'Үйл ажиллагаа' },
  { key: 'detail',      label: 'Дэлгэрэнгүй' },
  { key: 'daily',       label: 'Өдөр' },
  { key: 'monthly',     label: 'Сар' },
  { key: 'salesperson', label: 'Борлуулагч' },
  { key: 'brands',      label: 'Марк' },
  { key: 'aging',       label: 'Aging' },
];

// --- Shared UI ---
function ExportBtn({ onClick, label = 'Excel татах' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#71717a] border border-[#e4e4e7] rounded-md hover:border-[#d4d4d8] hover:text-[#09090b] transition-colors">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      {label}
    </button>
  );
}
function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`py-2.5 px-5 text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-lg px-5 py-4">
      <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-xl font-semibold text-[#09090b] tabular-nums">{value}</div>
      {sub && <div className="text-xs text-[#a1a1aa] mt-1">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('overview');

  // Filters
  const [preset, setPreset]   = useState('month');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [brand, setBrand]     = useState('');
  const [payType, setPayType] = useState('');
  const [soldBy, setSoldBy]   = useState('');
  const [filterOpts, setFilterOpts] = useState<{ brands: string[]; salespersons: { id: string; name: string }[] }>({ brands: [], salespersons: [] });

  // Data
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [daily,       setDaily]       = useState<DayRow[]>([]);
  const [monthly,     setMonthly]     = useState<MonthRow[]>([]);
  const [brands,      setBrands]      = useState<BrandRow[]>([]);
  const [salesperson, setSalesperson] = useState<PersonRow[]>([]);
  const [aging,       setAging]       = useState<{ rows: AgingRow[]; buckets: Record<string,AgingRow[]> } | null>(null);
  const [detail,      setDetail]      = useState<DetailRow[]>([]);
  const [activity,    setActivity]    = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);

  // Init dates from preset
  useEffect(() => {
    const { from: f, to: t } = presetDates('month');
    setFrom(f); setTo(t);
  }, []);

  function buildQS() {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to)   p.set('to', to);
    if (brand)   p.set('brand', brand);
    if (payType) p.set('payment_type', payType);
    if (soldBy)  p.set('sold_by', soldBy);
    return p.toString() ? '?' + p.toString() : '';
  }

  const fetchData = useCallback(async (qs: string) => {
    setLoading(true);
    try {
      await Promise.all([
        get('/summary' + qs).then(setSummary).catch(console.error),
        get('/daily' + qs).then(setDaily).catch(console.error),
        get('/monthly' + qs).then(setMonthly).catch(console.error),
        get('/brands' + qs).then(setBrands).catch(console.error),
        get('/salesperson' + qs).then(setSalesperson).catch(console.error),
        get('/sales-detail' + qs).then(setDetail).catch(console.error),
        get('/activity' + qs).then(setActivity).catch(console.error),
      ]);
    } finally { setLoading(false); }
  }, []);

  // Initial fetch: filters, aging
  useEffect(() => {
    get('/filters').then(setFilterOpts).catch(console.error);
    get('/aging').then(setAging).catch(console.error);
  }, []);

  // Fetch when filters ready (from/to initialized)
  useEffect(() => {
    if (from !== undefined) fetchData(buildQS());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, brand, payType, soldBy]);

  function selectPreset(key: string) {
    setPreset(key);
    const { from: f, to: t } = presetDates(key);
    setFrom(f); setTo(t);
  }
  function onFromChange(v: string) { setFrom(v); setPreset('custom'); }
  function onToChange(v: string)   { setTo(v);   setPreset('custom'); }
  function clearFilters() { selectPreset('month'); setBrand(''); setPayType(''); setSoldBy(''); }

  // Export helpers
  function todayStr() { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; }

  function exportSummary() {
    if (!summary) return;
    exportToExcel([
      { 'Үзүүлэлт': 'Нийт борлуулалт (машин)',      'Утга': summary.total_sold },
      { 'Үзүүлэлт': 'Нийт орлого (₮)',               'Утга': summary.total_revenue },
      { 'Үзүүлэлт': 'Нийт цэвэр ашиг (₮)',           'Утга': summary.total_profit },
      { 'Үзүүлэлт': 'Дундаж зарагдсан үнэ (₮)',      'Утга': summary.avg_sale_price },
      { 'Үзүүлэлт': 'Дундаж ашиг / машин (₮)',       'Утга': summary.avg_profit },
      { 'Үзүүлэлт': 'Нийт машин (агуулах)',           'Утга': summary.total_vehicles },
      ...Object.entries(summary.status_counts||{}).map(([k,v])=>({ 'Үзүүлэлт': `Статус: ${k}`, 'Утга': v })),
    ], `Ерөнхий_${todayStr()}`, 'Ерөнхий');
  }
  function exportDaily() {
    exportToExcel(daily.map(r => ({
      'Огноо':       r.day, 'Зарагдсан': r.sold_count,
      'Орлого (₮)':  r.revenue, 'Ашиг (₮)': r.profit,
      'Машинууд':    r.vehicles_sold,
    })), `Өдрийн_тайлан_${todayStr()}`, 'Өдөр');
  }
  function exportMonthly() {
    exportToExcel(monthly.map(r => ({
      'Сар': r.month, 'Зарагдсан': r.sold_count,
      'Орлого (₮)': r.revenue, 'Ашиг (₮)': r.profit,
    })), `Сарын_тайлан_${todayStr()}`, 'Сар');
  }
  function exportSalesperson() {
    exportToExcel(salesperson.map(r => ({
      'Нэр': r.name, 'Үүрэг': r.role, 'Зарагдсан': r.sold_count,
      'Орлого (₮)': r.revenue, 'Нийт ашиг (₮)': r.total_profit, 'Дундаж ашиг (₮)': r.avg_profit,
    })), `Борлуулагч_${todayStr()}`, 'Борлуулагч');
  }
  function exportDetail() {
    exportToExcel(detail.map(r => ({
      'Огноо':            fmtDate(r.sold_at),
      'Марк':             r.brand,
      'Загвар':           r.model,
      'Он':               r.year,
      'VIN':              r.vin,
      'Өнгө':             r.color || '—',
      'Түлш':             r.fuel_type,
      'Хурдны хайрцаг':  r.transmission,
      'Гүйлт (км)':      r.mileage,
      'Үйлчлүүлэгч':     r.customer_name || '—',
      'Утас':             r.customer_phone || '—',
      'Борлуулагч':       r.sold_by_name || '—',
      'Нийт өртөг (₮)':  r.total_cost,
      'Зарагдсан үнэ (₮)': r.sale_price,
      'Цэвэр ашиг (₮)':  r.net_profit,
      'Төлбөр':           PAYMENT[r.payment_type] || r.payment_type,
    })), `Дэлгэрэнгүй_борлуулалт_${todayStr()}`, 'Дэлгэрэнгүй');
  }
  function exportBrands() {
    exportToExcel(brands.map(r => ({
      'Марк': r.brand, 'Зарагдсан': r.sold_count,
      'Орлого (₮)': r.revenue, 'Нийт ашиг (₮)': r.total_profit, 'Дундаж ашиг (₮)': r.avg_profit,
      'Дундаж зарагдах хоног': r.avg_days_to_sell ? Math.round(Number(r.avg_days_to_sell)) : '—',
    })), `Марк_${todayStr()}`, 'Марк');
  }
  function exportAging() {
    if (!aging) return;
    exportToExcel(aging.rows.map(r => ({
      'Марк': r.brand, 'Загвар': r.model, 'Он': r.year, 'Статус': r.status,
      'Хоног': r.days_in_stock,
      'Бүлэг': Number(r.days_in_stock)<=30?'0-30':Number(r.days_in_stock)<=60?'31-60':Number(r.days_in_stock)<=90?'61-90':'90+',
      'Нийт өртөг (₮)': r.total_cost,
    })), `Aging_${todayStr()}`, 'Aging');
  }

  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue)), 1);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-[#09090b]">Тайлан</h1>
        <p className="text-xs text-[#a1a1aa] mt-0.5">Борлуулалт, агуулах, ашгийн шинжилгээ</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg p-3 space-y-2.5">
        {/* Row 1: Presets + date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => selectPreset(p.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  preset === p.key
                    ? 'bg-[#09090b] text-white'
                    : 'text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#09090b]'
                }`}>{p.label}</button>
            ))}
          </div>
          <div className="w-px h-4 bg-[#e4e4e7]" />
          <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
            <input type="date" value={from} onChange={e => onFromChange(e.target.value)}
              className="border border-[#e4e4e7] rounded-md px-2 py-1 text-xs text-[#09090b] focus:outline-none focus:border-[#09090b] transition-colors" />
            <span>—</span>
            <input type="date" value={to} onChange={e => onToChange(e.target.value)}
              className="border border-[#e4e4e7] rounded-md px-2 py-1 text-xs text-[#09090b] focus:outline-none focus:border-[#09090b] transition-colors" />
          </div>
          {loading && <span className="text-[10px] text-[#a1a1aa] ml-1">Ачааллаж...</span>}
        </div>
        {/* Row 2: Entity filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand */}
          <select value={brand} onChange={e => setBrand(e.target.value)}
            className="border border-[#e4e4e7] rounded-md px-2.5 py-1 text-xs text-[#71717a] focus:outline-none focus:border-[#09090b] bg-white transition-colors">
            <option value="">Бүх марк</option>
            {filterOpts.brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {/* Salesperson */}
          <select value={soldBy} onChange={e => setSoldBy(e.target.value)}
            className="border border-[#e4e4e7] rounded-md px-2.5 py-1 text-xs text-[#71717a] focus:outline-none focus:border-[#09090b] bg-white transition-colors">
            <option value="">Бүх борлуулагч</option>
            {filterOpts.salespersons.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {/* Payment type */}
          <div className="flex gap-1">
            {[['', 'Бүгд'], ['CASH','Бэлэн'], ['LOAN','Зээл'], ['LEASING','Лизинг']].map(([v, l]) => (
              <button key={v} onClick={() => setPayType(v)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors border ${
                  payType === v
                    ? 'bg-[#f4f4f5] border-[#d4d4d8] text-[#09090b]'
                    : 'border-transparent text-[#a1a1aa] hover:text-[#71717a]'
                }`}>{l}</button>
            ))}
          </div>
          {/* Clear */}
          {(brand || payType || soldBy) && (
            <button onClick={clearFilters}
              className="text-xs text-[#a1a1aa] hover:text-[#09090b] transition-colors ml-auto">
              Шүүлтүүр арилгах
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#e4e4e7]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-[1.5px] -mb-px ${
              tab === t.key ? 'text-[#09090b] border-[#09090b]' : 'text-[#a1a1aa] border-transparent hover:text-[#71717a]'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-end"><ExportBtn onClick={exportSummary} /></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card label="Нийт борлуулалт"    value={`${fmtNum(summary?.total_sold ?? null)} машин`} />
            <Card label="Нийт орлого"         value={fmt(summary?.total_revenue ?? null)} />
            <Card label="Нийт цэвэр ашиг"     value={fmt(summary?.total_profit ?? null)} />
            <Card label="Дундаж ашиг / машин" value={fmt(summary?.avg_profit ?? null)} />
          </div>

          {/* Status bar */}
          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-[#e4e4e7]">
              {[
                { key:'ARRIVED',   label:'Ирсэн',        dot:'bg-amber-400' },
                { key:'PUBLISHED', label:'Нийтлэгдсэн',  dot:'bg-blue-400' },
                { key:'RESERVED',  label:'Захиалгатай',  dot:'bg-violet-400' },
                { key:'SOLD',      label:'Зарагдсан',    dot:'bg-emerald-400' },
              ].map(s => (
                <div key={s.key} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="text-xs text-[#a1a1aa]">{s.label}</span>
                  </div>
                  <div className="text-2xl font-semibold text-[#09090b] tabular-nums">{summary?.status_counts?.[s.key] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel progress bars */}
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-5">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-4">Борлуулалтын дамжлага</div>
            {[
              { key:'ARRIVED',  label:'Ирсэн',       dot:'bg-amber-400' },
              { key:'PUBLISHED',label:'Нийтлэгдсэн', dot:'bg-blue-400' },
              { key:'RESERVED', label:'Захиалгатай', dot:'bg-violet-400' },
              { key:'SOLD',     label:'Зарагдсан',   dot:'bg-emerald-400' },
            ].map(s => {
              const total = summary?.total_vehicles || 1;
              const count = summary?.status_counts?.[s.key] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s.key} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="text-sm text-[#71717a]">{s.label}</span>
                    </div>
                    <span className="text-sm tabular-nums text-[#09090b]">{count} <span className="text-[#a1a1aa]">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#f4f4f5] rounded-full overflow-hidden">
                    <div className={`h-full ${s.dot} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DETAIL ── */}
      {tab === 'detail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{detail.length} борлуулалт — бүх баганатай дэлгэрэнгүй</span>
            <ExportBtn onClick={exportDetail} label="Excel (бүх багана)" />
          </div>
          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
              <thead>
                <tr className="border-b border-[#e4e4e7]">
                  <TH>Огноо</TH>
                  <TH>Машин</TH>
                  <TH>VIN</TH>
                  <TH>Үйлчлүүлэгч</TH>
                  <TH>Борлуулагч</TH>
                  <TH>Төлбөр</TH>
                  <TH right>Нийт өртөг</TH>
                  <TH right>Зарагдсан үнэ</TH>
                  <TH right>Цэвэр ашиг</TH>
                </tr>
              </thead>
              <tbody>
                {detail.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-[#fafafa] ${i < detail.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] tabular-nums whitespace-nowrap">{fmtDate(r.sold_at)}</td>
                    <td className="px-5 py-3">
                      <div className="text-[#09090b] font-medium whitespace-nowrap">{r.brand} {r.model}</div>
                      <div className="text-[10px] text-[#a1a1aa] mt-0.5">{r.year} · {r.color || '—'} · {r.fuel_type} · {r.mileage.toLocaleString()} км</div>
                    </td>
                    <td className="px-5 py-3 text-[#a1a1aa] text-xs font-mono">{r.vin ? r.vin.slice(-8) : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="text-[#09090b] whitespace-nowrap">{r.customer_name || '—'}</div>
                      {r.customer_phone && <div className="text-[10px] text-[#a1a1aa] mt-0.5">{r.customer_phone}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#f4f4f5] flex items-center justify-center text-[9px] font-bold text-[#71717a]">
                          {(r.sold_by_name || '?').slice(0,1).toUpperCase()}
                        </span>
                        <span className="text-[#09090b] whitespace-nowrap">{r.sold_by_name || '—'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.payment_type === 'CASH'    ? 'bg-emerald-50 text-emerald-700' :
                        r.payment_type === 'LOAN'    ? 'bg-blue-50 text-blue-700' :
                        'bg-violet-50 text-violet-700'
                      }`}>{PAYMENT[r.payment_type] || r.payment_type}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums whitespace-nowrap">{fmt(r.total_cost)}</td>
                    <td className="px-5 py-3 text-right text-[#09090b] tabular-nums font-medium whitespace-nowrap">{fmt(r.sale_price)}</td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">
                      <span className={Number(r.net_profit) >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500'}>
                        {Number(r.net_profit) >= 0 ? '+' : ''}{fmt(r.net_profit)}
                      </span>
                    </td>
                  </tr>
                ))}
                {detail.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-[#a1a1aa] text-sm py-16">Өгөгдөл байхгүй байна</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          {detail.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card label="Нийт борлуулалт"   value={`${detail.length} машин`} />
              <Card label="Нийт орлого"        value={fmt(detail.reduce((s,r) => s + Number(r.sale_price), 0))} />
              <Card label="Нийт цэвэр ашиг"    value={fmt(detail.reduce((s,r) => s + Number(r.net_profit), 0))} />
            </div>
          )}
        </div>
      )}

      {/* ── DAILY ── */}
      {tab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{daily.length} өдөр, нийт {fmtNum(daily.reduce((s,r)=>s+Number(r.sold_count),0))} машин</span>
            <ExportBtn onClick={exportDaily} />
          </div>

          {/* Bar chart */}
          {daily.length > 0 && (
            <div className="bg-white border border-[#e4e4e7] rounded-lg p-5">
              <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-4">Өдрийн орлого</div>
              <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ minHeight: '80px' }}>
                {[...daily].reverse().map(d => {
                  const maxR = Math.max(...daily.map(r => Number(r.revenue)), 1);
                  const pct = (Number(d.revenue) / maxR) * 100;
                  return (
                    <div key={String(d.day)} className="flex flex-col items-center gap-1 group shrink-0" style={{ minWidth: '28px' }}>
                      <div className="text-[9px] text-[#a1a1aa] tabular-nums opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {fmt(d.revenue)}
                      </div>
                      <div className="w-5 bg-[#f4f4f5] rounded-sm overflow-hidden" style={{ height: '56px' }}>
                        <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${pct}%`, marginTop: `${100-pct}%` }} />
                      </div>
                      <div className="text-[9px] text-[#a1a1aa] tabular-nums" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '30px' }}>
                        {String(d.day).slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Огноо</TH><TH right>Зарагдсан</TH><TH right>Орлого</TH><TH right>Ашиг</TH><TH>Машинууд</TH>
              </tr></thead>
              <tbody>
                {daily.map((r, i) => (
                  <tr key={String(r.day)} className={`hover:bg-[#fafafa] ${i < daily.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] tabular-nums font-medium">{fmtDate(String(r.day))}</td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">{r.sold_count} машин</td>
                    <td className="px-5 py-3 text-right text-[#09090b] tabular-nums">{fmt(r.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(r.profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {Number(r.profit) >= 0 ? '+' : ''}{fmt(r.profit)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#a1a1aa] text-xs truncate max-w-[200px]">{r.vehicles_sold}</td>
                  </tr>
                ))}
                {daily.length === 0 && <tr><td colSpan={5} className="text-center text-[#a1a1aa] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY ── */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{monthly.length} сар</span>
            <ExportBtn onClick={exportMonthly} />
          </div>

          {/* Bar chart */}
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-5">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-5">Сарын орлого</div>
            {monthly.length === 0 ? (
              <div className="text-center text-[#a1a1aa] text-sm py-8">Өгөгдөл байхгүй байна</div>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {monthly.map(m => {
                  const pct = (Number(m.revenue) / maxRevenue) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="text-[10px] text-[#a1a1aa] tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{fmt(m.revenue)}</div>
                      <div className="w-full bg-[#f4f4f5] rounded-sm" style={{ height: '80px' }}>
                        <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${pct}%`, marginTop: `${100-pct}%` }} />
                      </div>
                      <div className="text-[10px] text-[#a1a1aa] tabular-nums">{m.month.slice(5)}-р сар</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Сар</TH><TH right>Зарагдсан</TH><TH right>Орлого</TH><TH right>Ашиг</TH>
              </tr></thead>
              <tbody>
                {[...monthly].reverse().map((m, i) => (
                  <tr key={m.month} className={`hover:bg-[#fafafa] ${i < monthly.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] tabular-nums font-medium">{m.month}</td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">{fmtNum(m.sold_count)} машин</td>
                    <td className="px-5 py-3 text-right text-[#09090b] tabular-nums">{fmt(m.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(m.profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {Number(m.profit) >= 0 ? '+' : ''}{fmt(m.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
                {monthly.length === 0 && <tr><td colSpan={4} className="text-center text-[#a1a1aa] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SALESPERSON ── */}
      {tab === 'salesperson' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{salesperson.length} борлуулагч</span>
            <ExportBtn onClick={exportSalesperson} />
          </div>

          {/* Top performers */}
          {salesperson.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {salesperson.slice(0, 3).map((p, i) => (
                <div key={p.user_id} className="bg-white border border-[#e4e4e7] rounded-lg px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${['bg-amber-400','bg-[#d4d4d8]','bg-amber-700'][i] || 'bg-[#f4f4f5]'}`}>
                      {i+1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#09090b]">{p.name}</div>
                      <div className="text-[10px] text-[#a1a1aa]">{p.role}</div>
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-[#09090b] tabular-nums">{p.sold_count} машин</div>
                  <div className="text-xs text-[#a1a1aa] mt-0.5">{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Нэр</TH><TH>Үүрэг</TH><TH right>Зарагдсан</TH><TH right>Орлого</TH><TH right>Нийт ашиг</TH><TH right>Дундаж ашиг</TH>
              </tr></thead>
              <tbody>
                {salesperson.map((p, i) => (
                  <tr key={p.user_id} className={`hover:bg-[#fafafa] ${i < salesperson.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-[#a1a1aa] text-xs">{p.role}</td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">{p.sold_count}</td>
                    <td className="px-5 py-3 text-right text-[#09090b] tabular-nums">{fmt(p.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(p.total_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {Number(p.total_profit) >= 0 ? '+' : ''}{fmt(p.total_profit)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(p.avg_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {fmt(p.avg_profit)}
                      </span>
                    </td>
                  </tr>
                ))}
                {salesperson.length === 0 && <tr><td colSpan={6} className="text-center text-[#a1a1aa] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BRANDS ── */}
      {tab === 'brands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{brands.length} марк</span>
            <ExportBtn onClick={exportBrands} />
          </div>
          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Марк</TH><TH right>Зарагдсан</TH><TH right>Орлого</TH><TH right>Нийт ашиг</TH><TH right>Дундаж ашиг</TH><TH right>Зарагдах хоног</TH>
              </tr></thead>
              <tbody>
                {brands.map((b, i) => (
                  <tr key={b.brand} className={`hover:bg-[#fafafa] ${i < brands.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                    <td className="px-5 py-3 text-[#09090b] font-semibold">{b.brand}</td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">{fmtNum(b.sold_count)}</td>
                    <td className="px-5 py-3 text-right text-[#09090b] tabular-nums">{fmt(b.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(b.total_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(b.total_profit)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(b.avg_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(b.avg_profit)}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">
                      {b.avg_days_to_sell ? `${Math.round(Number(b.avg_days_to_sell))} хоног` : '—'}
                    </td>
                  </tr>
                ))}
                {brands.length === 0 && <tr><td colSpan={6} className="text-center text-[#a1a1aa] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AGING ── */}
      {tab === 'aging' && aging && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">Агуулахын нас — шүүлтүүр хамаарахгүй</span>
            <ExportBtn onClick={exportAging} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['0-30','31-60','61-90','90+'] as const).map(b => (
              <div key={b} className="bg-white border border-[#e4e4e7] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${AGING_COLORS[b]}`} />
                  <span className="text-xs text-[#a1a1aa]">{b} хоног</span>
                </div>
                <div className={`text-2xl font-semibold tabular-nums ${AGING_TEXT[b]}`}>{aging.buckets[b]?.length ?? 0}</div>
                <div className="text-xs text-[#a1a1aa] mt-0.5">машин</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#e4e4e7]">
                <TH>Машин</TH><TH>Статус</TH><TH right>Хоног</TH><TH right>Нийт өртөг</TH>
              </tr></thead>
              <tbody>
                {aging.rows.map((r, i) => {
                  const d = Number(r.days_in_stock);
                  const bkt = d<=30?'0-30':d<=60?'31-60':d<=90?'61-90':'90+';
                  return (
                    <tr key={r.id} className={`hover:bg-[#fafafa] ${i < aging.rows.length-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                      <td className="px-5 py-3 text-[#09090b]">{r.brand} {r.model} <span className="text-[#a1a1aa]">{r.year}</span></td>
                      <td className="px-5 py-3 text-[#71717a] text-xs">{r.status}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-medium tabular-nums ${AGING_TEXT[bkt]}`}>{d}</span>
                        <span className="text-[#a1a1aa] text-xs ml-1">хоног</span>
                      </td>
                      <td className="px-5 py-3 text-right text-[#71717a] tabular-nums">{fmt(r.total_cost)}</td>
                    </tr>
                  );
                })}
                {aging.rows.length === 0 && <tr><td colSpan={4} className="text-center text-[#a1a1aa] text-sm py-12">Агуулахад машин байхгүй байна</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ҮЙЛАЖИЛЛАГАА ── */}
      {tab === 'activity' && (
        <div className="space-y-5">
          {/* Хэн хэдэн машин бүртгэсэн vs зарсан */}
          <div className="grid grid-cols-2 gap-4">
            {/* Бүртгэлт */}
            <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-xs font-semibold text-[#09090b] uppercase tracking-wider">Машин бүртгэсэн</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#e4e4e7]">
                  <TH>Ажилтан</TH><TH right>Бүртгэсэн</TH>
                </tr></thead>
                <tbody>
                  {(activity?.registrations || []).map((r, i) => (
                    <tr key={r.id} className={`hover:bg-[#fafafa] ${i < (activity?.registrations.length||0)-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                            {r.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm text-[#09090b]">{r.name}</div>
                            <div className="text-[10px] text-[#a1a1aa]">{r.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-blue-600 tabular-nums">{r.registered_count}</span>
                        <span className="text-[10px] text-[#a1a1aa] ml-1">машин</span>
                      </td>
                    </tr>
                  ))}
                  {!(activity?.registrations?.length) && (
                    <tr><td colSpan={2} className="text-center text-[#a1a1aa] text-sm py-8">Бүртгэл байхгүй байна</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Борлуулалт */}
            <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-[#09090b] uppercase tracking-wider">Машин зарсан</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#e4e4e7]">
                  <TH>Ажилтан</TH><TH right>Зарсан</TH><TH right>Орлого</TH><TH right>Ашиг</TH>
                </tr></thead>
                <tbody>
                  {(activity?.sales || []).map((r, i) => (
                    <tr key={r.id} className={`hover:bg-[#fafafa] ${i < (activity?.sales.length||0)-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-600">
                            {r.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm text-[#09090b]">{r.name}</div>
                            <div className="text-[10px] text-[#a1a1aa]">{r.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-[#09090b] tabular-nums">{r.sold_count}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-600 tabular-nums text-xs">{fmt(r.revenue)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-xs">
                        <span className={Number(r.profit)>=0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(r.profit)}</span>
                      </td>
                    </tr>
                  ))}
                  {!(activity?.sales?.length) && (
                    <tr><td colSpan={4} className="text-center text-[#a1a1aa] text-sm py-8">Борлуулалт байхгүй байна</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Сар бүрийн дэлгэрэнгүй бүртгэл */}
          <div className="grid grid-cols-2 gap-4">
            {/* Сар бүр бүртгэсэн */}
            <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e4e4e7] bg-[#fafafa]">
                <span className="text-xs font-semibold text-[#09090b] uppercase tracking-wider">Сар бүрийн бүртгэл</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#e4e4e7]">
                  <TH>Сар</TH><TH>Ажилтан</TH><TH right>Тоо</TH>
                </tr></thead>
                <tbody>
                  {(activity?.monthly_reg || []).map((r, i) => (
                    <tr key={i} className={`hover:bg-[#fafafa] ${i < (activity?.monthly_reg.length||0)-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                      <td className="px-5 py-3 text-[#71717a] tabular-nums text-xs whitespace-nowrap">{r.month}</td>
                      <td className="px-5 py-3 text-[#09090b] text-sm">{r.name}</td>
                      <td className="px-5 py-3 text-right text-blue-600 font-semibold tabular-nums">{r.count}</td>
                    </tr>
                  ))}
                  {!(activity?.monthly_reg?.length) && (
                    <tr><td colSpan={3} className="text-center text-[#a1a1aa] text-sm py-8">Өгөгдөл байхгүй байна</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Сар бүр зарсан */}
            <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e4e4e7] bg-[#fafafa]">
                <span className="text-xs font-semibold text-[#09090b] uppercase tracking-wider">Сар бүрийн борлуулалт</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#e4e4e7]">
                  <TH>Сар</TH><TH>Ажилтан</TH><TH right>Тоо</TH><TH right>Орлого</TH>
                </tr></thead>
                <tbody>
                  {(activity?.monthly_sales || []).map((r, i) => (
                    <tr key={i} className={`hover:bg-[#fafafa] ${i < (activity?.monthly_sales.length||0)-1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                      <td className="px-5 py-3 text-[#71717a] tabular-nums text-xs whitespace-nowrap">{r.month}</td>
                      <td className="px-5 py-3 text-[#09090b] text-sm">{r.name}</td>
                      <td className="px-5 py-3 text-right text-[#09090b] font-semibold tabular-nums">{r.count}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 tabular-nums text-xs">{fmt(r.revenue)}</td>
                    </tr>
                  ))}
                  {!(activity?.monthly_sales?.length) && (
                    <tr><td colSpan={4} className="text-center text-[#a1a1aa] text-sm py-8">Өгөгдөл байхгүй байна</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Excel export */}
          <div className="flex justify-end">
            <ExportBtn onClick={() => {
              if (!activity) return;
              const rows = [
                ...activity.sales.map(r => ({
                  'Төрөл': 'Борлуулалт', 'Ажилтан': r.name, 'Үүрэг': r.role,
                  'Тоо': r.sold_count, 'Орлого': r.revenue, 'Ашиг': r.profit,
                })),
                ...activity.registrations.map(r => ({
                  'Төрөл': 'Бүртгэл', 'Ажилтан': r.name, 'Үүрэг': r.role,
                  'Тоо': r.registered_count, 'Орлого': '—', 'Ашиг': '—',
                })),
              ];
              exportToExcel(rows, `Үйл_ажиллагаа_${from}_${to}`, 'Үйл ажиллагаа');
            }} label="Excel татах" />
          </div>
        </div>
      )}
    </div>
  );
}
