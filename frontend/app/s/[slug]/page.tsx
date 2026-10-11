'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Company {
  id: string; name: string; phone: string;
  address: string; logo_url: string | null; show_prices: boolean;
}
interface Vehicle {
  id: string; brand: string; model: string; year: number;
  color: string; fuel_type: string; transmission: string;
  engine_cc: string; mileage: number; description: string;
  has_plates: boolean; total_cost: string | null; main_image: string | null;
}

const FUEL: Record<string, string> = {
  PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан',
};
const TRANS: Record<string, string> = { AUTO: 'Автомат', MANUAL: 'Механик' };

function fmt(n: string | number | null) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' сая₮';
  return num.toLocaleString('mn-MN') + '₮';
}

export default function ShowcasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
      </div>
    }>
      <ShowcaseContent />
    </Suspense>
  );
}

function ShowcaseContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [company, setCompany]   = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch]     = useState('');
  const [fuel, setFuel]         = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/api/public/${slug}`).then(r => r.json()),
      fetch(`${BACKEND}/api/public/${slug}/vehicles`).then(r => r.json()),
    ]).then(([comp, data]) => {
      if (comp.error) { setNotFound(true); return; }
      setCompany(comp);
      setVehicles(data.vehicles || []);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchQ = !q || `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q);
    const matchF = !fuel || v.fuel_type === fuel;
    return matchQ && matchF;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
      <div className="text-sm text-[#a1a1aa]">Ачааллаж байна...</div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-[#e4e4e7] mb-3">404</div>
        <p className="text-[#71717a]">Компани олдсонгүй</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e4e7] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="лого" className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#09090b] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {company?.name?.[0] || 'A'}
                </span>
              </div>
            )}
            <div>
              <div className="font-bold text-[#09090b] text-sm">{company?.name}</div>
              {company?.address && (
                <div className="text-xs text-[#a1a1aa]">{company.address}</div>
              )}
            </div>
          </div>
          {company?.phone && (
            <a href={`tel:${company.phone}`}
              className="flex items-center gap-2 bg-[#09090b] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#27272a] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              {company.phone}
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search + filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Марк, загвар хайх..."
              className="w-full bg-white border border-[#e4e4e7] rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#09090b] transition-colors" />
          </div>
          <select value={fuel} onChange={e => setFuel(e.target.value)}
            className="bg-white border border-[#e4e4e7] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#09090b] transition-colors">
            <option value="">Бүх түлш</option>
            {Object.entries(FUEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Count */}
        <div className="text-xs text-[#a1a1aa] mb-4">
          {filtered.length} машин байна
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#a1a1aa]">
            <svg className="w-12 h-12 mx-auto mb-3 text-[#e4e4e7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
            <p className="text-sm">Машин олдсонгүй</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => (
              <Link key={v.id} href={`/s/${slug}/${v.id}`}
                className="bg-white rounded-xl border border-[#e4e4e7] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
                {/* Image */}
                <div className="aspect-[4/3] bg-[#f4f4f5] flex items-center justify-center overflow-hidden">
                  {v.main_image ? (
                    <img src={v.main_image} alt={`${v.brand} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <svg className="w-12 h-12 text-[#d4d4d8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                  )}
                </div>

                <div className="p-4">
                  <div className="font-semibold text-[#09090b] text-sm">
                    {v.brand} {v.model}
                    <span className="text-[#a1a1aa] font-normal ml-1">{v.year}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Chip>{FUEL[v.fuel_type] || v.fuel_type}</Chip>
                    <Chip>{TRANS[v.transmission] || v.transmission}</Chip>
                    {v.engine_cc && <Chip>{(Number(v.engine_cc)/1000).toFixed(1)}L</Chip>}
                    {v.mileage > 0 && <Chip>{Number(v.mileage).toLocaleString()} км</Chip>}
                    {v.has_plates && <Chip>Дугаартай</Chip>}
                  </div>

                  {v.total_cost && (
                    <div className="mt-3 text-base font-bold text-[#09090b]">
                      {fmt(v.total_cost)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-[#d4d4d8] mt-6">
        Powered by AutoERP
      </footer>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#f4f4f5] text-[#71717a] text-[11px] px-2 py-0.5 rounded-md">
      {children}
    </span>
  );
}
