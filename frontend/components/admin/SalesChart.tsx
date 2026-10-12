"use client";
import { useMemo, useState } from "react";

interface Sale { sold_at: string; sale_price: string }

const MONTHS = 6;
const fmtFull = (n: number) => Math.round(n).toLocaleString("mn-MN") + "₮";
const fmtCompact = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")} тэр`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} сая`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} мянга`;
  return String(n);
};
function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const m = max / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}

export function SalesChart({ sales }: { sales: Sale[] | null }) {
  const [table, setTable] = useState(false);

  const data = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1} сар`, year: d.getFullYear(), revenue: 0, count: 0 };
    });
    for (const s of sales || []) {
      const d = new Date(s.sold_at);
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) { b.revenue += Number(s.sale_price) || 0; b.count += 1; }
    }
    return buckets;
  }, [sales]);

  const maxVal = Math.max(...data.map((d) => d.revenue));
  const top = niceMax(maxVal);
  const ticks = [top, top / 2, 0];
  const maxIdx = maxVal > 0 ? data.findIndex((d) => d.revenue === maxVal) : -1;
  const total = data.reduce((a, d) => a + d.revenue, 0);

  return (
    <div className="bg-white border border-[#e6e0d8] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-[#e6e0d8] flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#1c1917]">Борлуулалтын орлого</div>
          <div className="text-xs text-[#6f6a64] mt-0.5">Сүүлийн {MONTHS} сар{total > 0 ? ` · нийт ${fmtCompact(total)}₮` : ""}</div>
        </div>
        <button type="button" onClick={() => setTable((v) => !v)}
          className="text-xs font-medium text-[#5f5a54] hover:text-brand border border-[#e6e0d8] hover:border-brand rounded-md px-3 py-1.5 transition-colors">
          {table ? "График" : "Хүснэгт"}
        </button>
      </div>

      {sales === null ? (
        <div className="p-5"><div className="h-44 rounded-md bg-[#f3efe9] animate-pulse" /></div>
      ) : maxVal === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="text-sm text-[#46413c]">Сүүлийн {MONTHS} сард борлуулалт бүртгэгдээгүй байна</div>
          <div className="text-xs text-[#6f6a64] mt-1">Машиныг "Зарах" товчоор бүртгэхэд энд график харагдана</div>
        </div>
      ) : table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6e0d8] bg-[#faf8f5] text-xs text-[#5f5a54]">
              <th className="text-left font-medium px-5 py-2.5">Сар</th>
              <th className="text-right font-medium px-5 py-2.5">Машин</th>
              <th className="text-right font-medium px-5 py-2.5">Орлого</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-b border-[#f3efe9] last:border-0">
                <td className="px-5 py-2.5 text-[#1c1917]">{d.year} · {d.label}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[#46413c]">{d.count}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[#1c1917]">{fmtFull(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-5 pt-6 pb-4">
          <div className="relative h-44 ml-14">
            {ticks.map((t, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-[#e6e0d8]" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
                <span className="absolute -left-14 -translate-y-1/2 w-12 text-right text-xs text-[#6f6a64] tabular-nums">{t === 0 ? "0" : fmtCompact(t)}</span>
              </div>
            ))}
            <div className="absolute inset-0 flex">
              {data.map((d, i) => {
                const h = top > 0 ? (d.revenue / top) * 100 : 0;
                return (
                  <div key={d.key} tabIndex={0} role="img"
                    aria-label={`${d.year} ${d.label}: ${d.count} машин, ${fmtFull(d.revenue)}`}
                    className="group relative flex-1 flex items-end justify-center outline-none">
                    <div className="absolute inset-y-0 inset-x-1 rounded-sm group-hover:bg-[#f3efe9]/70 group-focus:bg-[#f3efe9]/70 transition-colors" />
                    {i === maxIdx && (
                      <span className="absolute text-xs font-medium text-[#1c1917] tabular-nums whitespace-nowrap" style={{ bottom: `calc(${h}% + 6px)` }}>
                        {fmtCompact(d.revenue)}
                      </span>
                    )}
                    <div className={`relative w-full max-w-[24px] mx-1 ${d.revenue > 0 ? "bg-brand rounded-t-[4px]" : "bg-[#d4ccc2]"}`}
                      style={{ height: d.revenue > 0 ? `${Math.max(h, 2)}%` : "2px" }} />
                    <div className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 hidden group-hover:block group-focus:block bg-[#1c1917] text-white rounded-md px-3 py-2 shadow-lg whitespace-nowrap"
                      style={{ bottom: `calc(${h}% + 28px)` }}>
                      <div className="text-sm font-semibold tabular-nums">{fmtFull(d.revenue)}</div>
                      <div className="text-xs text-white/60 mt-0.5">{d.year} · {d.label} · {d.count} машин</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex ml-14 mt-2">
            {data.map((d) => (
              <div key={d.key} className="flex-1 text-center text-xs text-[#5f5a54]">{d.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
