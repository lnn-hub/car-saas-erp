'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SalesChart } from '@/components/admin/SalesChart';

interface Summary { total_sold: string; total_revenue: string; total_profit: string; avg_profit: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; status: string; total_cost: string; created_at: string; }

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ARRIVED:   { label: 'Ирсэн',       bg: 'bg-zinc-50',   text: 'text-zinc-600',   dot: 'bg-zinc-400' },
  PUBLISHED: { label: 'Зарагдах',    bg: 'bg-brand-soft',    text: 'text-brand',    dot: 'bg-brand' },
  RESERVED:  { label: 'Захиалга',    bg: 'bg-zinc-50',  text: 'text-zinc-800',  dot: 'bg-zinc-700' },
  SOLD:      { label: 'Зарагдсан',   bg: 'bg-zinc-50', text: 'text-[#111]', dot: 'bg-zinc-300' },
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

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-[1500px] mx-auto w-full">

      {/* Banner */}
      <div className="relative bg-[#111] text-white overflow-hidden rounded-sm border-l-4 border-brand px-5 sm:px-8 py-6 sm:py-8">
        <div className="pointer-events-none select-none absolute -right-2 -bottom-6 text-[90px] sm:text-[150px] font-medium text-white/[0.04] leading-none">
          ADMIN
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-brand-light mb-2">Админ самбар</div>
            <h1 className="text-xl sm:text-3xl font-bold leading-tight">{greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}!</h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5 hidden sm:block">Өнөөдрийн борлуулалт, агуулахын байдал</p>
          </div>
          <Link href="/vehicles/new"
            className="flex items-center gap-2 bg-brand hover:bg-white hover:text-[#111] text-white text-sm px-4 sm:px-6 py-3 rounded-sm transition-colors shrink-0 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="hidden sm:inline">Машин нэмэх</span>
            <span className="sm:hidden">Нэмэх</span>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Нийт борлуулалт', value: `${summary?.total_sold ?? 0}`, unit: 'машин',    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg> },
          { label: 'Нийт орлого',     value: fmt(summary?.total_revenue ?? 0), unit: '', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
          { label: 'Цэвэр ашиг',      value: fmt(summary?.total_profit ?? 0),  unit: '',  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
          { label: 'Агуулахын үнэ',   value: fmt(totalCost),                   unit: `${inStock} машин`,   icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
        ].map(c => (
          <div key={c.label} className="rounded-sm bg-white border border-zinc-200 border-t-[3px] border-t-brand px-3 sm:px-5 py-3 sm:py-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#71717a] sm:tracking-[0.15em] leading-tight">{c.label}</span>
              <span className="w-8 h-8 rounded-sm bg-brand-soft text-brand flex items-center justify-center">{c.icon}</span>
            </div>
            {(c.label === 'Агуулахын үнэ' ? !vLoaded : summary === null) ? (
              <div className="h-6 sm:h-7 w-24 rounded bg-[#f4f4f5] animate-pulse" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold tabular-nums leading-none text-[#111]">{c.value}</div>
            )}
            {c.unit && <div className="text-xs text-[#71717a] mt-1.5">{c.unit}</div>}
          </div>
        ))}
      </div>

      <SalesChart sales={sales} />

      {/* Status overview */}
      <div className="bg-white rounded-xl border border-[#e4e4e7] overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#e4e4e7]">
          <span className="text-xs font-medium text-[#09090b]">Агуулахын байдал</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#f4f4f5]">
          {Object.entries(STATUS).map(([key, val]) => (
            <Link key={key} href={`/vehicles?status=${key}`}
              className="px-5 py-4 hover:bg-[#fafafa] transition-colors">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[#a1a1aa]">{STATUS_ICONS[key]}</span>
                <span className="text-xs text-[#71717a]">{val.label}</span>
              </div>
              <div className="text-2xl font-bold text-[#09090b] tabular-nums">{counts[key as keyof typeof counts]}</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1.5 ${val.bg} ${val.text}`}>
                {key === 'SOLD' ? 'зарагдсан' : 'агуулахад'}
              </div>
            </Link>
          ))}
        </div>
        {/* Progress bar */}
        <div className="flex h-1.5">
          {[
            { key: 'ARRIVED',   color: 'bg-zinc-400' },
            { key: 'PUBLISHED', color: 'bg-brand' },
            { key: 'RESERVED',  color: 'bg-zinc-700' },
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
        <div className="bg-white rounded-xl border border-[#e4e4e7] overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[#e4e4e7] flex items-center justify-between">
            <span className="text-xs font-medium text-[#09090b]">Сүүлд нэмэгдсэн</span>
            <Link href="/vehicles" className="text-xs text-[#a1a1aa] hover:text-[#09090b] transition-colors font-medium">
              Бүгд →
            </Link>
          </div>
          <div className="divide-y divide-[#f4f4f5]">
            {recent.map(v => (
              <Link key={v.id} href={`/vehicles/${v.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#fafafa] transition-colors group">
                {/* Car avatar */}
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#09090b]">{v.brand} {v.model} <span className="text-[#a1a1aa] font-normal">{v.year}</span></div>
                  <div className="text-xs text-[#a1a1aa]">{fmtDate(v.created_at)}</div>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS[v.status]?.bg} ${STATUS[v.status]?.text}`}>
                  <span className={`w-1 h-1 rounded-full ${STATUS[v.status]?.dot}`} />
                  {STATUS[v.status]?.label}
                </span>
              </Link>
            ))}
            {!vLoaded && [0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] animate-pulse" />
                <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-[#f4f4f5] animate-pulse" /><div className="h-3 w-20 rounded bg-[#f4f4f5] animate-pulse" /></div>
              </div>
            ))}
            {vLoaded && recent.length === 0 && (
              <div className="text-center px-5 py-10">
                <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                </div>
                <div className="text-sm font-medium text-[#09090b]">Машин байхгүй байна</div>
                <div className="text-xs text-[#a1a1aa] mt-1 mb-4">Эхний машиноо нэмээд вэбсайтад нийтэлнэ үү</div>
                <Link href="/vehicles/new" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">Машин нэмэх</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#e4e4e7] p-4 shadow-sm">
            <div className="text-xs font-medium text-[#a1a1aa] mb-3">Хурдан үйлдэл</div>
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
                      : 'text-[#52525b] hover:bg-[#f4f4f5] hover:text-[#09090b]'
                  }`}>
                  {label}
                  {!primary && <svg className="w-3 h-3 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>}
                </Link>
              ))}
            </div>
          </div>

          {/* Mini stat */}
          <div className="bg-white rounded-xl border border-[#e4e4e7] p-4 shadow-sm">
            <div className="text-xs font-medium text-[#a1a1aa] mb-3">Нэгж дундаж</div>
            <div className="space-y-2.5">
              {[
                { label: 'Нэг машины ашиг', value: fmt(summary?.avg_profit ?? 0) },
                { label: 'Агуулахад',        value: `${inStock} машин` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#71717a]">{label}</span>
                  <span className="text-sm font-bold text-[#09090b] tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
