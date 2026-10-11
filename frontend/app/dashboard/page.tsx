'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; }

const STATUS: Record<string, { label: string; dot: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400' },
};

function fmt(n: string | number) {
  return Number(n).toLocaleString('mn-MN') + '₮';
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(console.error);
    api.getVehicles().then(setVehicles).catch(console.error);
  }, []);

  return (
    <div className="px-8 py-7">
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Нүүр хуудас</h1>
        <p className="text-sm text-[#555] mt-0.5">Борлуулалтын ерөнхий мэдээлэл</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: 'Нийт зарагдсан',  value: `${summary?.total_sold ?? '0'} машин` },
          { label: 'Нийт орлого',     value: summary ? fmt(summary.total_revenue) : '—' },
          { label: 'Цэвэр ашиг',      value: summary ? fmt(summary.total_profit) : '—' },
          { label: 'Агуулахад байгаа', value: `${vehicles.filter(v => v.status !== 'SOLD').length} машин` },
        ].map(c => (
          <div key={c.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-xs text-[#555] mb-2">{c.label}</div>
            <div className="text-xl font-semibold text-white tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Status row */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {Object.entries(STATUS).map(([key, val]) => (
          <div key={key} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
              <span className="text-sm text-[#888]">{val.label}</span>
            </div>
            <span className="text-sm font-semibold text-white tabular-nums">
              {vehicles.filter(v => v.status === key).length}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
          <span className="text-sm font-medium text-white">Сүүлийн машинууд</span>
          <Link href="/vehicles" className="text-xs text-[#555] hover:text-white transition-colors">Бүгдийг харах</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              {['Машин', 'Статус', 'Нийт өртөг'].map(h => (
                <th key={h} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${h === 'Нийт өртөг' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.slice(0, 8).map((v, i) => (
              <tr key={v.id} className={`hover:bg-[#161616] transition-colors ${i < vehicles.slice(0,8).length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                <td className="px-5 py-3 text-white">
                  {v.brand} {v.model}
                  <span className="text-[#555] ml-1.5">{v.year}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1.5 w-fit">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS[v.status]?.dot}`} />
                    <span className="text-[#888] text-xs">{STATUS[v.status]?.label}</span>
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-[#888] tabular-nums">{fmt(v.total_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
