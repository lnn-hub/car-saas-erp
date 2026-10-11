'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Vehicle {
  id: string; brand: string; model: string; year: number;
  mileage: number; color: string; status: string; total_cost: string; vin: string;
}

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  ARRIVED:   { label: 'Ирсэн',        dot: 'bg-amber-400',   text: 'text-amber-600' },
  PUBLISHED: { label: 'Нийтлэгдсэн',  dot: 'bg-blue-400',    text: 'text-blue-600' },
  RESERVED:  { label: 'Захиалгатай',  dot: 'bg-violet-400',  text: 'text-violet-600' },
  SOLD:      { label: 'Зарагдсан',    dot: 'bg-emerald-400', text: 'text-emerald-600' },
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
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getVehicles().then(d => { setVehicles(d); setLoading(false); }).catch(console.error);
  }, []);

  function toggleStatus(s: string) {
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

  const grouped = useMemo(() => {
    const map: Record<string, Vehicle[]> = {};
    filtered.forEach(v => {
      if (!map[v.brand]) map[v.brand] = [];
      map[v.brand].push(v);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const totalValue = filtered.reduce((s, v) => s + Number(v.total_cost), 0);
  const soldCount  = filtered.filter(v => v.status === 'SOLD').length;
  const inStock    = filtered.filter(v => v.status !== 'SOLD').length;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-[#e4e4e7] bg-white flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-[#09090b] leading-none">Машинууд</h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            {inStock} агуулахад &middot; {soldCount} зарагдсан &middot; нийт өртөг {fmt(totalValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Хайх... (марк, загвар, VIN)"
              className="bg-white border border-[#e4e4e7] rounded-md pl-8 pr-3 py-1.5 text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#09090b] w-64 transition-colors"
            />
          </div>
          {/* Status filters */}
          <div className="flex gap-1">
            {ALL_STATUSES.map(s => (
              <button key={s} onClick={() => toggleStatus(s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
                  statusFilter.includes(s)
                    ? 'border-[#d4d4d8] bg-[#f4f4f5] text-[#09090b]'
                    : 'border-transparent text-[#a1a1aa] hover:text-[#71717a]'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS[s].dot}`} />
                {STATUS[s].label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-[#e4e4e7]" />
          <Link href="/vehicles/new"
            className="flex items-center gap-1.5 bg-[#09090b] hover:bg-[#27272a] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
            Нэмэх
          </Link>
        </div>
      </div>

      {/* Table header */}
      <div className="px-6 border-b border-[#e4e4e7] bg-white shrink-0">
        <div className="grid grid-cols-[1fr_100px_80px_110px_130px_32px] gap-3 py-2.5 text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
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
          <div className="flex items-center justify-center h-32 text-[#a1a1aa] text-sm">Ачааллаж байна...</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#a1a1aa]">
            <div className="text-sm mb-1">Машин олдсонгүй</div>
            {(search || statusFilter.length > 0) && (
              <button onClick={() => { setSearch(''); setStatusFilter([]); }} className="text-xs text-[#a1a1aa] hover:text-[#09090b] transition-colors mt-1">
                Шүүлтүүр арилгах
              </button>
            )}
          </div>
        ) : (
          grouped.map(([brand, brandVehicles]) => {
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
                          className={`grid grid-cols-[1fr_100px_80px_110px_130px_32px] gap-3 px-6 py-2.5 items-center hover:bg-[#fafafa] transition-colors group border-t ${i === 0 ? 'border-[#e4e4e7]' : 'border-[#f4f4f5]'}`}>
                          <div className="min-w-0">
                            <span className="text-sm text-[#09090b] font-medium">{v.model}</span>
                            <span className="text-sm text-[#a1a1aa] ml-2">{v.year}</span>
                            <span className="text-xs text-[#d4d4d8] ml-3 font-mono">{v.vin.slice(-6)}</span>
                          </div>
                          <span className="text-sm text-[#71717a] tabular-nums">{v.mileage.toLocaleString()} км</span>
                          <span className="text-sm text-[#71717a]">{v.color || '—'}</span>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[v.status]?.dot}`} />
                            <span className={`text-xs ${STATUS[v.status]?.text}`}>{STATUS[v.status]?.label}</span>
                          </span>
                          <span className="text-sm text-[#71717a] tabular-nums text-right">{fmt(v.total_cost)}</span>
                          <svg className="w-3.5 h-3.5 text-[#d4d4d8] group-hover:text-[#a1a1aa] transition-colors ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
