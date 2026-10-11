'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Sale {
  id: string; brand: string; model: string; year: number; vin: string;
  customer_name: string; customer_phone: string; sold_by_name: string;
  sale_price: string; total_cost: string; net_profit: string;
  payment_type: string; sold_at: string;
}
interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_profit: string; }

function fmt(n: string | number) { return Number(n).toLocaleString('mn-MN') + '₮'; }
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг' };
const PAYMENT_COLOR: Record<string, string> = {
  CASH:    'bg-emerald-50 text-emerald-700',
  LOAN:    'bg-blue-50 text-blue-700',
  LEASING: 'bg-violet-50 text-violet-700',
};

export default function SalesPage() {
  const [sales, setSales]     = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSales(), api.getSummary()])
      .then(([s, sum]) => { setSales(s); setSummary(sum); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl space-y-4 sm:space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-[#09090b]">Борлуулалт</h1>
        <p className="text-xs sm:text-sm text-[#71717a] mt-0.5">{sales.length} борлуулалт нийт</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Нийт зарагдсан',  value: `${summary?.total_sold ?? '0'}`, unit: 'машин',        color: 'bg-blue-50 border-blue-100',     textColor: 'text-blue-700' },
          { label: 'Нийт орлого',     value: summary ? fmt(summary.total_revenue) : '—', unit: '', color: 'bg-emerald-50 border-emerald-100', textColor: 'text-emerald-700' },
          { label: 'Цэвэр ашиг',      value: summary ? fmt(summary.total_profit) : '—',  unit: '', color: 'bg-violet-50 border-violet-100',   textColor: 'text-violet-700' },
          { label: 'Дундаж ашиг',     value: summary ? fmt(summary.avg_profit ?? 0) : '—', unit: '', color: 'bg-amber-50 border-amber-100',  textColor: 'text-amber-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border px-3 sm:px-5 py-3 sm:py-4 ${c.color}`}>
            <div className="text-[11px] font-medium text-[#71717a] mb-2">{c.label}</div>
            <div className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${c.textColor}`}>{c.value}</div>
            {c.unit && <div className="text-xs text-[#71717a] mt-1">{c.unit}</div>}
          </div>
        ))}
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#e4e4e7]">
          <span className="text-sm font-semibold text-[#09090b]">Борлуулалтын жагсаалт</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
        ) : sales.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#a1a1aa]">Борлуулалт байхгүй байна</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                {['Машин', 'Үйлчлүүлэгч', 'Төлбөр', 'Зарагдсан үнэ', 'Цэвэр ашиг', 'Огноо'].map((h, i) => (
                  <th key={i} className={`py-2.5 px-5 text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider ${['Зарагдсан үнэ','Цэвэр ашиг'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={s.id} className={`hover:bg-[#fafafa] transition-colors ${i < sales.length - 1 ? 'border-b border-[#f4f4f5]' : ''}`}>
                  <td className="px-5 py-3 font-medium text-[#09090b]">
                    {s.brand} {s.model} <span className="text-[#a1a1aa] font-normal">{s.year}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[#09090b]">{s.customer_name || '—'}</div>
                    {s.customer_phone && <div className="text-[#a1a1aa] text-xs mt-0.5">{s.customer_phone}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLOR[s.payment_type] || 'bg-[#f4f4f5] text-[#71717a]'}`}>
                      {PAYMENT[s.payment_type] || s.payment_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[#09090b]">{fmt(s.sale_price)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={Number(s.net_profit) >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                      {Number(s.net_profit) >= 0 ? '+' : ''}{fmt(s.net_profit)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#a1a1aa] text-xs">{fmtDate(s.sold_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="sm:hidden space-y-2">
        <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider px-1">Борлуулалтын жагсаалт</div>
        {loading ? (
          <div className="bg-white border border-[#e4e4e7] rounded-xl py-10 text-center text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
        ) : sales.length === 0 ? (
          <div className="bg-white border border-[#e4e4e7] rounded-xl py-10 text-center text-sm text-[#a1a1aa]">Борлуулалт байхгүй байна</div>
        ) : sales.map(s => (
          <div key={s.id} className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-sm font-semibold text-[#09090b]">{s.brand} {s.model} <span className="text-[#a1a1aa] font-normal">{s.year}</span></div>
                <div className="text-xs text-[#a1a1aa] mt-0.5">{fmtDate(s.sold_at)}</div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLOR[s.payment_type] || 'bg-[#f4f4f5] text-[#71717a]'}`}>
                {PAYMENT[s.payment_type]}
              </span>
            </div>
            {(s.customer_name || s.customer_phone) && (
              <div className="text-xs text-[#71717a] mb-3 pb-3 border-b border-[#f4f4f5]">
                {s.customer_name && <span className="font-medium text-[#09090b]">{s.customer_name}</span>}
                {s.customer_phone && <span className="ml-2">{s.customer_phone}</span>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#a1a1aa]">Зарагдсан үнэ</div>
                <div className="text-sm font-semibold text-[#09090b] tabular-nums">{fmt(s.sale_price)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#a1a1aa]">Цэвэр ашиг</div>
                <div className={`text-sm font-semibold tabular-nums ${Number(s.net_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Number(s.net_profit) >= 0 ? '+' : ''}{fmt(s.net_profit)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
