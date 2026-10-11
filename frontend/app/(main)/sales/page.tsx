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
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг' };

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.getSales().then(setSales).catch(console.error);
    api.getSummary().then(setSummary).catch(console.error);
  }, []);

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Борлуулалт</h1>
        <p className="text-sm text-[#555] mt-0.5">{sales.length} борлуулалт нийт</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Нийт зарагдсан',  value: `${summary?.total_sold ?? '0'} машин` },
          { label: 'Нийт орлого',     value: summary ? fmt(summary.total_revenue) : '—' },
          { label: 'Цэвэр ашиг',      value: summary ? fmt(summary.total_profit) : '—' },
        ].map(c => (
          <div key={c.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-xs text-[#555] mb-2">{c.label}</div>
            <div className="text-xl font-semibold text-white tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              {['Машин', 'Үйлчлүүлэгч', 'Төлбөр', 'Зарагдсан үнэ', 'Цэвэр ашиг', 'Огноо'].map((h, i) => (
                <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#555] uppercase tracking-wider ${['Зарагдсан үнэ', 'Цэвэр ашиг'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((s, i) => (
              <tr key={s.id} className={`hover:bg-[#161616] transition-colors ${i < sales.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                <td className="px-5 py-3 text-white">
                  {s.brand} {s.model}
                  <span className="text-[#555] ml-1.5">{s.year}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="text-white">{s.customer_name}</div>
                  <div className="text-[#555] text-xs mt-0.5">{s.customer_phone}</div>
                </td>
                <td className="px-5 py-3 text-[#888]">{PAYMENT[s.payment_type]}</td>
                <td className="px-5 py-3 text-right text-white tabular-nums">{fmt(s.sale_price)}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={Number(s.net_profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {Number(s.net_profit) >= 0 ? '+' : ''}{fmt(s.net_profit)}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#555] text-xs">{fmtDate(s.sold_at)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#444] text-sm py-16">Борлуулалт байхгүй байна</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
