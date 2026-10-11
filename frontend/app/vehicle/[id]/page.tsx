'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Vehicle {
  id: string; brand: string; model: string; year: number; color: string;
  fuel_type: string; transmission: string; engine_cc: string; mileage: number;
  description: string; has_plates: boolean; manufactured_date: string | null;
  total_cost: string | null; images: string[];
  company: { name: string; phone: string; };
}

const FUEL:  Record<string,string> = { PETROL:'Бензин', DIESEL:'Дизель', HYBRID:'Хибрид', ELECTRIC:'Цахилгаан' };
const TRANS: Record<string,string> = { AUTO:'Автомат', MANUAL:'Механик' };

function fmtPrice(n: string|number|null) {
  if (!n || Number(n) === 0) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num/1_000_000).toFixed(1)+' сая ₮';
  return num.toLocaleString('mn-MN')+' ₮';
}
function imgSrc(u: string) { return u.startsWith('http') ? u : `${BACKEND}${u}`; }

/* ─── SVG icons ─── */
const Ic = {
  back:   <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  phone:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  wa:     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  fuel:   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16M3 22h14M13 4h2l2 2v3.5a1.5 1.5 0 003 0V8l-2-2"/><path d="M7 14h4v4H7z"/></svg>,
  gear:   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  odo:    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>,
  engine: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7V5M18 7V5M6 17v2M18 17v2M2 12h2M20 12h2"/></svg>,
  color:  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>,
  plate:  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><line x1="11" y1="9" x2="13" y2="9"/><line x1="11" y1="12" x2="13" y2="12"/><line x1="11" y1="15" x2="13" y2="15"/></svg>,
  check:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>,
  img:    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
};

function VehicleContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [v, setV]          = useState<Vehicle|null>(null);
  const [imgIdx, setIdx]   = useState(0);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/public/vehicles/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setV(d); })
      .finally(() => setLoad(false));
  }, [id]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-[#c00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Ачааллаж байна...</p>
      </div>
    </div>
  );

  /* ── 404 ── */
  if (!v) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl font-black text-gray-200 mb-4">404</div>
        <p className="text-gray-400 text-sm mb-5">Машин олдсонгүй</p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#c00] hover:underline">
          {Ic.back} Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  );

  const imgs  = v.images?.length
    ? v.images.map(u => imgSrc(u))
    : [];
  const price = fmtPrice(v.total_cost);
  const mainImg = imgs[imgIdx] || null;

  const highlights = [
    { icon: Ic.fuel,   label: 'Түлш',        value: FUEL[v.fuel_type] },
    { icon: Ic.gear,   label: 'Хурдны хайрцаг', value: TRANS[v.transmission] },
    { icon: Ic.odo,    label: 'Гүйлт',        value: v.mileage > 0 ? `${Number(v.mileage).toLocaleString()} км` : '—' },
    { icon: Ic.engine, label: 'Хөдөлгүүр',   value: v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : '—' },
  ];

  const allSpecs = [
    { label:'Түлшний төрөл',   value: FUEL[v.fuel_type] },
    { label:'Хурдны хайрцаг',  value: TRANS[v.transmission] },
    { label:'Гүйлт',           value: v.mileage > 0 ? `${Number(v.mileage).toLocaleString()} км` : null },
    { label:'Хөдөлгүүр',       value: v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : null },
    { label:'Өнгө',            value: v.color || null },
    { label:'Улсын дугаар',    value: v.has_plates ? 'Дугаартай' : 'Дугааргүй' },
    { label:'Үйлдвэрлэсэн',   value: v.manufactured_date ? v.manufactured_date.slice(0,7) : null },
    { label:'Он',              value: String(v.year) },
  ].filter(s => s.value);

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-[76px] lg:pb-0" style={{fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* ── Top nav ── */}
      <div className="bg-[#c00] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity font-medium">
            {Ic.back} Буцах
          </button>
          <span className="opacity-30">|</span>
          <Link href="/" className="hover:opacity-80 transition-opacity">{v.company?.name}</Link>
          <span className="opacity-30 hidden sm:inline">›</span>
          <span className="opacity-60 hidden sm:inline">{v.brand} {v.model}</span>
        </div>
      </div>

      {/* ── White header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#c00] rounded flex items-center justify-center">
              <span className="text-white font-black text-base leading-none">{v.company?.name?.[0] || 'A'}</span>
            </div>
            <span className="font-black text-[#111] text-base hidden sm:block">{v.company?.name}</span>
          </Link>
          {v.company?.phone && (
            <a href={`tel:${v.company.phone}`}
              className="flex items-center gap-2 bg-[#c00] hover:bg-[#a00] text-white text-sm font-bold px-5 py-2 rounded transition-colors">
              {Ic.phone}{v.company.phone}
            </a>
          )}
        </div>
      </header>

      {/* ── HERO image ── */}
      <div className="relative bg-[#111] overflow-hidden" style={{minHeight:'clamp(280px,55vw,480px)'}}>
        {mainImg ? (
          <>
            <img src={mainImg} alt={`${v.brand} ${v.model}`}
              className="w-full h-full object-cover absolute inset-0 opacity-70"
              style={{minHeight:'clamp(280px,55vw,480px)'}} />
            <div className="absolute inset-0"
              style={{background:'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)'}} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg viewBox="0 0 400 240" className="w-2/3">
              <path d="M40 170L80 90Q100 60 130 55L200 50L270 55Q300 60 320 90L360 170Z" fill="white"/>
              <path d="M130 55L155 15Q165 5 180 4L220 4Q235 5 245 15L270 55Z" fill="white" opacity="0.7"/>
            </svg>
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-16 flex flex-col justify-end" style={{minHeight:'clamp(280px,55vw,480px)'}}>
          <div className="max-w-xl">
            {v.has_plates && (
              <span className="inline-flex items-center gap-1.5 bg-[#c00] text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-widest mb-4">
                {Ic.check} Дугаартай
              </span>
            )}
            <div className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-1">{v.brand}</div>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-2 drop-shadow-lg">
              {v.model}
            </h1>
            <div className="flex items-center gap-3 text-white/70 text-sm">
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-semibold">{v.year} он</span>
              {imgs.length > 0 && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                  {Ic.img} {imgs.length} зураг
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Highlight specs strip ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
            {highlights.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 py-3.5 px-3 sm:px-6">
                <div className="w-10 h-10 bg-[#fff0f0] rounded-xl flex items-center justify-center text-[#c00] shrink-0">
                  {icon}
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</div>
                  <div className="text-sm font-extrabold text-[#111] mt-0.5">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* LEFT column */}
          <div className="space-y-5">

            {/* Gallery */}
            {imgs.length > 0 && (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {/* Main */}
                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden cursor-zoom-in">
                  <img src={imgs[imgIdx]} alt="" className="w-full h-full object-cover" />
                  {imgs.length > 1 && (
                    <>
                      <button onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <button onClick={() => setIdx(i => (i + 1) % imgs.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {imgIdx+1} / {imgs.length}
                      </div>
                    </>
                  )}
                </div>
                {/* Thumbs */}
                {imgs.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50 snap-x snap-mandatory">
                    {imgs.map((url, i) => (
                      <button key={i} onClick={() => setIdx(i)}
                        className={`shrink-0 snap-start w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          i === imgIdx
                            ? 'border-[#c00] shadow-md'
                            : 'border-transparent opacity-55 hover:opacity-100 hover:border-gray-300'
                        }`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All specs */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="w-1 h-5 bg-[#c00] rounded-full" />
                <h2 className="font-extrabold text-[#111] text-sm uppercase tracking-wider">Техникийн үзүүлэлт</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {allSpecs.map(({ label, value }) => (
                  <div key={label} className="flex items-center px-5 py-3.5 hover:bg-[#fafafa] transition-colors">
                    <span className="w-5 h-5 text-[#c00] mr-3 shrink-0">{Ic.check}</span>
                    <span className="text-sm text-gray-500 w-40 shrink-0">{label}</span>
                    <span className="text-sm font-bold text-[#111]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {v.description && (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="w-1 h-5 bg-[#c00] rounded-full" />
                  <h2 className="font-extrabold text-[#111] text-sm uppercase tracking-wider">Нэмэлт мэдээлэл</h2>
                </div>
                <p className="px-5 py-5 text-sm text-gray-600 leading-relaxed">{v.description}</p>
              </div>
            )}
          </div>

          {/* RIGHT sidebar */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">

            {/* Price card */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="h-1.5 bg-[#c00]" />
              <div className="p-5">
                {/* Title */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-[#c00] uppercase tracking-widest mb-0.5">{v.brand}</div>
                  <div className="text-xl font-black text-[#111] leading-tight">{v.model}</div>
                  <div className="text-gray-400 text-sm mt-0.5">{v.year} он · {v.color}</div>
                </div>

                {/* Price */}
                {price ? (
                  <div className="bg-gradient-to-r from-[#c00] to-[#e00] rounded-xl p-4 mb-4 text-white">
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">Борлуулах үнэ</div>
                    <div className="text-2xl font-black leading-tight">{price}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 mb-4">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Үнэ</div>
                    <div className="text-base font-bold text-gray-500">Тохиролцоно</div>
                  </div>
                )}

                {/* Quick specs badges */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[
                    FUEL[v.fuel_type],
                    TRANS[v.transmission],
                    v.mileage > 0 ? `${(v.mileage/1000).toFixed(0)}k км` : null,
                    v.engine_cc ? `${(Number(v.engine_cc)/1000).toFixed(1)}L` : null,
                  ].filter(Boolean).map((t, i) => (
                    <div key={i} className="flex items-center justify-center gap-1.5 bg-[#f8f8f8] border border-gray-100 rounded-lg py-2 px-3 text-xs font-bold text-gray-600">
                      {t}
                    </div>
                  ))}
                </div>

                {/* Call buttons */}
                {v.company?.phone && (
                  <div className="space-y-2.5">
                    <a href={`tel:${v.company.phone}`}
                      className="flex items-center justify-center gap-2.5 w-full bg-[#c00] hover:bg-[#a00] text-white font-extrabold py-4 rounded-xl transition-colors text-sm tracking-wide">
                      {Ic.phone}
                      <span>{v.company.phone} — Залгах</span>
                    </a>
                    <a href={`https://wa.me/976${v.company.phone.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2.5 w-full bg-[#25d366] hover:bg-[#1ebe5d] text-white font-extrabold py-4 rounded-xl transition-colors text-sm">
                      {Ic.wa}
                      <span>WhatsApp — Мессеж</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Dealer info */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#c00] rounded-lg flex items-center justify-center text-white font-black text-lg shrink-0">
                  {v.company?.name?.[0]}
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Дилер</div>
                  <div className="font-extrabold text-[#111] text-sm">{v.company?.name}</div>
                </div>
              </div>
              {v.company?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                  {Ic.phone}<span>{v.company.phone}</span>
                </div>
              )}
            </div>

            {/* Back */}
            <Link href="/"
              className="flex items-center justify-center gap-2 w-full bg-white rounded-xl shadow-sm py-3 text-sm text-gray-400 hover:text-[#c00] hover:shadow-md transition-all font-semibold">
              {Ic.back} Бүх машинуудыг үзэх
            </Link>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom call bar */}
      {v.company?.phone && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex gap-2.5">
          <a href={`tel:${v.company.phone}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#c00] active:bg-[#a00] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm">
            {Ic.phone} Залгах
          </a>
          <a href={`https://wa.me/976${v.company.phone.replace(/\D/g,'')}`}
            target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25d366] active:bg-[#1ebe5d] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm">
            {Ic.wa} WhatsApp
          </a>
        </div>
      )}

    </div>
  );
}

export default function VehiclePage() {
  return <Suspense><VehicleContent /></Suspense>;
}
