"use client";
import { useMemo, useState } from "react";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} сая ₮` : `${fmt(n)} ₮`);

const DOWNS = [0, 10, 20, 30, 50];
const TERMS = [12, 24, 36, 48, 60];

// Машины хуудсан дээр шууд харагдах энгийн лизингийн тооцоолуур
export function LeasingCalculator({ price, chatHref, chatLabel, phone }: {
  price: number | null; chatHref?: string; chatLabel?: string; phone?: string;
}) {
  const [customPrice, setCustomPrice] = useState("");
  const [downPct, setDownPct] = useState(20);
  const [months, setMonths] = useState(36);
  const [rate, setRate] = useState("1.5");

  const carPrice = price && price > 0 ? price : Number(customPrice.replace(/\D/g, "")) || 0;

  const calc = useMemo(() => {
    const down = (carPrice * downPct) / 100;
    const loan = Math.max(0, carPrice - down);
    const r = (Number(rate.replace(",", ".")) || 0) / 100;
    const monthly = loan === 0 ? 0 : r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -months)) : loan / months;
    return { down, loan, monthly, interest: monthly * months - loan };
  }, [carPrice, downPct, months, rate]);

  const chip = (on: boolean) =>
    `h-10 min-w-[3.25rem] px-3 rounded-full text-sm font-medium border transition-colors ${
      on ? "bg-ink border-ink text-white" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`;
  const askHref = chatHref || (phone ? `tel:${phone}` : null);

  return (
    <section id="leasing" className="bg-white rounded-[28px] ring-1 ring-ink/[0.06] shadow-card p-6 sm:p-8 scroll-mt-28">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Лизингийн тооцоолуур</h2>
        <span className="text-xs text-zinc-500">Ойролцоо тооцоо</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,300px)] gap-6 mt-6">
        <div className="space-y-5">
          {!(price && price > 0) && (
            <div>
              <div className="text-sm text-zinc-500 mb-2">Машины үнэ</div>
              <div className="relative">
                <input value={customPrice} onChange={(e) => setCustomPrice(e.target.value.replace(/[^\d]/g, "") ? fmt(Number(e.target.value.replace(/[^\d]/g, ""))) : "")}
                  inputMode="numeric" placeholder="Жишээ: 60,000,000"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-4 pr-9 h-12 text-base font-medium text-ink tabular-nums focus:outline-none focus:border-ink/40" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">₮</span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm text-zinc-500">Урьдчилгаа</span>
              {carPrice > 0 && <span className="text-sm font-medium text-ink tabular-nums">{short(calc.down)}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {DOWNS.map((d) => <button key={d} type="button" onClick={() => setDownPct(d)} className={chip(downPct === d)}>{d}%</button>)}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm text-zinc-500">Хугацаа</span>
              <span className="text-sm font-medium text-ink">{months / 12} жил</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TERMS.map((m) => <button key={m} type="button" onClick={() => setMonths(m)} className={chip(months === m)}>{m} сар</button>)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">Сарын хүү</span>
            <div className="relative w-24">
              <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, "").slice(0, 4))} inputMode="decimal"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-3 pr-7 h-10 text-sm font-medium text-ink tabular-nums focus:outline-none focus:border-ink/40" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
            <span className="text-xs text-zinc-500">банкнаас хамаарна</span>
          </div>
        </div>

        <div className="rounded-[22px] bg-brand-soft p-5 sm:p-6 flex flex-col">
          <div className="text-sm text-zinc-600">Сарын төлбөр</div>
          <div className="font-display text-[34px] sm:text-[40px] font-semibold text-brand tabular-nums tracking-tight leading-tight mt-1">
            {carPrice > 0 ? `${fmt(calc.monthly)}₮` : "—"}
          </div>
          {carPrice > 0 && (
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-zinc-600">Зээлийн дүн</dt><dd className="font-medium text-ink tabular-nums">{short(calc.loan)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-600">Нийт хүү</dt><dd className="font-medium text-ink tabular-nums">{short(calc.interest)}</dd></div>
            </dl>
          )}
          {askHref && (
            <a href={askHref} {...(chatHref ? { target: "_blank", rel: "noreferrer" } : {})}
              className="mt-5 h-11 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium flex items-center justify-center transition-colors">
              Лизингийн талаар лавлах{chatHref && chatLabel ? ` (${chatLabel})` : ""}
            </a>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500 mt-5">
        Дундаж нөхцөлөөр тооцсон урьдчилсан дүн. Бодит хүү, нөхцөл нь банк, лизингийн байгууллагаас хамаарна.
      </p>
    </section>
  );
}
