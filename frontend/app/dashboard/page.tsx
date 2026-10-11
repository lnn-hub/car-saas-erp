'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ARRIVED:   { label: 'Ирсэн',      color: 'bg-yellow-500/20 text-yellow-400' },
  PUBLISHED: { label: 'Нийтлэгдсэн', color: 'bg-blue-500/20 text-blue-400' },
  RESERVED:  { label: 'Захиалгатай', color: 'bg-purple-500/20 text-purple-400' },
  SOLD:      { label: 'Зарагдсан',   color: 'bg-green-500/20 text-green-400' },
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

  const counts = {
    ARRIVED: vehicles.filter(v => v.status === 'ARRIVED').length,
    PUBLISHED: vehicles.filter(v => v.status === 'PUBLISHED').length,
    RESERVED: vehicles.filter(v => v.status === 'RESERVED').length,
    SOLD: vehicles.filter(v => v.status === 'SOLD').length,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Нийт зарагдсан', value: summary?.total_sold ?? '—', unit: 'машин', color: 'text-green-400' },
          { label: 'Нийт орлого',    value: summary ? fmt(summary.total_revenue) : '—', unit: '', color: 'text-blue-400' },
          { label: 'Цэвэр ашиг',     value: summary ? fmt(summary.total_profit)  : '—', unit: '', color: 'text-yellow-400' },
          { label: 'Нийт машин',     value: vehicles.length, unit: 'машин', color: 'text-white' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm mb-2">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value}{card.unit ? <span className="text-sm font-normal text-gray-400 ml-1">{card.unit}</span> : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(STATUS_LABEL).map(([key, val]) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${val.color}`}>{val.label}</span>
            <span className="text-white font-bold text-lg">{counts[key as keyof typeof counts]}</span>
          </div>
        ))}
      </div>

      {/* Recent vehicles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Сүүлийн машинууд</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left px-5 py-3">Машин</th>
              <th className="text-left px-5 py-3">Статус</th>
              <th className="text-right px-5 py-3">Нийт өртөг</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.slice(0, 8).map(v => (
              <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3 text-white">{v.brand} {v.model} <span className="text-gray-400">{v.year}</span></td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_LABEL[v.status]?.color}`}>
                    {STATUS_LABEL[v.status]?.label}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-gray-300">{fmt(v.total_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
