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
  const [company, setCompany]       = useState<Company | null>(null);
  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
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
    return (!q || `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q))
        && (!fuelFilter || v.fuel_type === fuelFilter);
  });

  const companyName = company?.name || 'AutoDealer';

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#e4e4e7]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="лого" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#09090b] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{companyName[0]}</span>
              </div>
            )}
            <span className="font-bold text-[#09090b] text-sm">{companyName}</span>
          </div>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-6 text-sm text-[#52525b]">
            <a href="#cars" className="hover:text-[#09090b] transition-colors">Машинууд</a>
            <a href="#contact" className="hover:text-[#09090b] transition-colors">Холбоо барих</a>
          </nav>

          {/* Phone + Admin */}
          <div className="flex items-center gap-3">
            {company?.phone && (
              <a href={`tel:${company.phone}`}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#09090b] hover:text-[#52525b] transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                {company.phone}
              </a>
            )}
            <Link href="/admin"
              className="text-xs text-[#a1a1aa] hover:text-[#09090b] transition-colors px-2 py-1 rounded border border-[#e4e4e7] hover:border-[#d4d4d8]">
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-[#09090b] text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[#71717a] text-sm font-medium mb-3 tracking-wider uppercase">
              {companyName}
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
              Таны хүсэлд<br />
              тохирсон машин
            </h1>
            <p className="text-[#a1a1aa] mb-8 text-base">
              Чанартай, найдвартай машинуудыг бид шууд нийлүүлнэ.
              {company?.address ? ` ${company.address}.` : ''}
            </p>
            <div className="flex gap-3">
              <a href="#cars"
                className="bg-white text-[#09090b] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#f4f4f5] transition-colors">
                Машин үзэх
              </a>
              {company?.phone && (
                <a href={`tel:${company.phone}`}
                  className="border border-[#3f3f46] text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#18181b] transition-colors">
                  Залгах
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-[#18181b]">
          <div className="max-w-6xl mx-auto px-5 py-5 grid grid-cols-3 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <div className="text-xs text-[#71717a] mt-0.5">Нийт машин</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{new Set(vehicles.map(v => v.brand)).size}</div>
              <div className="text-xs text-[#71717a] mt-0.5">Марк</div>
            </div>
            <div>
              <div className="text-2xl font-bold">14</div>
              <div className="text-xs text-[#71717a] mt-0.5">Жилийн туршлага</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cars ── */}
      <section id="cars" className="flex-1 py-12 px-5">
        <div className="max-w-6xl mx-auto">
          {/* Section title + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-[#09090b]">Зарагдаж буй машинууд</h2>
              <p className="text-sm text-[#a1a1aa] mt-0.5">{filtered.length} машин байна</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Хайх..."
                  className="pl-9 pr-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:border-[#09090b] transition-colors w-40 sm:w-52" />
              </div>
              <select value={fuelFilter} onChange={e => setFuelFilter(e.target.value)}
                className="px-3 py-2 border border-[#e4e4e7] rounded-lg text-sm focus:outline-none focus:border-[#09090b] transition-colors">
                <option value="">Бүх түлш</option>
                {Object.entries(FUEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-2xl border border-[#f4f4f5] overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-[#f4f4f5]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#f4f4f5] rounded w-2/3" />
                    <div className="h-3 bg-[#f4f4f5] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#a1a1aa]">
              <svg className="w-12 h-12 mx-auto mb-3 text-[#e4e4e7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
              <p className="text-sm">Машин байхгүй байна</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(v => (
                <Link key={v.id} href={`/vehicle/${v.id}`}
                  className="group rounded-2xl border border-[#e4e4e7] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-white">
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
                      <span className="font-normal text-[#a1a1aa] ml-1.5 text-sm">{v.year}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
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
                        <span className="font-bold text-[#09090b] text-base">{fmt(v.total_cost)}</span>
                      ) : (
                        <span className="text-xs text-[#a1a1aa]">Үнэ тохиролцоно</span>
                      )}
                      <span className="text-xs text-[#a1a1aa] group-hover:text-[#09090b] transition-colors">Дэлгэрэнгүй →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact ── */}
      {(company?.phone || company?.address) && (
        <section id="contact" className="bg-[#fafafa] border-t border-[#f4f4f5] py-12 px-5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-[#09090b] mb-6">Холбоо барих</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {company?.phone && (
                <a href={`tel:${company.phone}`}
                  className="flex items-center gap-4 bg-white border border-[#e4e4e7] rounded-2xl p-5 hover:shadow-md transition-shadow group">
                  <div className="w-11 h-11 rounded-xl bg-[#09090b] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </div>
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-0.5">Утас</div>
                    <div className="font-semibold text-[#09090b] group-hover:underline">{company.phone}</div>
                  </div>
                </a>
              )}
              {company?.address && (
                <div className="flex items-center gap-4 bg-white border border-[#e4e4e7] rounded-2xl p-5">
                  <div className="w-11 h-11 rounded-xl bg-[#09090b] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-0.5">Хаяг</div>
                    <div className="font-semibold text-[#09090b]">{company.address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-[#f4f4f5] py-6 px-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-[#a1a1aa]">
          <span>© {new Date().getFullYear()} {companyName}</span>
          <Link href="/admin" className="hover:text-[#09090b] transition-colors">Нэвтрэх</Link>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return <Suspense><HomeContent /></Suspense>;
}
