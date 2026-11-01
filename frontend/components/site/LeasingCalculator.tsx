"use client";
import { useEffect, useMemo, useState } from "react";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const toNum = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function Range({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return (
    <input
      type="range" className="calc-range w-full" min={min} max={max} step={step} value={clamp(value, min, max)}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ backgroundImage: `linear-gradient(to right, var(--color-brand) ${pct}%, #e7e2db ${pct}%)` }}
    />
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm text-zinc-500">{label}</span>
        {hint && <span className="text-sm font-medium text-brand">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const boxCls =
  "w-full text-right bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-ink/40 focus:ring-4 focus:ring-ink/5 focus:outline-none rounded-2xl px-4 py-2.5 font-display font-semibold text-ink text-lg tabular-nums transition";

export function LeasingCalculator({ open, onClose, price, carName, phone, chatHref, chatLabel }: {
  open: boolean; onClose: () => void; price: number | null; carName?: string; phone?: string; chatHref?: string; chatLabel?: string;
}) {
  const startPrice = price && price > 0 ? Math.round(price) : 100_000_000;
  const [carPrice, setCarPrice] = useState(startPrice);
  const [months, setMonths] = useState(48);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(1.5);

  useEffect(() => { if (open) setCarPrice(startPrice); }, [open, startPrice]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const calc = useMemo(() => {
    const down = (carPrice * downPct) / 100;
    const loan = Math.max(0, carPrice - down);
    const r = rate / 100;
    const monthly = loan === 0 ? 0 : r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -months)) : loan / months;
    const paidLoan = monthly * months;
    return { down, loan, monthly, total: paidLoan + down, interest: paidLoan - loan };
  }, [carPrice, months, downPct, rate]);

  const maxPrice = Math.max(500_000_000, startPrice * 2);

  return (
    <div className={`fixed inset-0 z-[90] overflow-hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <aside role="dialog" aria-label="Лизингийн тооцоолуур"
        className={`absolute right-0 top-0 sm:top-3 sm:right-3 sm:bottom-3 h-full sm:h-auto w-full sm:w-[440px] bg-white sm:rounded-[28px] shadow-lift flex flex-col overflow-hidden transition-transform duration-500 ease-out-expo ${open ? "translate-x-0" : "translate-x-[110%]"}`}>
        <div className="flex items-center justify-between px-6 h-[72px] shrink-0 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2" />
            </svg>
            <span className="font-display text-lg font-semibold text-ink">Лизингийн тооцоолуур</span>
          </div>
          <button onClick={onClose} aria-label="Хаах" className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-ink transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {carName && <div className="inline-flex items-center h-8 px-3 rounded-full bg-zinc-100 text-sm font-medium text-ink">{carName}</div>}

          <Field label="Машины үнэ">
            <div className="relative">
              <input inputMode="numeric" className={boxCls + " pr-9"} value={fmt(carPrice)}
                onChange={(e) => setCarPrice(clamp(toNum(e.target.value), 1_000_000, 5_000_000_000))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500">₮</span>
            </div>
            <div className="mt-2"><Range value={carPrice} min={10_000_000} max={maxPrice} step={1_000_000} onChange={setCarPrice} /></div>
          </Field>

          <Field label="Хугацаа" hint={`${(months / 12).toFixed(months % 12 ? 1 : 0)} жил`}>
            <div className="relative">
              <input inputMode="numeric" className={boxCls + " pr-12"} value={months}
                onChange={(e) => setMonths(clamp(toNum(e.target.value), 1, 120))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-sm">сар</span>
            </div>
            <div className="mt-2"><Range value={months} min={6} max={84} step={6} onChange={setMonths} /></div>
          </Field>

          <Field label="Урьдчилгаа" hint={`${downPct}%`}>
            <div className="relative">
              <input inputMode="numeric" className={boxCls + " pr-9"} value={fmt(calc.down)}
                onChange={(e) => setDownPct(clamp(Math.round((toNum(e.target.value) / carPrice) * 100), 0, 90))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500">₮</span>
            </div>
            <div className="mt-2"><Range value={downPct} min={0} max={90} step={5} onChange={setDownPct} /></div>
          </Field>

          <Field label="Сарын хүү">
            <div className="relative">
              <input inputMode="decimal" className={boxCls + " pr-9"} value={rate}
                onChange={(e) => setRate(clamp(Number(e.target.value.replace(/[^\d.]/g, "")) || 0, 0, 10))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500">%</span>
            </div>
            <div className="mt-2"><Range value={rate} min={0} max={4} step={0.1} onChange={(v) => setRate(Math.round(v * 10) / 10)} /></div>
          </Field>

          <div className="relative overflow-hidden bg-ink text-white rounded-[24px] p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 w-56 h-56 rounded-full bg-brand/70 blur-3xl" />
            <div className="relative text-center text-sm text-white/60 mb-2">Сарын төлбөр</div>
            <div className="relative text-center font-display text-[40px] font-semibold tabular-nums tracking-tight">{fmt(calc.monthly)}₮</div>
            <dl className="relative mt-6 pt-5 border-t border-white/10 space-y-3 text-sm">
              {[
                ["Зээлэх дүн", calc.loan],
                ["Урьдчилгаа", calc.down],
                ["Нийт хүү", calc.interest],
                ["Нийт төлөх дүн", calc.total],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between">
                  <dt className="text-white/55">{k}</dt>
                  <dd className="font-medium tabular-nums">{fmt(v as number)}₮</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 rounded-2xl px-4 py-3">
            * Зөвхөн дундаж нөхцөлөөр тооцсон урьдчилсан дүн. Бодит зээлийн нөхцөл, хүү банк болон лизингийн
            байгууллагаас хамаарч өөр байж болно.
          </p>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 space-y-2">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <span className="text-sm text-zinc-500">Сарын төлбөр</span>
            <span className="font-display text-2xl font-semibold text-brand tabular-nums tracking-tight">{fmt(calc.monthly)}₮</span>
          </div>
          {(chatHref || phone) && (
            <a href={chatHref || `tel:${phone}`} {...(chatHref ? { target: "_blank", rel: "noreferrer" } : {})}
              className="flex items-center justify-center h-12 ring-1 ring-ink/10 hover:ring-ink/30 text-ink text-sm rounded-full transition-all font-medium">
              Лизингийн талаар лавлах{chatHref && chatLabel ? ` (${chatLabel})` : ""}
            </a>
          )}
          <button onClick={onClose}
            className="w-full bg-ink hover:bg-brand text-white text-sm h-12 rounded-full transition-colors font-medium">
            Тооцоолуурыг хаах
          </button>
        </div>
      </aside>
    </div>
  );
}
