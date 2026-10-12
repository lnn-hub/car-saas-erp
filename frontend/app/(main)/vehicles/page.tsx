'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  mileage: number; color: string; status: string; total_cost: string; vin: string;
}

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-zinc-400',   text: 'text-zinc-600' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-brand',    text: 'text-brand' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-zinc-700',  text: 'text-zinc-800' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-zinc-300', text: 'text-[#111]' },
};
const ALL_STATUSES = ['ARRIVED', 'PUBLISHED', 'RESERVED', 'SOLD'];

function fmt(n: string | number) { return Number(n).toLocaleString('mn-MN') + '₮'; }

const BRAND_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#84cc16'];
function brandColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ARRIVED', 'PUBLISHED', 'RESERVED']);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    api.getVehicles().then(d => { setVehicles(d); setLoading(false); }).catch(console.error);
  }, []);

  function toggleStatus(s: string) {
    setPage(1);
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function toggleBrand(brand: string) {
    setCollapsed(prev => ({ ...prev, [brand]: !prev[brand] }));
  }

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(v.status);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        String(v.year).includes(q);
      return matchStatus && matchSearch;
    });
  }, [vehicles, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagedGrouped = useMemo(() => {
    const map: Record<string, Vehicle[]> = {};
    pagedFiltered.forEach(v => {
      if (!map[v.brand]) map[v.brand] = [];
      map[v.brand].push(v);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [pagedFiltered]);

  const totalValue = filtered.reduce((s, v) => s + Number(v.total_cost), 0);
  const soldCount  = filtered.filter(v => v.status === 'SOLD').length;
  const inStock    = filtered.filter(v => v.status !== 'SOLD').length;

  return (
    <div className="flex flex-col h-[100dvh] lg:h-screen overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-[#e4e4e7] bg-white shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold text-[#09090b] leading-none">Машинууд</h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5 hidden sm:block">
              {inStock} агуулахад &middot; {soldCount} зарагдсан &middot; {fmt(totalValue)}
            </p>
          </div>
          <Link href="/vehicles/new"
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden sm:inline">Нэмэх</span>
            <span className="sm:hidden">+</span>
          </Link>
        </div>
        {/* Search + filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{scrollbarWidth:'none'}}>
          <div className="relative shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Хайх..."
              className="bg-white border border-[#e4e4e7] rounded-md pl-8 pr-3 py-1.5 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-brand w-36 sm:w-52 transition-colors" />
          </div>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => toggleStatus(s)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors border ${
                statusFilter.includes(s)
                  ? 'border-[#d4d4d8] bg-[#f4f4f5] text-[#09090b]'
                  : 'border-transparent text-[#a1a1aa]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS[s].dot}`} />
              <span className="hidden sm:inline">{STATUS[s].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table header — desktop only */}
      <div className="hidden sm:block px-6 border-b border-[#e4e4e7] bg-white shrink-0">
        <div className="grid grid-cols-[1fr_100px_80px_110px_130px_32px] gap-3 py-2.5 text-xs font-medium text-[#a1a1aa]">
          <span>Машин</span>
          <span>Гүйлт</span>
          <span>Өнгө</span>
          <span>Статус</span>
          <span className="text-right">Нийт өртөг</span>
          <span />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-[#f4f4f5]">{[0, 1, 2, 3, 4].map(i => (<div key={i} className="flex items-center gap-4 px-6 py-3.5"><div className="h-4 w-44 rounded bg-[#f4f4f5] animate-pulse" /><div className="h-3 w-16 rounded bg-[#f4f4f5] animate-pulse ml-auto" /></div>))}</div>
        ) : pagedGrouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
            </div>
            <div className="text-sm font-medium text-[#09090b]">Машин олдсонгүй</div>
            {(search || statusFilter.length > 0) ? (
              <button onClick={() => { setSearch(''); setStatusFilter([]); }} className="text-sm text-brand hover:text-brand-dark transition-colors mt-2">
                Шүүлтүүр арилгах
              </button>
            ) : (
              <Link href="/vehicles/new" className="mt-3 inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">Машин нэмэх</Link>
            )}
          </div>
        ) : (
          pagedGrouped.map(([brand, brandVehicles]) => {
            const isOpen = collapsed[brand] !== true;
            const brandTotal = brandVehicles.reduce((s, v) => s + Number(v.total_cost), 0);
            const color = brandColor(brand);
            const statusBreakdown = ALL_STATUSES.filter(s => brandVehicles.some(v => v.status === s));

            return (
              <div key={brand} className="border-b border-[#f4f4f5]">
                {/* Brand header row */}
                <button
                  onClick={() => toggleBrand(brand)}
                  className="w-full px-6 py-3 flex items-center gap-3 hover:bg-[#fafafa] transition-colors text-left"
                >
                  <svg className={`w-3.5 h-3.5 text-[#a1a1aa] transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}>
                    {brand.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-[#09090b]">{brand}</span>
                  <span className="text-xs text-[#a1a1aa]">{brandVehicles.length} машин</span>
                  <div className="flex gap-1.5 ml-1">
                    {statusBreakdown.map(s => (
                      <span key={s} className="flex items-center gap-1 text-[10px] text-[#a1a1aa]">
                        <span className={`w-1 h-1 rounded-full ${STATUS[s].dot}`} />
                        {brandVehicles.filter(v => v.status === s).length}
                      </span>
                    ))}
                  </div>
                  <span className="ml-auto text-xs text-[#a1a1aa] tabular-nums">{fmt(brandTotal)}</span>
                </button>

                {/* Vehicle rows */}
                {isOpen && (
                  <div>
                    {brandVehicles
                      .sort((a, b) => {
                        const order = { ARRIVED: 0, PUBLISHED: 1, RESERVED: 2, SOLD: 3 };
                        return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9) || b.year - a.year;
                      })
                      .map((v, i) => (
                        <Link key={v.id} href={`/vehicles/${v.id}`}
                          className={`flex sm:grid sm:grid-cols-[1fr_100px_80px_110px_130px_32px] gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-2.5 items-center hover:bg-[#fafafa] active:bg-[#f4f4f5] transition-colors group border-t ${i === 0 ? 'border-[#e4e4e7]' : 'border-[#f4f4f5]'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-[#09090b] font-medium">{v.model}</span>
                              <span className="text-xs text-[#a1a1aa]">{v.year}</span>
                              <span className="hidden sm:inline text-xs text-[#d4d4d8] font-mono">{v.vin.slice(-6)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[v.status]?.dot}`} />
                              <span className={`text-xs ${STATUS[v.status]?.text}`}>{STATUS[v.status]?.label}</span>
                              <span className="text-xs text-[#a1a1aa]">{v.mileage.toLocaleString()} км</span>
                            </div>
                          </div>
                          <span className="hidden sm:block text-sm text-[#71717a] tabular-nums">{v.mileage.toLocaleString()} км</span>
                          <span className="hidden sm:block text-sm text-[#71717a]">{v.color || '—'}</span>
                          <span className="hidden sm:flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[v.status]?.dot}`} />
                            <span className={`text-xs ${STATUS[v.status]?.text}`}>{STATUS[v.status]?.label}</span>
                          </span>
                          <span className="text-sm text-[#71717a] tabular-nums text-right shrink-0">{fmt(v.total_cost)}</span>
                          <svg className="w-3.5 h-3.5 text-[#d4d4d8] group-hover:text-[#a1a1aa] shrink-0 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#f4f4f5] bg-white shrink-0">
            <span className="text-xs text-[#a1a1aa]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} машин
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f4f4f5] disabled:opacity-30 transition-colors text-[#71717a]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => typeof p === 'string' ? (
                  <span key={i} className="w-7 text-center text-xs text-[#a1a1aa]">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded text-xs transition-colors ${page === p ? 'bg-brand text-white' : 'hover:bg-[#f4f4f5] text-[#71717a]'}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f4f4f5] disabled:opacity-30 transition-colors text-[#71717a]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
