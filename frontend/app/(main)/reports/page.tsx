'use client';
import { useEffect, useState } from 'react';
import { exportToExcel } from '@/lib/excel';

const API = 'http://localhost:4000/api/reports';
function token() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''; }
async function get(path: string) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  return r.json();
}
function fmt(n: string | number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}
function fmtNum(n: string | number | null) {
  if (n == null) return '—';
  return Number(n).toLocaleString('mn-MN');
}

interface Summary {
  total_sold: string; total_revenue: string; total_profit: string;
  avg_sale_price: string; avg_profit: string; total_vehicles: number;
  status_counts: Record<string, number>;
}
interface AgingRow { id: string; brand: string; model: string; year: number; status: string; days_in_stock: number; total_cost: string; }
interface MonthRow { month: string; sold_count: string; revenue: string; profit: string; }
interface BrandRow { brand: string; sold_count: string; revenue: string; avg_profit: string; avg_days_to_sell: string; }

const AGING_COLORS: Record<string, string> = {
  '0-30': 'bg-emerald-400', '31-60': 'bg-amber-400', '61-90': 'bg-orange-400', '90+': 'bg-red-400',
};
const AGING_TEXT: Record<string, string> = {
  '0-30': 'text-emerald-400', '31-60': 'text-amber-400', '61-90': 'text-orange-400', '90+': 'text-red-400',
};

