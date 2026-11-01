'use client';
import { useEffect, useMemo, useState } from 'react';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} сая ₮` : `${fmt(n)} ₮`;

const DOWNS = [0, 10, 20, 30, 50];
const TERMS = [12, 24, 36, 48, 60];

function IcCalc({ cls = 'w-6 h-6' }: { cls?: string }) {
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2.5" width="16" height="19" rx="3" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}

// Зүүн доод буланд байнга харагдах лизингийн тооцоолуур. Машины хуудсан дээр тухайн машины үнэ автоматаар орно.
export function LeasingWidget({
  price,
  chatHref,
  chatLabel,
  phone,
}: {
  price?: number | null;
  chatHref?: string;
  chatLabel?: string;
  phone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [carPriceText, setCarPriceText] = useState(price && price > 0 ? fmt(price) : '');
  const [downPct, setDownPct] = useState(20);
  const [months, setMonths] = useState(36);
  const [rate, setRate] = useState('1.5');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const carPrice = Number(carPriceText.replace(/\D/g, '')) || 0;
  const calc = useMemo(() => {
    const down = (carPrice * downPct) / 100;
    const loan = Math.max(0, carPrice - down);
    const r = (Number(rate.replace(',', '.')) || 0) / 100;
    const monthly = loan === 0 ? 0 : r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -months)) : loan / months;
    return { down, loan, monthly, interest: monthly * months - loan };
  }, [carPrice, downPct, months, rate]);

  const chip = (on: boolean) =>
    `h-9 min-w-[3rem] px-3 rounded-full text-sm font-medium border transition-colors ${
      on ? 'bg-ink border-ink text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
    }`;
  const askHref = chatHref || (phone ? `tel:${phone}` : null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Лизингийн тооцоолуур"
        className="fixed z-40 left-4 lg:left-6 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6 h-14 w-14 lg:w-auto lg:pl-2 lg:pr-5 rounded-full bg-white ring-1 ring-ink/10 shadow-lift flex items-center justify-center gap-2.5 hover:ring-ink/25 transition-shadow"
      >
        <span className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center">
          <IcCalc cls="w-5 h-5" />
        </span>
        <span className="hidden lg:inline text-sm font-medium text-ink">Лизинг тооцоолох</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] lg:inset-auto lg:left-6 lg:bottom-24">
          <div className="absolute inset-0 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />
          <section
            role="dialog"
            aria-label="Лизингийн тооцоолуур"
            className="absolute inset-x-0 bottom-0 lg:relative lg:w-[380px] bg-white rounded-t-[28px] lg:rounded-[28px] ring-1 ring-ink/[0.06] shadow-lift max-h-[88dvh] overflow-y-auto p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-[sheetUp_0.3s_var(--ease-out-expo)] lg:animate-[fadeUp_0.25s_var(--ease-out-expo)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-ink">Лизингийн тооцоолуур</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Хаах"
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-ink transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-zinc-500 mb-1.5">Машины үнэ</div>
                <div className="relative">
                  <input
                    value={carPriceText}
                    inputMode="numeric"
                    placeholder="Жишээ: 60,000,000"
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '');
                      setCarPriceText(d ? fmt(Number(d)) : '');
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-4 pr-9 h-11 text-base font-medium text-ink tabular-nums focus:outline-none focus:border-ink/40"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">₮</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-sm text-zinc-500">Урьдчилгаа</span>
                  {carPrice > 0 && (
                    <span className="text-sm font-medium text-ink tabular-nums">{short(calc.down)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DOWNS.map((d) => (
                    <button key={d} type="button" onClick={() => setDownPct(d)} className={chip(downPct === d)}>
                      {d}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-sm text-zinc-500">Хугацаа</span>
                  <span className="text-sm font-medium text-ink">{months / 12} жил</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TERMS.map((m) => (
                    <button key={m} type="button" onClick={() => setMonths(m)} className={chip(months === m)}>
                      {m} сар
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">Сарын хүү</span>
                <div className="relative w-24">
                  <input
                    value={rate}
                    onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, '').slice(0, 4))}
                    inputMode="decimal"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-3 pr-7 h-9 text-sm font-medium text-ink tabular-nums focus:outline-none focus:border-ink/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
                </div>
              </div>

              <div className="rounded-[22px] bg-brand-soft p-4">
                <div className="text-sm text-zinc-600">Сарын төлбөр</div>
                <div className="font-display text-[32px] font-semibold text-brand tabular-nums tracking-tight leading-tight mt-0.5">
                  {carPrice > 0 ? `${fmt(calc.monthly)}₮` : '—'}
                </div>
                {carPrice > 0 && (
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Зээлийн дүн</dt>
                      <dd className="font-medium text-ink tabular-nums">{short(calc.loan)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Нийт хүү</dt>
                      <dd className="font-medium text-ink tabular-nums">{short(calc.interest)}</dd>
                    </div>
                  </dl>
                )}
                {askHref && (
                  <a
                    href={askHref}
                    {...(chatHref ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="mt-4 h-11 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium flex items-center justify-center transition-colors"
                  >
                    Лизингийн талаар лавлах{chatHref && chatLabel ? ` (${chatLabel})` : ''}
                  </a>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                Урьдчилсан тооцоо. Бодит хүү, нөхцөл нь банк, лизингийн байгууллагаас хамаарна.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
