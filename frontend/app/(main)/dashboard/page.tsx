'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; created_at: string; }

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400',   text: 'text-amber-600' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400',    text: 'text-blue-600' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400',  text: 'text-violet-600' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400', text: 'text-emerald-600' },
};

function fmt(n: string | number | null) {
  if (n == null) return '—';
  const num = Number(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' тэр₮';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(console.error);
    api.getVehicles().then(setVehicles).catch(console.error);
  }, []);

  const counts = { ARRIVED: 0, PUBLISHED: 0, RESERVED: 0, SOLD: 0 };
  vehicles.forEach(v => { if (v.status in counts) counts[v.status as keyof typeof counts]++; });
  const inStock = vehicles.filter(v => v.status !== 'SOLD').length;
  const totalCost = vehicles.reduce((s, v) => s + Number(v.total_cost), 0);
  const brands = [...new Set(vehicles.map(v => v.brand))].length;

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#09090b]">Нүүр хуудас</h1>
          <p className="text-xs text-[#71717a] mt-0.5">Борлуулалт, агуулахын ерөнхий байдал</p>
        </div>
        <Link href="/vehicles/new"
          className="flex items-center gap-1.5 bg-[#09090b] hover:bg-[#27272a] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
          Машин нэмэх
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Нийт борлуулалт',    value: `${summary?.total_sold ?? 0} машин`,  sub: 'нийт зарагдсан' },
          { label: 'Нийт орлого',         value: fmt(summary?.total_revenue ?? 0),     sub: null },
          { label: 'Цэвэр ашиг',          value: fmt(summary?.total_profit ?? 0),      sub: `нэгж дундаж ${fmt(summary?.avg_profit ?? 0)}` },
          { label: 'Агуулахын нийт үнэ',  value: fmt(totalCost),                       sub: `${inStock} машин` },
        ].map(c => (
          <div key={c.label} className="bg-white border border-[#e4e4e7] rounded-lg px-5 py-4">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-3">{c.label}</div>
            <div className="text-2xl font-semibold text-[#09090b] tabular-nums leading-none">{c.value}</div>
            {c.sub && <div className="text-xs text-[#a1a1aa] mt-1.5">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[#e4e4e7]">
          {Object.entries(STATUS).map(([key, val]) => (
            <div key={key} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
                <span className="text-xs text-[#a1a1aa]">{val.label}</span>
              </div>
              <div className="text-xl font-semibold text-[#09090b] tabular-nums">{counts[key as keyof typeof counts]}</div>
            </div>
          ))}
        </div>
        <div className="flex h-1">
          {[
            { key: 'ARRIVED',   color: 'bg-amber-400' },
            { key: 'PUBLISHED', color: 'bg-blue-400' },
            { key: 'RESERVED',  color: 'bg-violet-400' },
            { key: 'SOLD',      color: 'bg-emerald-400' },
          ].map(({ key, color }) => {
            const pct = vehicles.length ? (counts[key as keyof typeof counts] / vehicles.length) * 100 : 0;
            return <div key={key} className={color} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-[1fr_260px] gap-4">
        {/* Recent vehicles — div-based, no table */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e4e4e7] flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider">Сүүлд нэмэгдсэн</span>
            <Link href="/vehicles" className="text-xs text-[#a1a1aa] hover:text-[#09090b] transition-colors">Бүгд харах</Link>
          </div>
          <div>
            {vehicles.slice(0, 8).map((v, i) => (
              <Link key={v.id} href={`/vehicles/${v.id}`}
                className={`flex items-center gap-4 px-5 py-2.5 hover:bg-[#fafafa] transition-colors ${i > 0 ? 'border-t border-[#f4f4f5]' : ''}`}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[#09090b] font-medium">{v.brand} {v.model}</span>
                  <span className="text-sm text-[#a1a1aa] ml-2">{v.year}</span>
                </div>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS[v.status]?.dot}`} />
                  <span className={`text-xs ${STATUS[v.status]?.text}`}>{STATUS[v.status]?.label}</span>
                </span>
                <span className="text-xs text-[#a1a1aa] tabular-nums w-10 text-right shrink-0">{fmtDate(v.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-3">Дундаж үзүүлэлт</div>
            <div className="space-y-2.5">
              {[
                ['Нэг машины дундаж ашиг', fmt(summary?.avg_profit ?? 0)],
                ['Агуулахад байгаа', `${inStock} машин`],
                ['Нийт марк', `${brands}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-xs text-[#71717a]">{k}</span>
                  <span className="text-sm font-medium text-[#09090b] tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-3">Хурдан холбоос</div>
            <div className="space-y-0.5">
              {[
                ['/vehicles/new', 'Машин нэмэх'],
                ['/vehicles',     'Бүх машин'],
                ['/sales',        'Борлуулалт'],
                ['/reports',      'Тайлан'],
              ].map(([href, label]) => (
                <Link key={href} href={href}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors">
                  {label}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