function IconDownload({ className = 'w-4 h-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>;
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#666] border border-[#222] rounded-md hover:border-[#333] hover:text-white transition-colors">
      <IconDownload className="w-3.5 h-3.5" />
      Excel татах
    </button>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aging, setAging] = useState<{ rows: AgingRow[]; buckets: Record<string, AgingRow[]> } | null>(null);
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [tab, setTab] = useState<'overview' | 'aging' | 'monthly' | 'brands'>('overview');

  useEffect(() => {
    get('/summary').then(setSummary).catch(console.error);
    get('/aging').then(setAging).catch(console.error);
    get('/monthly').then(setMonthly).catch(console.error);
    get('/brands').then(setBrands).catch(console.error);
  }, []);

  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue)), 1);

  function exportOverview() {
    if (!summary) return;
    exportToExcel([
      { 'Үзүүлэлт': 'Нийт борлуулалт (машин)',      'Утга': summary.total_sold },
      { 'Үзүүлэлт': 'Нийт орлого (₮)',               'Утга': summary.total_revenue },
      { 'Үзүүлэлт': 'Нийт цэвэр ашиг (₮)',           'Утга': summary.total_profit },
      { 'Үзүүлэлт': 'Дундаж зарагдсан үнэ (₮)',      'Утга': summary.avg_sale_price },
      { 'Үзүүлэлт': 'Дундаж ашиг нэг машинаас (₮)',  'Утга': summary.avg_profit },
      { 'Үзүүлэлт': 'Нийт машин (агуулах)',           'Утга': summary.total_vehicles },
      ...Object.entries(summary.status_counts || {}).map(([k, v]) => ({
        'Үзүүлэлт': `Статус: ${k}`, 'Утга': v,
      })),
    ], `Ерөнхий_тайлан_${today()}`, 'Ерөнхий');
  }

  function exportAging() {
    if (!aging) return;
    exportToExcel(aging.rows.map(r => ({
      'Марк':        r.brand,
      'Загвар':      r.model,
      'Он':          r.year,
      'Статус':      r.status,
      'Хоног':       r.days_in_stock,
      'Бүлэг':       Number(r.days_in_stock) <= 30 ? '0-30' : Number(r.days_in_stock) <= 60 ? '31-60' : Number(r.days_in_stock) <= 90 ? '61-90' : '90+',
      'Нийт өртөг':  r.total_cost,
    })), `Агуулахын_нас_${today()}`, 'Aging');
  }

  function exportMonthly() {
    exportToExcel(monthly.map(m => ({
      'Сар':          m.month,
      'Зарагдсан':    m.sold_count,
      'Орлого (₮)':  m.revenue,
      'Ашиг (₮)':    m.profit,
    })), `Сарын_дүн_${today()}`, 'Сарын тайлан');
  }

  function exportBrands() {
    exportToExcel(brands.map(b => ({
      'Марк':                    b.brand,
      'Зарагдсан':               b.sold_count,
      'Нийт орлого (₮)':        b.revenue,
      'Дундаж ашиг (₮)':        b.avg_profit,
      'Дундаж зарагдах хоног':   b.avg_days_to_sell ? Math.round(Number(b.avg_days_to_sell)) : '—',
    })), `Марк_${today()}`, 'Брэнд');
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Тайлан</h1>
        <p className="text-sm text-[#555] mt-0.5">Борлуулалт, агуулах, ашгийн шинжилгээ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#1e1e1e]">
        {(['overview', 'aging', 'monthly', 'brands'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors border-b-[1.5px] -mb-px ${
              tab === t ? 'text-white border-white' : 'text-[#555] border-transparent hover:text-[#999]'
            }`}>
            {{ overview: 'Ерөнхий', aging: 'Агуулахын нас', monthly: 'Сарын дүн', brands: 'Марк' }[t]}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-end"><ExportBtn onClick={exportOverview} /></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Нийт борлуулалт',     value: `${fmtNum(summary?.total_sold)} машин` },
              { label: 'Нийт орлого',          value: fmt(summary?.total_revenue) },
              { label: 'Нийт цэвэр ашиг',      value: fmt(summary?.total_profit) },
              { label: 'Дундаж ашиг / машин',  value: fmt(summary?.avg_profit) },
            ].map(c => (
              <div key={c.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
                <div className="text-xs text-[#555] mb-2">{c.label}</div>
                <div className="text-xl font-semibold text-white tabular-nums">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Status counts */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1e1e1e]">
              <span className="text-xs font-medium text-[#555] uppercase tracking-wider">Машины статусын тойм</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#1e1e1e]">
              {[
                { key: 'ARRIVED',   label: 'Ирсэн',        dot: 'bg-amber-400' },
                { key: 'PUBLISHED', label: 'Нийтлэгдсэн',  dot: 'bg-blue-400' },
                { key: 'RESERVED',  label: 'Захиалгатай',  dot: 'bg-violet-400' },
                { key: 'SOLD',      label: 'Зарагдсан',    dot: 'bg-emerald-400' },
              ].map(s => (
                <div key={s.key} className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="text-xs text-[#555]">{s.label}</span>
                  </div>
                  <div className="text-2xl font-semibold text-white tabular-nums">
                    {summary?.status_counts?.[s.key] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel visual */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5">
            <div className="text-xs font-medium text-[#555] uppercase tracking-wider mb-4">Борлуулалтын funnel</div>
            {[
              { key: 'ARRIVED',   label: 'Ирсэн',        dot: 'bg-amber-400',   w: 100 },
              { key: 'PUBLISHED', label: 'Нийтлэгдсэн',  dot: 'bg-blue-400',    w: 75 },
              { key: 'RESERVED',  label: 'Захиалгатай',  dot: 'bg-violet-400',  w: 50 },
              { key: 'SOLD',      label: 'Зарагдсан',    dot: 'bg-emerald-400', w: 25 },
            ].map(s => {
              const total = summary?.total_vehicles || 1;
              const count = summary?.status_counts?.[s.key] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s.key} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="text-sm text-[#888]">{s.label}</span>
                    </div>
                    <span className="text-sm text-white tabular-nums">{count} <span className="text-[#555]">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className={`h-full ${s.dot} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGING */}
      {tab === 'aging' && aging && (
        <div className="space-y-4">
          <div className="flex justify-end"><ExportBtn onClick={exportAging} /></div>
          {/* Bucket summary */}
          <div className="grid grid-cols-4 gap-3">
            {['0-30', '31-60', '61-90', '90+'].map(b => (
              <div key={b} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${AGING_COLORS[b]}`} />
                  <span className="text-xs text-[#555]">{b} хоног</span>
                </div>
                <div className={`text-2xl font-semibold tabular-nums ${AGING_TEXT[b]}`}>
                  {aging.buckets[b]?.length ?? 0}
                </div>
                <div className="text-xs text-[#555] mt-0.5">машин</div>
              </div>
            ))}
          </div>

          {/* Aging table */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1e1e1e]">
              <span className="text-xs font-medium text-[#555] uppercase tracking-wider">Агуулахад байгаа машинууд</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {['Машин', 'Статус', 'Хоног', 'Нийт өртөг'].map((h, i) => (
                    <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${h === 'Нийт өртөг' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aging.rows.map((r, i) => {
                  const d = Number(r.days_in_stock);
                  const bucket = d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+';
                  return (
                    <tr key={r.id} className={`hover:bg-[#161616] transition-colors ${i < aging.rows.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                      <td className="px-5 py-3 text-white">{r.brand} {r.model} <span className="text-[#555]">{r.year}</span></td>
                      <td className="px-5 py-3 text-[#888] text-xs">{r.status}</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-medium tabular-nums ${AGING_TEXT[bucket]}`}>{d}</span>
                        <span className="text-[#555] text-xs ml-1">хоног</span>
                      </td>
                      <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmt(r.total_cost)}</td>
                    </tr>
                  );
                })}
                {aging.rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-[#444] text-sm py-12">Агуулахад машин байхгүй байна</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MONTHLY */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex justify-end"><ExportBtn onClick={exportMonthly} /></div>
          {/* Bar chart */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5">
            <div className="text-xs font-medium text-[#555] uppercase tracking-wider mb-5">Сарын орлого</div>
            {monthly.length === 0 ? (
              <div className="text-center text-[#444] text-sm py-8">Өгөгдөл байхгүй байна</div>
            ) : (
              <div className="flex items-end gap-2 h-36">
                {monthly.map(m => {
                  const pct = (Number(m.revenue) / maxRevenue) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="text-[10px] text-[#555] tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                        {fmt(m.revenue)}
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-sm overflow-hidden" style={{ height: '100px' }}>
                        <div className="w-full bg-blue-500 rounded-sm transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                      </div>
                      <div className="text-[10px] text-[#555] tabular-nums">{m.month.slice(5)}-р сар</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly table */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {['Сар', 'Зарагдсан', 'Орлого', 'Ашиг'].map((h, i) => (
                    <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map((m, i) => (
                  <tr key={m.month} className={`hover:bg-[#161616] transition-colors ${i < monthly.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                    <td className="px-5 py-3 text-white tabular-nums">{m.month}</td>
                    <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmtNum(m.sold_count)} машин</td>
                    <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmt(m.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={Number(m.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {Number(m.profit) >= 0 ? '+' : ''}{fmt(m.profit)}
                      </span>
                    </td>
                  </tr>
                ))}
                {monthly.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-[#444] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRANDS */}
      {tab === 'brands' && (
        <div className="space-y-4">
        <div className="flex justify-end"><ExportBtn onClick={exportBrands} /></div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1e1e1e]">
            <span className="text-xs font-medium text-[#555] uppercase tracking-wider">Марк тус бүрийн гүйцэтгэл</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Марк', 'Зарагдсан', 'Нийт орлого', 'Дундаж ашиг', 'Зарагдах хугацаа'].map((h, i) => (
                  <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map((b, i) => (
                <tr key={b.brand} className={`hover:bg-[#161616] transition-colors ${i < brands.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                  <td className="px-5 py-3 text-white font-medium">{b.brand}</td>
                  <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmtNum(b.sold_count)}</td>
                  <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmt(b.revenue)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={Number(b.avg_profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmt(b.avg_profit)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-[#888] tabular-nums">
                    {b.avg_days_to_sell ? `${Math.round(Number(b.avg_days_to_sell))} хоног` : '—'}
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[#444] text-sm py-12">Өгөгдөл байхгүй байна</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
