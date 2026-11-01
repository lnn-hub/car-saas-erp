'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRole } from '@/lib/role';
import { useSessionUser } from '@/lib/client-state';

interface Summary {
  month: string;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avg_days_to_sell: number;
  arrived: number;
  arrived_cost: number;
  stock_count: number;
  stock_value: number;
}
interface SoldRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
  color: string | null;
  arrived_at: string;
  sold_at: string;
  days: number;
  cost: string;
  other_ccy: boolean;
  sale_price: string;
  profit: string;
  payment_type: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sold_by_name: string | null;
}
interface ArrivedRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  price: string | null;
  arrived_at: string;
  cost: string;
  other_ccy: boolean;
}
interface Group {
  key: string;
  count: number;
  revenue: number;
  profit: number;
}
interface MonthReport {
  month: string;
  summary: Summary;
  prev: Summary;
  sold: SoldRow[];
  arrived: ArrivedRow[];
  by_payment: Group[];
  by_brand: Group[];
  expenses: { cost_type: string; currency: string; count: number; amount: number }[];
  has_other_currency: boolean;
}
interface YearReport {
  year: number;
  months: { month: string; sold: number; revenue: number; profit: number; arrived: number }[];
  total: { sold: number; revenue: number; profit: number; arrived: number };
}

const PAYMENT: Record<string, string> = { CASH: 'Бэлэн', LOAN: 'Зээл', LEASING: 'Лизинг', '-': 'Тодорхойгүй' };
const STATUS: Record<string, string> = {
  ARRIVED: 'Ирсэн',
  PUBLISHED: 'Нийтлэгдсэн',
  RESERVED: 'Захиалгатай',
  SOLD: 'Зарагдсан',
};
const COST_TYPE: Record<string, string> = {
  PURCHASE: 'Худалдан авалт',
  SHIPPING: 'Тээвэр',
  CUSTOMS: 'Гааль, татвар',
  REPAIR: 'Засвар',
  CLEANING: 'Угаалга, цэвэрлэгээ',
  OTHER: 'Бусад',
};

const pad = (n: number) => String(n).padStart(2, '0');
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${y} оны ${Number(m)}-р сар`;
};
const shortMonth = (ym: string) => `${Number(ym.split('-')[1])}-р сар`;
const money = (n: number | string | null | undefined) =>
  n == null || n === '' ? '—' : `${Math.round(Number(n)).toLocaleString('en-US')}₮`;
function compact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')} тэрбум₮`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} сая₮`;
  return `${Math.round(n).toLocaleString('en-US')}₮`;
}
function csvCell(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Delta({
  cur,
  prev,
  money: isMoney = false,
  invert = false,
}: {
  cur: number;
  prev: number;
  money?: boolean;
  invert?: boolean;
}) {
  if (!prev && !cur) return <span className="text-xs text-zinc-400">Өмнөх сартай ижил</span>;
  if (!prev) return <span className="text-xs text-zinc-500">Өмнөх сард байгаагүй</span>;
  const diff = cur - prev;
  if (diff === 0) return <span className="text-xs text-zinc-500">Өмнөх сартай ижил</span>;
  const up = diff > 0;
  const good = invert ? !up : up;
  const pct = Math.round((Math.abs(diff) / Math.abs(prev)) * 100);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${good ? 'text-emerald-700' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {isMoney ? compact(Math.abs(diff)) : Math.abs(diff)} ({pct}%)
      <span className="font-normal text-zinc-500">өмнөх сараас</span>
    </span>
  );
}

function Card({
  title,
  children,
  right,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-[22px] ring-1 ring-ink/[0.06] shadow-card overflow-hidden print-avoid ${className}`}
    >
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Bars({ items, empty }: { items: { label: string; value: number; sub: string }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="px-5 py-8 text-sm text-zinc-500 text-center">{empty}</div>;
  return (
    <ul className="px-5 py-4 space-y-3.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{i.label}</span>
            <span className="tabular-nums text-ink">{money(i.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
          <div className="text-xs text-zinc-500 mt-1">{i.sub}</div>
        </li>
      ))}
    </ul>
  );
}

