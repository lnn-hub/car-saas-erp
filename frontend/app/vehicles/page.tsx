'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  mileage: number; color: string; status: string; total_cost: string; main_image: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ARRIVED:   { label: 'Ирсэн',       color: 'bg-yellow-500/20 text-yellow-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн', color: 'bg-blue-500/20 text-blue-400' },
  RESERVED:  { label: 'Захиалгатай', color: 'bg-purple-500/20 text-purple-400' },
  SOLD:      { label: 'Зарагдсан',   color: 'bg-green-500/20 text-green-400' },
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVehicles().then(data => { setVehicles(data); setLoading(false); }).catch(console.error);
  }, []);

  const filtered = filter === 'ALL' ? vehicles : vehicles.filter(v => v.status === filter);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Машинууд</h1>
        <Link href="/vehicles/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Машин нэмэх
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['ALL', 'ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Бүгд' : STATUS_LABEL[s]?.label} ({s === 'ALL' ? vehicles.length : vehicles.filter(v => v.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Ачааллаж байна...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
                <th className="text-left px-5 py-3">Машин</th>
                <th className="text-left px-5 py-3">Гүйлт</th>
                <th className="text-left px-5 py-3">Өнгө</th>
                <th className="text-left px-5 py-3">Статус</th>
                <th className="text-right px-5 py-3">Нийт өртөг</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{v.brand} {v.model} <span className="text-gray-400 font-normal">{v.year}</span></td>
                  <td className="px-5 py-3 text-gray-300">{v.mileage.toLocaleString()} км</td>
                  <td className="px-5 py-3 text-gray-300">{v.color || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_LABEL[v.status]?.color}`}>
                      {STATUS_LABEL[v.status]?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-300">{Number(v.total_cost).toLocaleString('mn-MN')}₮</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/vehicles/${v.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Дэлгэрэнгүй →</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-12">Машин олдсонгүй</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
