'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Basis = 'sold' | 'arrived' | 'stock';
type Mode = 'month' | 'quarter' | 'year' | 'custom' | 'all';

interface Row {
  id: string; vin: string; brand: string; model: string; year: number; color: string | null;
  mileage: number | null; fuel_type: string; transmission: string; engine_cc: number | null; status: string;
  arrived_at: string | null; sold_at: string | null; days_in_stock: number | null;
  total_cost: string; sale_price: string | null; payment_type: string | null; profit: string | null;
  customer_name: string | null; customer_phone: string | null; sold_by_name: string | null;
}
interface Report {
  summary: {
    total: number; by_status: Record<string, number>; sold: number; revenue: number; cost: number;
    profit: number; margin: number; avg_days_to_sell: number; stock_value: number;
  };
  months: { month: string; count: number; revenue: number; profit: number }[];
  rows: Row[];
}

const STATUS: Record<string, string> = { ARRIVED: 'Ирсэн', PUBLISHED: 'Нийтлэгдсэн', RESERVED: 'Захиалгатай', SOLD: 'Зарагдсан' };
const FUEL: Record<string, string> = { PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан' };
const TRANS: Record<string, string> = { AUTO: 'Автомат', MANUAL: 'Механик' };
const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг' };
const MONTH_NAMES = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

const pad = (n: number) => String(n).padStart(2, '0');
const money = (n: number | string | null) => (n == null || n === '' ? '-' : Math.round(Number(n)).toLocaleString('en-US') + '₮');
const sel = 'bg-white border border-[#e4e4e7] rounded-md px-3 py-2 text-sm text-[#09090b] focus:outline-none focus:border-brand';

function periodRange(mode: Mode, year: number, month: number, quarter: number, cf: string, ct: string) {
  if (mode === 'month') return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}` };
  if (mode === 'quarter') {
    const m1 = (quarter - 1) * 3 + 1, m3 = quarter * 3;
    return { from: `${year}-${pad(m1)}-01`, to: `${year}-${pad(m3)}-${pad(new Date(year, m3, 0).getDate())}` };
  }
  if (mode === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  if (mode === 'custom') return { from: cf, to: ct };
  return { from: '', to: '' };
}

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsPage() {
  const now = new Date();
  const [basis, setBasis] = useState<Basis>('sold');
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [cf, setCf] = useState('');
  const [ct, setCt] = useState('');
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => periodRange(mode, year, month, quarter, cf, ct), [mode, year, month, quarter, cf, ct]);
  const years = Array.from({ length: 8 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    if (basis !== 'stock' && mode === 'custom' && (!range.from || !range.to)) return;
    let cancelled = false;
    setLoading(true); setError('');
    const qs = new URLSearchParams({ basis });
    if (basis !== 'stock') { if (range.from) qs.set('from', range.from); if (range.to) qs.set('to', range.to); }
    api.getVehicleReport(qs.toString())
      .then((d: Report) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Алдаа гарлаа'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [basis, range.from, range.to, mode]);

  const periodLabel = basis === 'stock' ? 'Одоогийн агуулах'
    : mode === 'month' ? `${year} оны ${MONTH_NAMES[month - 1]}`
    : mode === 'quarter' ? `${year} оны ${quarter}-р улирал`
    : mode === 'year' ? `${year} он`
    : mode === 'custom' ? `${range.from || '...'} - ${range.to || '...'}` : 'Бүх хугацаа';
  const basisLabel = { sold: 'Борлуулсан машин', arrived: 'Ирсэн машин', stock: 'Агуулахын машин' }[basis];

  function downloadCsv() {
    if (!data || !data.rows.length) return;
    const head = ['№', 'Статус', 'Ирсэн огноо', 'Зарсан огноо', 'Агуулахад (хоног)', 'VIN', 'Марк', 'Загвар', 'Он', 'Өнгө', 'Гүйлт (км)', 'Түлш', 'Хурдны хайрцаг', 'Хөдөлгүүр (L)', 'Нийт өртөг (₮)', 'Зарсан үнэ (₮)', 'Ашиг (₮)', 'Ашгийн хувь (%)', 'Төлбөрийн хэлбэр', 'Худалдан авагч', 'Утас', 'Борлуулсан ажилтан'];
    const lines = [head.map(csvCell).join(',')];
    data.rows.forEach((r, i) => {
      const price = r.sale_price != null ? Number(r.sale_price) : null;
      const profit = r.profit != null ? Number(r.profit) : null;
      lines.push([
        i + 1, STATUS[r.status] || r.status, r.arrived_at, r.sold_at, r.days_in_stock, r.vin, r.brand, r.model, r.year, r.color,
        r.mileage, FUEL[r.fuel_type] || r.fuel_type, TRANS[r.transmission] || r.transmission,
        r.engine_cc ? (r.engine_cc / 1000).toFixed(1) : '', Math.round(Number(r.total_cost)), price, profit,
        price && profit != null ? ((profit / price) * 100).toFixed(1) : '',
        r.payment_type ? PAYMENT[r.payment_type] || r.payment_type : '', r.customer_name, r.customer_phone, r.sold_by_name,
      ].map(csvCell).join(','));
    });
    const s = data.summary;
    lines.push('');
    lines.push(['', 'Нийт', '', '', '', '', '', '', '', '', '', '', '', '', Math.round(s.cost), Math.round(s.revenue), Math.round(s.profit), s.revenue ? s.margin.toFixed(1) : '', '', '', '', ''].map(csvCell).join(','));
    lines.push(['', `Тайлан: ${basisLabel}`, `Хугацаа: ${periodLabel}`, `Машин: ${data.rows.length}`, `Зарсан: ${s.sold}`].map(csvCell).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const span = basis === 'stock' ? new Date().toISOString().slice(0, 10) : `${range.from || 'all'}_${range.to || 'all'}`;
    a.download = `tailan_${basis}_${span}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const s = data?.summary;
  const avgStock = data && data.rows.length ? data.rows.reduce((a, r) => a + (r.days_in_stock || 0), 0) / data.rows.length : 0;
  const cards: { label: string; value: string; sub?: string }[] = !s ? [] : basis === 'sold' ? [
    { label: 'Зарсан машин', value: String(s.sold), sub: periodLabel },
    { label: 'Орлого', value: money(s.revenue) },
    { label: 'Ашиг', value: money(s.profit), sub: s.revenue ? `Ашгийн хувь ${s.margin.toFixed(1)}%` : undefined },
    { label: 'Дундаж зарагдах хугацаа', value: `${Math.round(s.avg_days_to_sell)} хоног` },
  ] : basis === 'arrived' ? [
    { label: 'Ирсэн машин', value: String(s.total), sub: periodLabel },
    { label: 'Үүнээс зарагдсан', value: String(s.sold) },
    { label: 'Орлого', value: money(s.revenue) },
    { label: 'Ашиг', value: money(s.profit), sub: s.revenue ? `Ашгийн хувь ${s.margin.toFixed(1)}%` : undefined },
  ] : [
    { label: 'Агуулахын машин', value: String(s.total) },
    { label: 'Агуулахын өртөг', value: money(s.stock_value) },
    { label: 'Дундаж хугацаа', value: `${Math.round(avgStock)} хоног`, sub: 'агуулахад байгаа' },
    { label: 'Нийтлэгдсэн', value: String(s.by_status.PUBLISHED), sub: 'вэбсайтад харагдаж байгаа' },
  ];

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1500px] mx-auto w-full space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#09090b]">Тайлан</h1>
          <p className="text-xs sm:text-sm text-[#71717a] mt-0.5">{basisLabel} · {periodLabel}</p>
        </div>
        <button onClick={downloadCsv} disabled={!data || !data.rows.length}
          className="shrink-0 flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
          CSV татах
        </button>
      </div>

      {/* Шүүлтүүр */}
      <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {([['sold', 'Борлуулсан'], ['arrived', 'Ирсэн'], ['stock', 'Одоогийн агуулах']] as [Basis, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setBasis(k)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${basis === k ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#52525b] border-[#e4e4e7] hover:border-[#a1a1aa]'}`}>{l}</button>
          ))}
        </div>

        {basis !== 'stock' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-[#71717a] mb-1.5">Хугацаа</div>
              <select value={mode} onChange={e => setMode(e.target.value as Mode)} className={sel}>
                <option value="month">Сараар</option>
                <option value="quarter">Улирлаар</option>
                <option value="year">Жилээр</option>
                <option value="custom">Өөрөө сонгох</option>
                <option value="all">Бүх хугацаа</option>
              </select>
            </div>
            {(mode === 'month' || mode === 'quarter' || mode === 'year') && (
              <div>
                <div className="text-xs text-[#71717a] mb-1.5">Жил</div>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className={sel}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {mode === 'month' && (
              <div>
                <div className="text-xs text-[#71717a] mb-1.5">Сар</div>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className={sel}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
            {mode === 'quarter' && (
              <div>
                <div className="text-xs text-[#71717a] mb-1.5">Улирал</div>
                <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className={sel}>
                  {[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}-р улирал</option>)}
                </select>
              </div>
            )}
            {mode === 'custom' && (
              <>
                <div><div className="text-xs text-[#71717a] mb-1.5">Эхлэх</div><input type="date" value={cf} onChange={e => setCf(e.target.value)} className={sel} /></div>
                <div><div className="text-xs text-[#71717a] mb-1.5">Дуусах</div><input type="date" value={ct} onChange={e => setCt(e.target.value)} className={sel} /></div>
              </>
            )}
            <div className="text-xs text-[#a1a1aa] pb-2.5">
              {basis === 'sold' ? 'Зарсан огноогоор' : 'Ирсэн огноогоор'}{range.from && range.to ? ` · ${range.from} - ${range.to}` : ''}
            </div>
          </div>
        )}
      </div>

      {error && <div className="bg-brand-soft border border-brand/20 rounded-lg px-3 py-2 text-sm text-brand">{error}</div>}

      {/* Хураангуй */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {(loading && !data ? [0, 1, 2, 3] : cards).map((c, i) => typeof c === 'number' ? (
          <div key={i} className="rounded-sm bg-white border border-zinc-200 border-t-[3px] border-t-brand px-4 py-4"><div className="h-6 w-28 rounded bg-[#f4f4f5] animate-pulse" /></div>
        ) : (
          <div key={c.label} className={`rounded-sm bg-white border border-zinc-200 border-t-[3px] border-t-brand px-4 py-3.5 shadow-sm ${loading ? 'opacity-60' : ''}`}>
            <div className="text-xs text-[#71717a] mb-2">{c.label}</div>
            <div className="text-xl font-semibold tabular-nums text-[#111] leading-none">{c.value}</div>
            {c.sub && <div className="text-xs text-[#a1a1aa] mt-1.5">{c.sub}</div>}
          </div>
        ))}
      </div>

      {s && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(STATUS).map(([k, l]) => (
            <span key={k} className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-[#52525b]">{l}: <b className="text-[#111] tabular-nums">{s.by_status[k] ?? 0}</b></span>
          ))}
        </div>
      )}

      {/* Сар сараар */}
      {basis !== 'stock' && data && data.months.length > 1 && (
        <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[#e4e4e7] text-sm font-semibold text-[#09090b]">Сар сараар</div>
          <table className="w-full text-sm">
            <thead><tr className="bg-[#fafafa] text-xs text-[#71717a]"><th className="text-left font-medium px-5 py-2.5">Сар</th><th className="text-right font-medium px-5 py-2.5">Зарсан</th><th className="text-right font-medium px-5 py-2.5">Орлого</th><th className="text-right font-medium px-5 py-2.5">Ашиг</th></tr></thead>
            <tbody>
              {data.months.map(m => (
                <tr key={m.month} className="border-t border-[#f4f4f5]">
                  <td className="px-5 py-2.5">{m.month}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.count}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(m.revenue)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(m.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Дэлгэрэнгүй */}
      <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#e4e4e7] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#09090b]">Машины жагсаалт</span>
          <span className="text-xs text-[#a1a1aa]">{data ? `${data.rows.length} машин` : ''}</span>
        </div>
        {loading && !data ? (
          <div className="p-5 space-y-3">{[0, 1, 2, 3].map(i => <div key={i} className="h-5 rounded bg-[#f4f4f5] animate-pulse" />)}</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="text-sm text-[#52525b]">Энэ хугацаанд машин олдсонгүй</div>
            <div className="text-xs text-[#a1a1aa] mt-1">Өөр хугацаа эсвэл төрөл сонгоно уу</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-[#fafafa] text-xs text-[#71717a]">
                  {['№', 'Статус', 'Ирсэн', 'Зарсан', 'Хоног', 'Машин', 'Гүйлт', 'Өртөг', 'Зарсан үнэ', 'Ашиг', 'Худалдан авагч', 'Төлбөр'].map((h, i) => (
                    <th key={h} className={`font-medium px-4 py-2.5 whitespace-nowrap ${[7, 8, 9].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-[#f4f4f5] hover:bg-[#fafafa]">
                    <td className="px-4 py-2.5 text-[#a1a1aa] tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'SOLD' ? 'bg-zinc-100 text-zinc-600' : r.status === 'PUBLISHED' ? 'bg-brand-soft text-brand' : 'bg-zinc-50 text-zinc-600 border border-zinc-200'}`}>{STATUS[r.status]}</span></td>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-[#52525b]">{r.arrived_at || '-'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-[#52525b]">{r.sold_at || '-'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[#52525b]">{r.days_in_stock ?? '-'}</td>
                    <td className="px-4 py-2.5"><div className="font-medium text-[#09090b] whitespace-nowrap">{r.brand} {r.model} <span className="font-normal text-[#a1a1aa]">{r.year}</span></div><div className="text-[11px] text-[#a1a1aa] font-mono">{r.vin}</div></td>
                    <td className="px-4 py-2.5 tabular-nums text-[#52525b] whitespace-nowrap">{r.mileage != null ? `${Number(r.mileage).toLocaleString('en-US')} км` : '-'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(r.total_cost)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(r.sale_price)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.profit != null ? <span className={Number(r.profit) < 0 ? 'text-brand font-medium' : 'text-[#111] font-medium'}>{money(r.profit)}</span> : '-'}</td>
                    <td className="px-4 py-2.5"><div className="text-[#09090b] whitespace-nowrap">{r.customer_name || '-'}</div>{r.customer_phone && <div className="text-[11px] text-[#a1a1aa]">{r.customer_phone}</div>}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#52525b]">{r.payment_type ? PAYMENT[r.payment_type] : '-'}</td>
                  </tr>
                ))}
              </tbody>
              {s && (
                <tfoot>
                  <tr className="border-t-2 border-[#e4e4e7] bg-[#fafafa] font-semibold">
                    <td colSpan={7} className="px-4 py-3 text-[#09090b]">Нийт</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(data.rows.reduce((a, r) => a + Number(r.total_cost), 0))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(s.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(s.profit)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