function NoAccess() {
  return (
    <div className="px-4 py-24 text-center">
      <div className="font-display text-xl font-semibold text-ink">Энэ хэсэгт хандах эрх алга</div>
      <p className="text-sm text-zinc-500 mt-2">Админд хандаж эрх авна уу.</p>
    </div>
  );
}

export default function ReportsPage() {
  const { ready, canSeeMoney } = useRole();
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<MonthReport | null>(null);
  const [year, setYear] = useState<YearReport | null>(null);
  // Аль сарын хариу ирснийг хадгална: сонгосон сар өөр бол ачаалж байна гэсэн үг
  const [done, setDone] = useState<{ month: string; error: string } | null>(null);
  const loading = done?.month !== month;
  const error = loading ? '' : done.error;
  const company = useSessionUser()?.company_name || '';
  const yearNum = Number(month.slice(0, 4));
  const isCurrent = month >= thisMonth();

  useEffect(() => {
    let off = false;
    api
      .getMonthReport(month)
      .then((d: MonthReport) => {
        if (!off) {
          setData(d);
          setDone({ month, error: '' });
        }
      })
      .catch((e: unknown) => {
        if (!off) setDone({ month, error: e instanceof Error ? e.message : 'Алдаа гарлаа' });
      });
    return () => {
      off = true;
    };
  }, [month]);

  useEffect(() => {
    let off = false;
    api
      .getYearReport(yearNum)
      .then((d: YearReport) => {
        if (!off) setYear(d);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [yearNum]);

  const s = data?.summary;
  const p = data?.prev;
  const noCost = data?.sold.filter((r) => Number(r.cost) === 0) ?? [];

  function downloadCsv() {
    if (!data || !s) return;
    const L: unknown[][] = [];
    L.push([`${company} - Сарын тайлан`, monthLabel(month)]);
    L.push([]);
    L.push(['ТОЙМ', 'Энэ сар', 'Өмнөх сар']);
    L.push(['Зарагдсан машин', s.sold, p?.sold]);
    L.push(['Борлуулалтын орлого (₮)', Math.round(s.revenue), Math.round(p?.revenue || 0)]);
    L.push(['Зарагдсан машинуудын өртөг (₮)', Math.round(s.cost), Math.round(p?.cost || 0)]);
    L.push(['Цэвэр ашиг (₮)', Math.round(s.profit), Math.round(p?.profit || 0)]);
    L.push(['Ашгийн хувь (%)', s.margin.toFixed(1), (p?.margin || 0).toFixed(1)]);
    L.push(['Дундаж зарагдах хугацаа (хоног)', s.avg_days_to_sell, p?.avg_days_to_sell]);
    L.push(['Шинээр ирсэн машин', s.arrived, p?.arrived]);
    L.push(['Сарын эцсийн агуулах (машин)', s.stock_count, p?.stock_count]);
    L.push(['Сарын эцсийн агуулахын өртөг (₮)', Math.round(s.stock_value), Math.round(p?.stock_value || 0)]);
    L.push([]);
    L.push(['ЗАРАГДСАН МАШИНУУД']);
    L.push([
      '№',
      'Марк',
      'Загвар',
      'Он',
      'VIN',
      'Ирсэн',
      'Зарагдсан',
      'Хоног',
      'Өртөг (₮)',
      'Зарсан үнэ (₮)',
      'Ашиг (₮)',
      'Ашгийн хувь (%)',
      'Төлбөр',
      'Худалдан авагч',
      'Утас',
      'Борлуулсан',
    ]);
    data.sold.forEach((r, i) =>
      L.push([
        i + 1,
        r.brand,
        r.model,
        r.year,
        r.vin,
        r.arrived_at,
        r.sold_at,
        r.days,
        Math.round(Number(r.cost)),
        Math.round(Number(r.sale_price)),
        Math.round(Number(r.profit)),
        Number(r.sale_price) ? ((Number(r.profit) / Number(r.sale_price)) * 100).toFixed(1) : '',
        PAYMENT[r.payment_type || '-'],
        r.customer_name,
        r.customer_phone,
        r.sold_by_name,
      ]),
    );
    L.push([
      '',
      'Нийт',
      '',
      '',
      '',
      '',
      '',
      '',
      Math.round(s.cost),
      Math.round(s.revenue),
      Math.round(s.profit),
      s.margin.toFixed(1),
    ]);
    L.push([]);
    L.push(['ШИНЭЭР ИРСЭН МАШИНУУД']);
    L.push(['№', 'Марк', 'Загвар', 'Он', 'Ирсэн', 'Төлөв', 'Өртөг (₮)', 'Зарах үнэ (₮)']);
    data.arrived.forEach((r, i) =>
      L.push([
        i + 1,
        r.brand,
        r.model,
        r.year,
        r.arrived_at,
        STATUS[r.status] || r.status,
        Math.round(Number(r.cost)),
        r.price ? Math.round(Number(r.price)) : '',
      ]),
    );
    L.push([]);
    L.push(['ЭНЭ САРД БҮРТГЭСЭН ЗАРДАЛ']);
    L.push(['Төрөл', 'Валют', 'Тоо', 'Дүн']);
    data.expenses.forEach((e) =>
      L.push([COST_TYPE[e.cost_type] || e.cost_type, e.currency, e.count, Math.round(e.amount)]),
    );
    const blob = new Blob(['﻿' + L.map((r) => r.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tailan_${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const kpis =
    s && p
      ? [
          {
            label: 'Зарагдсан машин',
            value: `${s.sold}`,
            unit: 'машин',
            hint: 'Энэ сард зарагдсан',
            delta: <Delta cur={s.sold} prev={p.sold} />,
          },
          {
            label: 'Борлуулалтын орлого',
            value: compact(s.revenue),
            hint: 'Зарсан үнийн нийлбэр',
            delta: <Delta cur={s.revenue} prev={p.revenue} money />,
          },
          {
            label: 'Цэвэр ашиг',
            value: compact(s.profit),
            hint: s.revenue ? `Ашгийн хувь ${s.margin.toFixed(1)}%` : 'Орлого − зарагдсан машинуудын өртөг',
            delta: <Delta cur={s.profit} prev={p.profit} money />,
            featured: true,
          },
          {
            label: 'Дундаж зарагдах хугацаа',
            value: s.sold ? `${s.avg_days_to_sell}` : '—',
            unit: s.sold ? 'хоног' : '',
            hint: 'Ирснээс зарагдах хүртэл',
            delta: s.sold && p.sold ? <Delta cur={s.avg_days_to_sell} prev={p.avg_days_to_sell} invert /> : null,
          },
          {
            label: 'Шинээр ирсэн',
            value: `${s.arrived}`,
            unit: 'машин',
            hint: `Өртөг ${compact(s.arrived_cost)}`,
            delta: <Delta cur={s.arrived} prev={p.arrived} />,
          },
          {
            label: 'Сарын эцсийн агуулах',
            value: `${s.stock_count}`,
            unit: 'машин',
            hint: `Өртөг ${compact(s.stock_value)}`,
            delta: null,
          },
        ]
      : [];

  const maxYearRevenue = Math.max(1, ...(year?.months.map((m) => m.revenue) || [0]));

  if (ready && !canSeeMoney) return <NoAccess />;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1500px] mx-auto w-full space-y-4 sm:space-y-5 print:max-w-none print:p-0">
      {/* Хэвлэхэд гарах толгой */}
      <div className="hidden print:block mb-2">
        <div className="text-sm text-zinc-500">{company}</div>
        <div className="font-display text-2xl font-semibold text-ink">Сарын тайлан · {monthLabel(month)}</div>
      </div>

      {/* Толгой */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-[-0.03em] text-ink leading-tight">
            Сарын тайлан
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Сар бүрийн борлуулалт, ашиг, агуулах нэг дор
            {isCurrent && (
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Энэ сар үргэлжилж байна
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white rounded-full ring-1 ring-ink/[0.08] p-1">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Өмнөх сар"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <label className="relative px-3 h-9 flex items-center text-sm font-medium text-ink cursor-pointer min-w-[150px] justify-center">
              {monthLabel(month)}
              <input
                type="month"
                value={month}
                max={thisMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Сар сонгох"
              />
            </label>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={isCurrent}
              aria-label="Дараагийн сар"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          {!isCurrent && (
            <button
              onClick={() => setMonth(thisMonth())}
              className="h-11 px-4 rounded-full text-sm font-medium text-zinc-600 hover:text-ink hover:bg-white transition-colors"
            >
              Энэ сар
            </button>
          )}
          <button
            onClick={downloadCsv}
            disabled={!data}
            className="h-11 px-4 rounded-full bg-white ring-1 ring-ink/[0.08] hover:ring-ink/25 text-sm font-medium text-ink disabled:opacity-40 inline-flex items-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            disabled={!data}
            className="h-11 px-4 rounded-full bg-ink hover:bg-brand text-white text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Хэвлэх
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger-line rounded-2xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Тоон үзүүлэлт */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading && !data
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-[132px] rounded-[22px] bg-white ring-1 ring-ink/[0.06] animate-pulse" />
            ))
          : kpis.map((k) => (
              <div
                key={k.label}
                className={`relative overflow-hidden rounded-[22px] p-4 sm:p-5 print-avoid ${k.featured ? 'bg-ink text-white print:bg-white print:text-ink print:ring-1 print:ring-zinc-300' : 'bg-white ring-1 ring-ink/[0.06] shadow-card'} ${loading ? 'opacity-60' : ''}`}
              >
                {k.featured && (
                  <div
                    className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 print:hidden"
                    style={{
                      background:
                        'radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 75%, transparent), transparent)',
                    }}
                  />
                )}
                <div
                  className={`relative text-xs sm:text-sm font-medium ${k.featured ? 'text-white/70 print:text-zinc-500' : 'text-zinc-500'}`}
                >
                  {k.label}
                </div>
                <div className="relative mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl sm:text-[30px] font-semibold tabular-nums tracking-tight leading-none">
                    {k.value}
                  </span>
                  {k.unit && (
                    <span className={`text-sm ${k.featured ? 'text-white/60' : 'text-zinc-500'}`}>{k.unit}</span>
                  )}
                </div>
                <div
                  className={`relative text-xs mt-2 ${k.featured ? 'text-white/55 print:text-zinc-500' : 'text-zinc-500'}`}
                >
                  {k.hint}
                </div>
                {k.delta && (
                  <div
                    className={`relative mt-2 ${k.featured ? '[&_*]:!text-white/80 print:[&_*]:!text-zinc-600' : ''}`}
                  >
                    {k.delta}
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Анхааруулга */}
      {data && (noCost.length > 0 || data.has_other_currency) && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 space-y-1 print-avoid">
          {noCost.length > 0 && (
            <p>
              <b>{noCost.length} машинд өртөг бүртгээгүй</b> тул ашиг бодитоос их харагдаж байна:{' '}
              {noCost.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ', '}
                  <Link href={`/vehicles/${r.id}`} className="underline underline-offset-2 print:no-underline">
                    {r.brand} {r.model}
                  </Link>
                </span>
              ))}
              . Машины хуудсанд зардлаа оруулна уу.
            </p>
          )}
          {data.has_other_currency && <p>Төгрөгөөс өөр валютаар бүртгэсэн зардал өртөг, ашгийн тооцоонд ороогүй.</p>}
        </div>
      )}

      {/* Зарагдсан машинууд */}
      {data && (
        <Card
          title={`Зарагдсан машинууд (${data.sold.length})`}
          right={
            data.sold.length > 0 && (
              <span className="text-sm text-zinc-500">
                Ашиг <b className="text-ink tabular-nums">{money(s?.profit)}</b>
              </span>
            )
          }
        >
          {data.sold.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              {monthLabel(month)}д машин зарагдаагүй байна.
            </div>
          ) : (
            <>
              {/* Утас */}
              <ul className="sm:hidden divide-y divide-zinc-100">
                {data.sold.map((r) => (
                  <li key={r.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/vehicles/${r.id}`} className="font-medium text-ink">
                          {r.brand} {r.model} <span className="text-zinc-500 font-normal">{r.year}</span>
                        </Link>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {r.sold_at} · {r.days} хоног · {PAYMENT[r.payment_type || '-']}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums text-ink">{money(r.sale_price)}</div>
                        <div
                          className={`text-xs tabular-nums ${Number(r.profit) >= 0 ? 'text-emerald-700' : 'text-danger'}`}
                        >
                          ашиг {money(r.profit)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Компьютер */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 bg-zinc-50/60">
                      <th className="px-5 py-3">Машин</th>
                      <th className="px-3 py-3">Ирсэн</th>
                      <th className="px-3 py-3">Зарагдсан</th>
                      <th className="px-3 py-3 text-right">Хоног</th>
                      <th className="px-3 py-3 text-right">Өртөг</th>
                      <th className="px-3 py-3 text-right">Зарсан үнэ</th>
                      <th className="px-3 py-3 text-right">Ашиг</th>
                      <th className="px-3 py-3">Төлбөр</th>
                      <th className="px-5 py-3">Худалдан авагч</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sold.map((r) => {
                      const profit = Number(r.profit),
                        price = Number(r.sale_price);
                      return (
                        <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <Link href={`/vehicles/${r.id}`} className="font-medium text-ink hover:text-brand">
                              {r.brand} {r.model}
                            </Link>{' '}
                            <span className="text-zinc-500">{r.year}</span>
                          </td>
                          <td className="px-3 py-3 tabular-nums text-zinc-600 whitespace-nowrap">{r.arrived_at}</td>
                          <td className="px-3 py-3 tabular-nums text-zinc-600 whitespace-nowrap">{r.sold_at}</td>
                          <td className="px-3 py-3 tabular-nums text-right text-zinc-600">{r.days}</td>
                          <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">
                            {Number(r.cost) === 0 ? <span className="text-amber-700">Бүртгээгүй</span> : money(r.cost)}
                          </td>
                          <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap font-medium text-ink">
                            {money(price)}
                          </td>
                          <td
                            className={`px-3 py-3 tabular-nums text-right whitespace-nowrap font-medium ${profit >= 0 ? 'text-emerald-700' : 'text-danger'}`}
                          >
                            {money(profit)}{' '}
                            <span className="text-xs text-zinc-500 font-normal">
                              {price ? `${Math.round((profit / price) * 100)}%` : ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
                            {PAYMENT[r.payment_type || '-']}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-zinc-600">
                            {r.customer_name || '—'}
                            {r.customer_phone ? <span className="text-zinc-400"> · {r.customer_phone}</span> : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-200 font-semibold text-ink">
                      <td className="px-5 py-3" colSpan={4}>
                        Нийт · {data.sold.length} машин
                      </td>
                      <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">{money(s?.cost)}</td>
                      <td className="px-3 py-3 tabular-nums text-right whitespace-nowrap">{money(s?.revenue)}</td>
                      <td
                        className={`px-3 py-3 tabular-nums text-right whitespace-nowrap ${(s?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-danger'}`}
                      >
                        {money(s?.profit)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Задаргаа */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <Card title="Төлбөрийн хэлбэрээр">
            <Bars
              empty="Борлуулалт байхгүй"
              items={data.by_payment.map((g) => ({
                label: PAYMENT[g.key] || g.key,
                value: g.revenue,
                sub: `${g.count} машин · ашиг ${compact(g.profit)}`,
              }))}
            />
          </Card>
          <Card title="Маркаар">
            <Bars
              empty="Борлуулалт байхгүй"
              items={data.by_brand.map((g) => ({
                label: g.key,
                value: g.revenue,
                sub: `${g.count} машин · ашиг ${compact(g.profit)}`,
              }))}
            />
          </Card>
          <Card title="Энэ сарын зардал" right={<span className="text-xs text-zinc-500">Бүртгэсэн огноогоор</span>}>
            <Bars
              empty="Энэ сард зардал бүртгээгүй"
              items={data.expenses.map((e) => ({
                label: `${COST_TYPE[e.cost_type] || e.cost_type}${e.currency !== 'MNT' ? ` (${e.currency})` : ''}`,
                value: e.amount,
                sub: `${e.count} бичилт`,
              }))}
            />
          </Card>
        </div>
      )}

      {/* Шинээр ирсэн */}
      {data && (
        <Card
          title={`Шинээр ирсэн машинууд (${data.arrived.length})`}
          right={
            data.arrived.length > 0 && (
              <span className="text-sm text-zinc-500">
                Өртөг <b className="text-ink tabular-nums">{money(s?.arrived_cost)}</b>
              </span>
            )
          }
        >
          {data.arrived.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">{monthLabel(month)}д шинэ машин ирээгүй.</div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.arrived.map((r) => (
                <li key={r.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/vehicles/${r.id}`} className="font-medium text-ink hover:text-brand">
                      {r.brand} {r.model}
                    </Link>{' '}
                    <span className="text-zinc-500">{r.year}</span>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {r.arrived_at} · {STATUS[r.status] || r.status}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-ink">
                      {Number(r.cost) ? money(r.cost) : <span className="text-amber-700">Өртөг бүртгээгүй</span>}
                    </div>
                    {r.price && <div className="text-xs text-zinc-500">зарах үнэ {money(r.price)}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Жилийн тойм */}
      <Card
        title={`${yearNum} оны тойм, сар сараар`}
        right={
          <div className="flex items-center gap-1 print:hidden">
            <button
              onClick={() => setMonth(`${yearNum - 1}-12`)}
              className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center"
              aria-label="Өмнөх он"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() =>
                setMonth(yearNum + 1 >= Number(thisMonth().slice(0, 4)) ? thisMonth() : `${yearNum + 1}-12`)
              }
              disabled={yearNum >= Number(thisMonth().slice(0, 4))}
              className="w-8 h-8 rounded-full hover:bg-zinc-100 disabled:opacity-30 flex items-center justify-center"
              aria-label="Дараагийн он"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        }
      >
        {!year ? (
          <div className="h-40 animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 bg-zinc-50/60">
                  <th className="px-5 py-3">Сар</th>
                  <th className="px-3 py-3 text-right">Ирсэн</th>
                  <th className="px-3 py-3 text-right">Зарагдсан</th>
                  <th className="px-3 py-3 text-right">Орлого</th>
                  <th className="px-3 py-3 text-right">Ашиг</th>
                  <th className="px-5 py-3 hidden md:table-cell w-[30%]" />
                </tr>
              </thead>
              <tbody>
                {year.months.map((m) => {
                  const active = m.month === month;
                  const future = m.month > thisMonth();
                  return (
                    <tr
                      key={m.month}
                      onClick={() => !future && setMonth(m.month)}
                      className={`border-t border-zinc-100 ${future ? 'text-zinc-300' : 'cursor-pointer hover:bg-zinc-50'} ${active ? 'bg-brand-soft/70' : ''}`}
                    >
                      <td
                        className={`px-5 py-2.5 whitespace-nowrap ${active ? 'font-semibold text-brand' : 'text-ink'}`}
                      >
                        {shortMonth(m.month)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{m.arrived || '·'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{m.sold || '·'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                        {m.revenue ? compact(m.revenue) : '·'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${m.profit < 0 ? 'text-danger' : ''}`}
                      >
                        {m.profit ? compact(m.profit) : '·'}
                      </td>
                      <td className="px-5 py-2.5 hidden md:table-cell">
                        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                          {m.revenue > 0 && (
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${(m.revenue / maxYearRevenue) * 100}%` }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-200 font-semibold text-ink">
                  <td className="px-5 py-3">Нийт</td>
                  <td className="px-3 py-3 text-right tabular-nums">{year.total.arrived}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{year.total.sold}</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{compact(year.total.revenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{compact(year.total.profit)}</td>
                  <td className="hidden md:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-zinc-500 px-1 print:hidden">
        Ашиг = зарсан үнэ − тухайн машинд бүртгэсэн бүх зардал (худалдан авалт, тээвэр, гааль, засвар г.м.). Зөвхөн
        төгрөгийн зардал тооцогдоно.
      </p>
    </div>
  );
}
