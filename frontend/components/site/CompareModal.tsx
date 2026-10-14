"use client";
import { useEffect } from "react";
import Link from "next/link";
import { optimizeImg, Vehicle } from "@/lib/site";

const FUEL: Record<string, string> = { PETROL: "Бензин", DIESEL: "Дизель", HYBRID: "Хибрид", ELECTRIC: "Цахилгаан" };
const TRANS: Record<string, string> = { AUTO: "Автомат", MANUAL: "Механик" };
const price = (n: string | null) => (n && Number(n) > 0 ? `${Number(n).toLocaleString("en-US")}₮` : "Тохиролцоно");

export function CompareModal({ vehicles, onClose, onRemove }: {
  vehicles: Vehicle[]; onClose: () => void; onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const rows: [string, (v: Vehicle) => string][] = [
    ["Үнэ", (v) => price(v.price)],
    ["Он", (v) => String(v.year)],
    ["Гүйлт", (v) => (v.mileage ? `${Number(v.mileage).toLocaleString("en-US")} км` : "-")],
    ["Түлш", (v) => FUEL[v.fuel_type] || v.fuel_type],
    ["Хурдны хайрцаг", (v) => TRANS[v.transmission] || v.transmission],
    ["Хөдөлгүүр", (v) => (v.engine_cc ? `${(Number(v.engine_cc) / 1000).toFixed(1)}L` : "-")],
    ["Өнгө", (v) => v.color || "-"],
    ["Улсын дугаар", (v) => (v.has_plates ? "Дугаартай" : "Дугааргүй")],
  ];

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 animate-[pageIn_0.2s_ease-out]" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-4xl max-h-[92dvh] flex flex-col rounded-t-xl sm:rounded-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-200 shrink-0">
          <div className="text-base font-semibold text-[#111]">Машин харьцуулах</div>
          <button onClick={onClose} aria-label="Хаах" className="w-9 h-9 flex items-center justify-center rounded-sm hover:bg-zinc-100 text-zinc-600">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-[13px] sm:text-sm table-fixed">
            <thead>
              <tr>
                <th className="w-[64px] sm:w-36" />
                {vehicles.map((v) => {
                  const src = optimizeImg(v.main_image, 480);
                  return (
                    <th key={v.id} className="p-1.5 sm:p-3 align-top text-left font-normal">
                      <div className="aspect-[4/3] bg-zinc-100 rounded-sm overflow-hidden mb-2">
                        {src && <img src={src} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="text-xs text-brand font-medium">{v.brand}</div>
                      <div className="text-sm font-semibold text-[#111] leading-tight">{v.model}</div>
                      <div className="flex flex-col items-start sm:flex-row sm:items-center gap-0 sm:gap-3 mt-1">
                        <Link href={`/vehicle/${v.id}`} className="py-1.5 text-xs text-zinc-600 hover:text-brand underline-offset-2 hover:underline">Дэлгэрэнгүй</Link>
                        <button onClick={() => onRemove(v.id)} className="py-1.5 text-xs text-zinc-500 hover:text-brand">Хасах</button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => {
                const vals = vehicles.map(get);
                const differs = new Set(vals).size > 1;
                return (
                  <tr key={label} className="border-t border-zinc-100">
                    <td className="px-1.5 sm:px-3 py-3 text-xs text-zinc-500 align-top">{label}</td>
                    {vals.map((val, i) => (
                      <td key={i} className={`px-1.5 sm:px-3 py-3 align-top break-words ${differs ? "font-semibold text-[#111]" : "text-zinc-600"}`}>{val}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-zinc-200 text-xs text-zinc-500 shrink-0">Ялгаатай үзүүлэлтүүд тодорсон байна.</div>
      </div>
    </div>
  );
}
