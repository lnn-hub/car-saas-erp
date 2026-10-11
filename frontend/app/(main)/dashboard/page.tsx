'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; created_at: string; }

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400',   text: 'text-amber-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400',    text: 'text-blue-400' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400',  text: 'text-violet-400' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400', text: 'text-emerald-400' },
};

function fmt(n: string | number | null) {
  if (n == null) return '—';
  const num = Number(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'Т₮';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'С₮';
  return num.toLocaleString('mn-MN') + '₮';
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
      <div className="text-xs text-[#555] mb-3 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-xs text-[#555] mt-1.5">{sub}</div>}
    </div>
  );
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

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">Нүүр хуудас</h1>
          <p className="text-xs text-[#555] mt-0.5">Борлуулалт, агуулахын ерөнхий байдал</p>
        </div>
        <Link href="/vehicles/new"
          className="flex items-center gap-1.5 bg-white hover:bg-[#e8e8e8] text-black text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
          Машин нэмэх
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Нийт борлуулалт"   value={`${summary?.total_sold ?? 0}`}  sub="машин зарагдсан" />
        <StatCard label="Нийт орлого"        value={fmt(summary?.total_revenue ?? 0)} />
        <StatCard label="Цэвэр ашиг"         value={fmt(summary?.total_profit ?? 0)} />
        <StatCard label="Агуулахын үнэ цэнэ" value={fmt(totalCost)} sub={`${inStock} машин агуулахад`} />
      </div>

      {/* Status bar */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[#1e1e1e]">
          {Object.entries(STATUS).map(([key, val]) => (
            <div key={key} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
                <span className="text-xs text-[#555]">{val.label}</span>
              </div>
              <div className="text-xl font-semibold text-white tabular-nums">{counts[key as keyof typeof counts]}</div>
            </div>
          ))}
        </div>
        {/* Mini bar chart of statuses */}
        <div className="flex h-0.5">
          {Object.entries(STATUS).map(([key, val]) => {
            const pct = vehicles.length ? (counts[key as keyof typeof counts] / vehicles.length) * 100 : 0;
            const colors: Record<string, string> = {
              ARRIVED: 'bg-amber-400', PUBLISHED: 'bg-blue-400', RESERVED: 'bg-violet-400', SOLD: 'bg-emerald-400'
            };
            return <div key={key} className={colors[key]} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {/* Bottom two columns */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Recent vehicles */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1e1e1e] flex items-center justify-between">
            <span className="text-xs font-medium text-[#888] uppercase tracking-wider">Сүүлд нэмэгдсэн</span>
            <Link href="/vehicles" className="text-xs text-[#444] hover:text-[#888] transition-colors">Бүгд харах</Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {vehicles.slice(0, 8).map((v, i) => (
                <Link key={v.id} href={`/vehicles/${v.id}`} className={`grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 items-center hover:bg-[#161616] transition-colors ${i > 0 ? 'border-t border-[#141414]' : ''}`} style={{ display: 'grid' }}>
                  <div>
                    <span className="text-white text-sm font-medium">{v.brand} {v.model}</span>
                    <span className="text-[#555] ml-2 text-sm">{v.year}</span>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS[v.status]?.dot}`} />
                    <span className={`text-xs ${STATUS[v.status]?.text}`}>{STATUS[v.status]?.label}</span>
                  </span>
                  <span className="text-xs text-[#555] tabular-nums w-16 text-right">{fmtDate(v.created_at)}</span>
                </Link>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick stats sidebar */}
        <div className="space-y-3">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-3">Дундаж үзүүлэлт</div>
            <div className="space-y-3">
              {[
                { label: 'Нэг машины дундаж ашиг', value: fmt(summary?.avg_profit ?? 0) },
                { label: 'Агуулахын нийт машин', value: `${inStock} ш` },
                { label: 'Нийт марк', value: `${[...new Set(vehicles.map(v => v.brand))].length} марк` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#555]">{item.label}</span>
                  <span className="text-sm font-medium text-white tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-3">Хурдан холбоос</div>
            <div className="space-y-1">
              {[
                { href: '/vehicles/new', label: 'Машин нэмэх' },
                { href: '/vehicles',     label: 'Бүх машин харах' },
                { href: '/sales',        label: 'Борлуулалт' },
                { href: '/reports',      label: 'Тайлан харах' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-[#666] hover:text-white hover:bg-[#161616] transition-colors">
                  {l.label}
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
