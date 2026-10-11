'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Sale {
  id: string; brand: string; model: string; year: number; vin: string;
  customer_name: string; customer_phone: string; sold_by_name: string;
  sale_price: string; total_cost: string; net_profit: string;
  payment_type: string; sold_at: string;
}
interface Summary { total_sold: string; total_revenue: string; total_profit: string; }

function fmt(n: string | number) { return Number(n).toLocaleString('mn-MN') + '₮'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('mn-MN'); }

const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг' };

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.getSales().then(setSales).catch(console.error);
    api.getSummary().then(setSummary).catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Борлуулалт</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Нийт зарагдсан', value: (summary?.total_sold ?? '0') + ' машин', color: 'text-white' },
          { label: 'Нийт орлого',    value: summary ? fmt(summary.total_revenue) : '—', color: 'text-blue-400' },
          { label: 'Цэвэр ашиг',     value: summary ? fmt(summary.total_profit)  : '—', color: 'text-green-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800 bg-gray-800/50">
              <th className="text-left px-5 py-3">Машин</th>
              <th className="text-left px-5 py-3">Үйлчлүүлэгч</th>
              <th className="text-left px-5 py-3">Төлбөр</th>
              <th className="text-right px-5 py-3">Зарагдсан үнэ</th>
              <th className="text-right px-5 py-3">Цэвэр ашиг</th>
              <th className="text-left px-5 py-3">Огноо</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3 text-white">{s.brand} {s.model} <span className="text-gray-400">{s.year}</span></td>
                <td className="px-5 py-3">
                  <div className="text-white">{s.customer_name}</div>
                  <div className="text-gray-400 text-xs">{s.customer_phone}</div>
                </td>
                <td className="px-5 py-3 text-gray-300">{PAYMENT[s.payment_type]}</td>
                <td className="px-5 py-3 text-right text-white font-medium">{fmt(s.sale_price)}</td>
                <td className="px-5 py-3 text-right">
                  <span className={Number(s.net_profit) >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {fmt(s.net_profit)}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400">{fmtDate(s.sold_at)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-12">Борлуулалт байхгүй байна</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
