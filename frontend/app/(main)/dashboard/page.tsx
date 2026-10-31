'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SalesChart } from '@/components/admin/SalesChart';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; created_at: string; }

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ARRIVED:   { label: 'Ирсэн',       bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  PUBLISHED: { label: 'Зарагдах',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  RESERVED:  { label: 'Захиалга',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  SOLD:      { label: 'Зарагдсан',   bg: 'bg-zinc-100',   text: 'text-zinc-600',    dot: 'bg-zinc-400' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  ARRIVED:   <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  PUBLISHED: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  RESERVED:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  SOLD:      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="20 6 9 17 4 12"/></svg>,
};

function fmt(n: string | number | null) {
  if (n == null) return '—';
  const num = Number(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' тэр₮';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}
function fmtDate(d: string) {
  const dt = new Date(d);
  const days = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];
  return `${days[dt.getDay()]} ${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
}

export default function DashboardPage() {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vLoaded, setVLoaded] = useState(false);
  const [sales, setSales]     = useState<{ sold_at: string; sale_price: string }[] | null>(null);
  const [userName, setUserName] = useState('');
  const [hour, setHour]         = useState(0);

  useEffect(() => {
    setHour(new Date().getHours());
    api.getSummary().then(setSummary).catch(console.error);
    api.getVehicles().then(d => { setVehicles(d); setVLoaded(true); }).catch(() => setVLoaded(true));
    api.getSales().then(setSales).catch(() => setSales([]));
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(u.name || '');
  }, []);

  const counts = { ARRIVED: 0, PUBLISHED: 0, RESERVED: 0, SOLD: 0 };
  vehicles.forEach(v => { if (v.status in counts) counts[v.status as keyof typeof counts]++; });
  const inStock    = vehicles.filter(v => v.status !== 'SOLD').length;
  const totalCost  = vehicles.reduce((s, v) => s + Number(v.total_cost), 0);
  const recent     = vehicles.slice(0, 6);

  const greeting = hour < 12 ? 'Өглөөний мэнд' : hour < 17 ? 'Өдрийн мэнд' : 'Оройн мэнд';
  const now = new Date();
  const today = `${now.getFullYear()} оны ${now.getMonth() + 1}-р сарын ${now.getDate()}, ${['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'][now.getDay()]}`;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-[1500px] mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <div className="text-sm text-zinc-500" suppressHydrationWarning>{today}</div>
          <h1 className="font-display text-[28px] sm:text-4xl font-semibold tracking-[-0.03em] text-ink mt-1 leading-tight">
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white ring-1 ring-ink/[0.08] hover:ring-ink/25 text-sm font-medium text-ink transition-all">
            Вэбсайт үзэх
          </a>
          <Link href="/vehicles/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-ink hover:bg-brand text-white text-sm font-medium transition-colors flex-1 sm:flex-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Машин нэмэх
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Цэвэр ашиг',      value: fmt(summary?.total_profit ?? 0),  unit: summary ? `Дундаж ${fmt(summary.avg_profit ?? 0)} / машин` : '', featured: true, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
          { label: 'Нийт орлого',     value: fmt(summary?.total_revenue ?? 0), unit: 'Борлуулалтаас', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
          { label: 'Зарагдсан',       value: `${summary?.total_sold ?? 0}`, unit: 'машин',    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg> },
          { label: 'Агуулахын өртөг', value: fmt(totalCost),                   unit: `${inStock} машин агуулахад`, stock: true, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
        ].map(c => (
          <div key={c.label} className={`relative overflow-hidden rounded-[22px] p-4 sm:p-5 ${c.featured ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/[0.06] shadow-card'}`}>
            {c.featured && <div className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 rounded-full bg-brand/70 blur-3xl" />}
            <div className="relative flex items-center justify-between mb-5 sm:mb-6">
              <span className={`text-xs sm:text-sm font-medium ${c.featured ? 'text-white/70' : 'text-zinc-500'}`}>{c.label}</span>
              <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${c.featured ? 'bg-white/10 text-white' : 'bg-zinc-100 text-ink'}`}>{c.icon}</span>
            </div>
            {(c.stock ? !vLoaded : summary === null) ? (
              <div className={`relative h-8 w-24 rounded-lg animate-pulse ${c.featured ? 'bg-white/10' : 'bg-zinc-100'}`} />
            ) : (
              <div className="relative font-display text-2xl sm:text-[32px] font-semibold tabular-nums leading-none tracking-tight">{c.value}</div>
            )}
            {c.unit && <div className={`relative text-xs mt-2 truncate ${c.featured ? 'text-white/55' : 'text-zinc-500'}`}>{c.unit}</div>}
          </div>
        ))}
      </div>

      <SalesChart sales={sales} />

      {/* Status overview */}
      <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] overflow-hidden shadow-card">
        <div className="px-5 py-3.5 border-b border-[#e6e0d8]">
          <span className="text-xs font-medium text-[#1c1917]">Агуулахын байдал</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#f3efe9]">
          {Object.entries(STATUS).map(([key, val]) => (
            <Link key={key} href={`/vehicles?status=${key}`}
              className="px-5 py-4 hover:bg-[#faf8f5] transition-colors">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[#6f6a64]">{STATUS_ICONS[key]}</span>
                <span className="text-xs text-[#5f5a54]">{val.label}</span>
              </div>
              <div className="text-2xl font-bold text-[#1c1917] tabular-nums">{counts[key as keyof typeof counts]}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1.5 ${val.bg} ${val.text}`}>
                {key === 'SOLD' ? 'зарагдсан' : 'агуулахад'}
              </div>
            </Link>
          ))}
        </div>
        {/* Progress bar */}
        <div className="flex h-1.5">
          {[
            { key: 'ARRIVED',   color: 'bg-sky-500' },
            { key: 'PUBLISHED', color: 'bg-emerald-500' },
            { key: 'RESERVED',  color: 'bg-amber-400' },
            { key: 'SOLD',      color: 'bg-zinc-300' },
          ].map(({ key, color }) => {
            const pct = vehicles.length ? (counts[key as keyof typeof counts] / vehicles.length) * 100 : 0;
            return <div key={key} className={`${color} transition-all`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {/* Bottom: recent + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Recent vehicles */}
        <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] overflow-hidden shadow-card">
          <div className="px-5 py-3.5 border-b border-[#e6e0d8] flex items-center justify-between">
            <span className="text-xs font-medium text-[#1c1917]">Сүүлд нэмэгдсэн</span>
            <Link href="/vehicles" className="text-xs text-[#6f6a64] hover:text-[#1c1917] transition-colors font-medium px-3 py-2.5 -mr-3">
              Бүгд →
            </Link>
          </div>
          <div className="divide-y divide-[#f3efe9]">
            {recent.map(v => (
              <Link key={v.id} href={`/vehicles/${v.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#faf8f5] transition-colors group">
                {/* Car avatar */}
                <div className="w-9 h-9 rounded-lg bg-[#f3efe9] flex items-center justify-center shrink-0 text-[#6f6a64]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1c1917]">{v.brand} {v.model} <span className="text-[#6f6a64] font-normal">{v.year}</span></div>
                  <div className="text-xs text-[#6f6a64]">{fmtDate(v.created_at)}</div>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS[v.status]?.bg} ${STATUS[v.status]?.text}`}>
                  <span className={`w-1 h-1 rounded-full ${STATUS[v.status]?.dot}`} />
                  {STATUS[v.status]?.label}
                </span>
              </Link>
            ))}
            {!vLoaded && [0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="w-9 h-9 rounded-lg bg-[#f3efe9] animate-pulse" />
                <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-[#f3efe9] animate-pulse" /><div className="h-3 w-20 rounded bg-[#f3efe9] animate-pulse" /></div>
              </div>
            ))}
            {vLoaded && recent.length === 0 && (
              <div className="text-center px-5 py-10">
                <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                </div>
                <div className="text-sm font-medium text-[#1c1917]">Машин байхгүй байна</div>
                <div className="text-xs text-[#6f6a64] mt-1 mb-4">Эхний машиноо нэмээд вэбсайтад нийтэлнэ үү</div>
                <Link href="/vehicles/new" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">Машин нэмэх</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] p-4 shadow-card">
            <div className="text-xs font-medium text-[#6f6a64] mb-3">Хурдан үйлдэл</div>
            <div className="space-y-1.5">
              {[
                { href: '/vehicles/new', label: 'Машин нэмэх',  primary: true },
                { href: '/vehicles',     label: 'Агуулах',       primary: false },
                { href: '/sales',        label: 'Борлуулалт',    primary: false },
                { href: '/settings',     label: 'Тохиргоо',      primary: false },
              ].map(({ href, label, primary }) => (
                <Link key={href} href={href}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                    primary
                      ? 'bg-brand text-white font-medium hover:bg-brand-dark'
                      : 'text-[#46413c] hover:bg-[#f3efe9] hover:text-[#1c1917]'
                  }`}>
                  {label}
                  {!primary && <svg className="w-3 h-3 text-[#d4ccc2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>}
                </Link>
              ))}
            </div>
          </div>

          {/* Mini stat */}
          <div className="bg-white rounded-[22px] ring-1 ring-ink/[0.06] p-4 shadow-card">
            <div className="text-xs font-medium text-[#6f6a64] mb-3">Нэгж дундаж</div>
            <div className="space-y-2.5">
              {[
                { label: 'Нэг машины ашиг', value: fmt(summary?.avg_profit ?? 0) },
                { label: 'Агуулахад',        value: `${inStock} машин` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#5f5a54]">{label}</span>
                  <span className="text-sm font-bold text-[#1c1917] tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
