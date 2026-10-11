'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SLUG     = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'mongol-auto';

interface Company {
  name: string; phone: string; address: string; logo_url: string | null;
}
interface Vehicle {
  id: string; brand: string; model: string; year: number;
  color: string; fuel_type: string; transmission: string;
  engine_cc: string; mileage: number; has_plates: boolean;
  total_cost: string | null; main_image: string | null;
}

const FUEL: Record<string, string> = {
  PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан',
};

function fmt(n: string | number | null) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}

function HomeContent() {
  const [company, setCompany]   = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [fuelFilter, setFuelFilter] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/api/public/${SLUG}`).then(r => r.json()),
      fetch(`${BACKEND}/api/public/${SLUG}/vehicles`).then(r => r.json()),
    ]).then(([comp, data]) => {
      if (!comp.error) setCompany(comp);
      setVehicles(data.vehicles || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchQ = !q || `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q);
    const matchF = !fuelFilter || v.fuel_type === fuelFilter;
    return matchQ && matchF;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e4e7] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="лого" className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#09090b] flex items-center justify-center">
                <span className="text-white text-sm font-bold">{company?.name?.[0] || 'A'}</span>
              </div>
            )}
            <div>
              <div className="font-bold text-[#09090b]">{company?.name || 'AutoDealer'}</div>
              {company?.address && <div className="text-xs text-[#a1a1aa]">{company.address}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {company?.phone && (
              <a href={`tel:${company.phone}`}
                className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#09090b] hover:text-[#71717a] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                {company.phone}
              </a>
            )}
            {company?.phone && (
              <a href={`tel:${company.phone}`}
                className="sm:hidden flex items-center gap-2 bg-[#09090b] text-white text-sm font-medium px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Залгах
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#09090b] text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Зарагдаж буй машинууд</h1>
          <p className="text-[#a1a1aa] text-sm mb-8">Чанартай, найдвартай машинуудыг сонгоорой</p>

          {/* Search */}
          <div className="max-w-lg mx-auto flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Марк, загвар хайх..."
                className="w-full bg-white text-[#09090b] pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none" />
            </div>
            <select value={fuelFilter} onChange={e => setFuelFilter(e.target.value)}
              className="bg-white text-[#09090b] px-3 py-2.5 rounded-lg text-sm focus:outline-none">
              <option value="">Бүх түлш</option>
              {Object.entries(FUEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-[#a1a1aa] text-sm">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-12 h-12 mx-auto mb-3 text-[#e4e4e7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
            <p className="text-[#a1a1aa] text-sm">Машин байхгүй байна</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#a1a1aa] mb-5">{filtered.length} машин байна</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(v => (
                <Link key={v.id} href={`/vehicle/${v.id}`}
                  className="group bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                  {/* Image */}
                  <div className="aspect-[4/3] bg-[#f4f4f5] overflow-hidden flex items-center justify-center">
                    {v.main_image ? (
                      <img src={v.main_image} alt={`${v.brand} ${v.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <svg className="w-14 h-14 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="font-bold text-[#09090b]">
                      {v.brand} {v.model}
                      <span className="text-[#a1a1aa] font-normal ml-1.5 text-sm">{v.year}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {[
                        FUEL[v.fuel_type],
                        v.transmission === 'AUTO' ? 'Автомат' : 'Механик',
                        v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : null,
                        v.mileage > 0 ? `${Number(v.mileage).toLocaleString()} км` : null,
                        v.has_plates ? 'Дугаартай' : null,
                      ].filter(Boolean).map((tag, i) => (
                        <span key={i} className="text-[11px] bg-[#f4f4f5] text-[#71717a] px-2 py-0.5 rounded-md">{tag}</span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {v.total_cost ? (
                        <span className="font-bold text-[#09090b]">{fmt(v.total_cost)}</span>
                      ) : (
                        <span className="text-xs text-[#a1a1aa]">Үнэ тохиролцоно</span>
                      )}
                      <span className="text-xs text-[#09090b] font-medium group-hover:underline">Дэлгэрэнгүй →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#f4f4f5] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-xs text-[#a1a1aa]">
          <span>{company?.name}</span>
          <Link href="/admin" className="hover:text-[#09090b] transition-colors">Нэвтрэх</Link>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
