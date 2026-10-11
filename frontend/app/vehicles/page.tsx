'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { IconChevronRight } from '@/components/icons';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  mileage: number; color: string; status: string; total_cost: string;
}

const STATUS: Record<string, { label: string; dot: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400' },
};

const FILTERS = ['Бүгд', 'ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState('Бүгд');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVehicles().then(d => { setVehicles(d); setLoading(false); }).catch(console.error);
  }, []);

  const filtered = filter === 'Бүгд' ? vehicles : vehicles.filter(v => v.status === filter);
  const count = (s: string) => s === 'Бүгд' ? vehicles.length : vehicles.filter(v => v.status === s).length;

  return (
    <div className="px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Машинууд</h1>
          <p className="text-sm text-[#555] mt-0.5">{vehicles.length} машин нийт</p>
        </div>
        <Link href="/vehicles/new"
          className="flex items-center gap-1.5 bg-white hover:bg-[#e8e8e8] text-black text-sm font-medium px-3.5 py-2 rounded-md transition-colors">
          Машин нэмэх
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-5 border-b border-[#1e1e1e] pb-0">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm transition-colors border-b-[1.5px] -mb-px ${
              filter === f
                ? 'text-white border-white'
                : 'text-[#555] border-transparent hover:text-[#999]'
            }`}>
            {f === 'Бүгд' ? 'Бүгд' : STATUS[f]?.label}
            <span className={`ml-1.5 text-xs ${filter === f ? 'text-[#888]' : 'text-[#444]'}`}>
              {count(f)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#555] text-sm py-16 text-center">Ачааллаж байна...</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Машин', 'Гүйлт', 'Өнгө', 'Статус', 'Нийт өртөг', ''].map((h, i) => (
                  <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${h === 'Нийт өртөг' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className={`hover:bg-[#161616] transition-colors ${i < filtered.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                  <td className="px-5 py-3 text-white font-medium">
                    {v.brand} {v.model}
                    <span className="text-[#555] font-normal ml-1.5">{v.year}</span>
                  </td>
                  <td className="px-5 py-3 text-[#888] tabular-nums">{v.mileage.toLocaleString()} км</td>
                  <td className="px-5 py-3 text-[#888]">{v.color || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 w-fit">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS[v.status]?.dot}`} />
                      <span className="text-[#888] text-xs">{STATUS[v.status]?.label}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-[#888] tabular-nums">
                    {Number(v.total_cost).toLocaleString('mn-MN')}₮
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/vehicles/${v.id}`} className="text-[#444] hover:text-white transition-colors inline-flex items-center gap-1">
                      <IconChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-[#444] text-sm py-16">Машин олдсонгүй</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
