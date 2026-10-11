'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SLUG     = process.env.NEXT_PUBLIC_COMPANY_SLUG || 'mongol-auto';

interface Company { name: string; phone: string; address: string; logo_url: string | null; }
interface Vehicle {
  id: string; brand: string; model: string; year: number; color: string;
  fuel_type: string; transmission: string; engine_cc: string; mileage: number;
  has_plates: boolean; total_cost: string | null; main_image: string | null;
}

const FUEL: Record<string, string> = { PETROL: 'Бензин', DIESEL: 'Дизель', HYBRID: 'Хибрид', ELECTRIC: 'Цахилгаан' };

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
  const [fuel, setFuel]         = useState('');
  const [brand, setBrand]       = useState('');
  const [trans, setTrans]       = useState('');
  const [menuOpen, setMenu]     = useState(false);

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
        && (!fuel  || v.fuel_type === fuel)
        && (!brand || brand === 'Бүх марк' || v.brand === brand)
        && (!trans || v.transmission === trans);
  });

  const cname = company?.name || 'AutoDealer';
  const uniqueBrands = [...new Set(vehicles.map(v => v.brand))].sort();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ══ NAVBAR ══ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#e4e4e7]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2.5">
              {company?.logo_url ? (
                <img src={company.logo_url} className="w-9 h-9 rounded-xl object-cover" alt="logo" />
              ) : (
                <div className="w-9 h-9 bg-[#09090b] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{cname[0]}</span>
                </div>
              )}
              <span className="font-bold text-[#09090b] text-base hidden sm:block">{cname}</span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm text-[#52525b]">
              <a href="#cars"    className="hover:text-[#09090b] transition-colors font-medium">Машинууд</a>
              <a href="#why"     className="hover:text-[#09090b] transition-colors font-medium">Бидний тухай</a>
              <a href="#contact" className="hover:text-[#09090b] transition-colors font-medium">Холбоо барих</a>
            </nav>

            <div className="flex items-center gap-3">
              {company?.phone && (
                <a href={`tel:${company.phone}`}
                  className="hidden sm:flex items-center gap-2 bg-[#09090b] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#27272a] transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  {company.phone}
                </a>
              )}
              {/* Mobile menu button */}
              <button onClick={() => setMenu(!menuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-[#f4f4f5] transition-colors">
                <svg className="w-5 h-5 text-[#09090b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#f4f4f5] bg-white px-5 py-4 space-y-3">
            {['#cars', '#why', '#contact'].map((href, i) => (
              <a key={href} href={href} onClick={() => setMenu(false)}
                className="block text-sm font-medium text-[#52525b] hover:text-[#09090b] py-1">
                {['Машинууд', 'Бидний тухай', 'Холбоо барих'][i]}
              </a>
            ))}
            {company?.phone && (
              <a href={`tel:${company.phone}`} className="block text-sm font-semibold text-[#09090b] py-1">
                {company.phone}
              </a>
            )}
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section className="bg-[#09090b] text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)' }} />
        <div className="max-w-6xl mx-auto px-5 py-20 sm:py-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Зарагдаж буй машинууд
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
              Таны хүсэлд<br />
              <span className="text-[#a1a1aa]">тохирсон машин</span>
            </h1>
            <p className="text-[#71717a] text-lg mb-8 leading-relaxed">
              Чанартай, найдвартай машинуудыг бид шууд нийлүүлнэ.
              {company?.address ? ` ${company.address}.` : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#cars"
                className="bg-white text-[#09090b] font-semibold px-6 py-3 rounded-xl hover:bg-[#f4f4f5] transition-colors text-sm">
                Машин үзэх →
              </a>
              {company?.phone && (
                <a href={`tel:${company.phone}`}
                  className="border border-[#3f3f46] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#18181b] transition-colors text-sm">
                  Залгах
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-[#18181b]">
          <div className="max-w-6xl mx-auto px-5">
            <div className="grid grid-cols-3 divide-x divide-[#18181b]">
              {[
                { num: vehicles.length, label: 'Нийт машин' },
                { num: uniqueBrands.length, label: 'Марк' },
                { num: `${new Date().getFullYear() - 2010}+`, label: 'Жилийн туршлага' },
              ].map(({ num, label }) => (
                <div key={label} className="py-5 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{num}</div>
                  <div className="text-xs text-[#71717a] mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CARS ══ */}
      <section id="cars" className="py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#09090b]">Зарагдаж буй машинууд</h2>
            <p className="text-sm text-[#a1a1aa] mt-1">{filtered.length} машин байна</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Марк, загвар хайх..."
                className="pl-9 pr-4 py-2 border border-[#e4e4e7] rounded-xl text-sm focus:outline-none focus:border-[#09090b] transition-colors w-48" />
            </div>
            <select value={brand} onChange={e => setBrand(e.target.value)}
              className="px-3 py-2 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b] focus:outline-none focus:border-[#09090b] transition-colors bg-white">
              <option value="">Бүх марк</option>
              {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={fuel} onChange={e => setFuel(e.target.value)}
              className="px-3 py-2 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b] focus:outline-none focus:border-[#09090b] transition-colors bg-white">
              <option value="">Бүх түлш</option>
              {Object.entries(FUEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={trans} onChange={e => setTrans(e.target.value)}
              className="px-3 py-2 border border-[#e4e4e7] rounded-xl text-sm text-[#52525b] focus:outline-none focus:border-[#09090b] transition-colors bg-white">
              <option value="">Хурдны хайрцаг</option>
              <option value="AUTO">Автомат</option>
              <option value="MANUAL">Механик</option>
            </select>
            {(search || fuel || brand || trans) && (
              <button onClick={() => { setSearch(''); setFuel(''); setBrand(''); setTrans(''); }}
                className="px-3 py-2 text-xs text-[#71717a] hover:text-[#09090b] border border-[#e4e4e7] rounded-xl transition-colors">
                Цэвэрлэх ×
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-2xl border border-[#f4f4f5] overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-[#f4f4f5]" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 bg-[#f4f4f5] rounded-lg w-3/4" />
                    <div className="h-3 bg-[#f4f4f5] rounded-lg w-1/2" />
                    <div className="h-5 bg-[#f4f4f5] rounded-lg w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-[#a1a1aa]">
              <svg className="w-12 h-12 mx-auto mb-3 text-[#e4e4e7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
              <p className="text-sm">Машин олдсонгүй</p>
              <button onClick={() => { setSearch(''); setFuel(''); setBrand(''); setTrans(''); }}
                className="mt-3 text-sm text-[#09090b] underline">Шүүлтийг цэвэрлэх</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(v => (
                <Link key={v.id} href={`/vehicle/${v.id}`}
                  className="group bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 flex flex-col">
                  <div className="aspect-[4/3] bg-[#f4f4f5] overflow-hidden flex items-center justify-center relative">
                    {v.main_image ? (
                      <img src={v.main_image} alt={`${v.brand} ${v.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <svg className="w-16 h-16 text-[#e4e4e7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>
                    )}
                    {v.has_plates && (
                      <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-[#09090b] px-2 py-0.5 rounded-full">
                        Дугаартай
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-bold text-[#09090b] text-base">
                      {v.brand} {v.model}
                      <span className="font-normal text-[#a1a1aa] ml-1.5 text-sm">{v.year}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {[
                        FUEL[v.fuel_type],
                        v.transmission === 'AUTO' ? 'Автомат' : 'Механик',
                        v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : null,
                        v.mileage > 0 ? `${Number(v.mileage).toLocaleString()} км` : null,
                      ].filter(Boolean).map((tag, i) => (
                        <span key={i} className="text-[11px] bg-[#f4f4f5] text-[#71717a] px-2 py-0.5 rounded-lg">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      {v.total_cost ? (
                        <span className="font-bold text-[#09090b] text-lg">{fmt(v.total_cost)}</span>
                      ) : (
                        <span className="text-sm text-[#a1a1aa]">Үнэ тохиролцоно</span>
                      )}
                      <span className="text-xs font-medium text-[#a1a1aa] group-hover:text-[#09090b] transition-colors">
                        Дэлгэрэнгүй →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══ WHY US ══ */}
      <section id="why" className="bg-[#fafafa] border-y border-[#f4f4f5] py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#09090b]">Яагаад бидэнд хандах вэ?</h2>
            <p className="text-sm text-[#a1a1aa] mt-2">Таны итгэлийг хамгийн чухалд үздэг</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
                title: 'Найдвартай машин',
                desc: 'Бүх машин техникийн үзлэгт орсон, зарагдахаас өмнө нягт шалгагдсан байна.',
              },
              {
                icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                title: 'Тохиромжтой үнэ',
                desc: 'Зах зээлийн шударга үнээр, ямар нэгэн нуугдмал төлбөргүй шууд худалдана.',
              },
              {
                icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                title: 'Мэргэжлийн баг',
                desc: 'Туршлагатай мэргэжилтнүүдийн баг таны асуултад хариулж, туслахад бэлэн.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-[#e4e4e7] hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-[#09090b] rounded-xl flex items-center justify-center text-white mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-[#09090b] mb-2">{title}</h3>
                <p className="text-sm text-[#71717a] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section id="contact" className="py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#09090b] mb-2">Холбоо барих</h2>
              <p className="text-sm text-[#71717a] mb-7">Машины талаар дэлгэрэнгүй мэдэхийг хүсвэл биднэй холбогдоорой.</p>
              <div className="space-y-3">
                {company?.phone && (
                  <a href={`tel:${company.phone}`}
                    className="flex items-center gap-4 bg-[#fafafa] border border-[#e4e4e7] rounded-2xl p-4 hover:border-[#09090b] transition-colors group">
                    <div className="w-10 h-10 bg-[#09090b] rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    </div>
                    <div>
                      <div className="text-xs text-[#a1a1aa]">Утас</div>
                      <div className="font-semibold text-[#09090b] group-hover:underline">{company.phone}</div>
                    </div>
                    <svg className="w-4 h-4 text-[#d4d4d8] ml-auto group-hover:text-[#09090b] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                )}
                {company?.phone && (
                  <a href={`https://wa.me/976${company.phone}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 hover:bg-[#dcfce7] transition-colors group">
                    <div className="w-10 h-10 bg-[#16a34a] rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div>
                      <div className="text-xs text-[#16a34a]">WhatsApp</div>
                      <div className="font-semibold text-[#16a34a]">Мессеж илгээх</div>
                    </div>
                    <svg className="w-4 h-4 text-[#bbf7d0] ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                )}
                {company?.address && (
                  <div className="flex items-center gap-4 bg-[#fafafa] border border-[#e4e4e7] rounded-2xl p-4">
                    <div className="w-10 h-10 bg-[#09090b] rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <div className="text-xs text-[#a1a1aa]">Байршил</div>
                      <div className="font-semibold text-[#09090b]">{company.address}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA card */}
            <div className="bg-[#09090b] rounded-3xl p-8 text-white">
              <h3 className="text-xl font-bold mb-2">Машин сонирхож байна уу?</h3>
              <p className="text-[#71717a] text-sm mb-6 leading-relaxed">
                Дэлгэрэнгүй мэдээлэл авах, үзлэг хийлгэхийг хүсвэл бидэнтэй холбогдоорой.
                Бид таньд тохирсон машин олоход тусална.
              </p>
              <div className="space-y-2.5">
                {company?.phone && (
                  <a href={`tel:${company.phone}`}
                    className="flex items-center justify-center gap-2 bg-white text-[#09090b] font-semibold text-sm py-3 rounded-xl hover:bg-[#f4f4f5] transition-colors w-full">
                    Одоо залгах
                  </a>
                )}
                <a href="#cars"
                  className="flex items-center justify-center gap-2 border border-[#3f3f46] text-white font-semibold text-sm py-3 rounded-xl hover:bg-[#18181b] transition-colors w-full">
                  Машинуудыг үзэх
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-[#09090b] text-[#71717a]">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">{cname[0]}</span>
              </div>
              <span className="text-white font-semibold text-sm">{cname}</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <a href="#cars"    className="hover:text-white transition-colors">Машинууд</a>
              <a href="#why"     className="hover:text-white transition-colors">Бидний тухай</a>
              <a href="#contact" className="hover:text-white transition-colors">Холбоо барих</a>
              <Link href="/admin" className="hover:text-white transition-colors">Нэвтрэх</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[#18181b] text-xs text-center sm:text-left">
            © {new Date().getFullYear()} {cname}. Бүх эрх хуулиар хамгаалагдсан.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function HomePage() {
  return <Suspense><HomeContent /></Suspense>;
}
