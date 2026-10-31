'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BACKEND, companyQuery, optimizeImg, Vehicle, VehicleDetail } from '@/lib/site';
import { FUEL, TRANS, fmtEngine, fmtPrice } from '@/lib/format';
import { useCompany } from '@/lib/useSiteData';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { LeasingCalculator } from '@/components/site/LeasingCalculator';
import { BrandMark } from '@/components/site/BrandMark';
import { Lightbox } from '@/components/site/Lightbox';
import { CarPlaceholder, VehicleCard, VehicleCardSkeleton } from '@/components/site/VehicleCard';
import { IcPhone, IcWa } from '@/components/site/icons';

function imgSrc(u: string, w = 1400) { return optimizeImg(u, w) || u; }

/* ─── SVG icons ─── */
const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const Ic = {
  back:   <svg className="w-4 h-4" {...sv} strokeWidth={2.2}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  fuel:   <svg className="w-5 h-5" {...sv}><path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16M3 22h14M13 4h2l2 2v3.5a1.5 1.5 0 003 0V8l-2-2"/><path d="M7 14h4v4H7z"/></svg>,
  gear:   <svg className="w-5 h-5" {...sv}><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/></svg>,
  odo:    <svg className="w-5 h-5" {...sv}><path d="M3.5 17a9 9 0 1117 0"/><path d="M12 13l4-4"/><circle cx="12" cy="13" r="1"/></svg>,
  engine: <svg className="w-5 h-5" {...sv}><rect x="3" y="8" width="15" height="10" rx="2"/><path d="M7 8V5h6v3M18 11h3v4h-3M3 13H1"/></svg>,
  check:  <svg className="w-3.5 h-3.5" {...sv} strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>,
  grid:   <svg className="w-4 h-4" {...sv}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  link:   <svg className="w-4 h-4" {...sv} strokeWidth={2}><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></svg>,
  calc:   <svg className="w-4 h-4" {...sv}><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/></svg>,
  arrow:  <svg className="w-4 h-4" {...sv} strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
};

function Shell({ company, children }: { company: VehicleDetail['company'] | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader company={company} />
      {children}
      <SiteFooter company={company} />
    </div>
  );
}

function VehicleContent({ id, initial }: { id: string; initial: VehicleDetail | null }) {
  const router = useRouter();
  const siteCompany = useCompany();
  const [v, setV] = useState<VehicleDetail | null>(initial);
  const [others, setOthers] = useState<Vehicle[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [loading, setLoad] = useState(!initial);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const prevTitle = document.title;
    async function load(retry = 0) {
      try {
        const r = await fetch(`${BACKEND}/api/public/vehicles/${id}${companyQuery()}`);
        const d = await r.json();
        if (cancelled) return;
        if (!d.error) {
          setV(d);
          document.title = `${d.brand} ${d.model} ${d.year}${d.company?.name ? ` | ${d.company.name}` : ''}`;
        }
        setLoad(false);
      } catch {
        if (cancelled) return;
        if (retry < 3) setTimeout(() => load(retry + 1), 3000 * (retry + 1));
        else setLoad(false);
      }
    }
    fetch(`${BACKEND}/api/public/vehicles${companyQuery()}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setOthers((d.vehicles || []).filter((x: Vehicle) => x.id !== id).slice(0, 4)); })
      .catch(() => { if (!cancelled) setOthers([]); });
    load();
    return () => { cancelled = true; document.title = prevTitle; };
  }, [id]);

  const company = v?.company ?? siteCompany;

  if (loading) return (
    <Shell company={company}>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-6 pb-20 animate-pulse">
        <div className="h-4 w-40 bg-zinc-200 rounded-full mb-6" />
        <div className="h-12 w-2/3 max-w-md bg-zinc-200 rounded-2xl mb-8" />
        <div className="aspect-[16/9] lg:aspect-[21/9] bg-zinc-200 rounded-[32px]" />
      </main>
    </Shell>
  );

  if (!v) return (
    <Shell company={company}>
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="text-center">
          <div className="font-display text-[120px] leading-none font-semibold text-zinc-200 tracking-tighter">404</div>
          <p className="font-display text-xl font-semibold text-ink mt-2">Машин олдсонгүй</p>
          <p className="text-zinc-500 text-sm mt-1 mb-7">Зарагдсан эсвэл хасагдсан байж магадгүй.</p>
          <Link href="/#cars" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-brand transition-colors">
            {Ic.back} Бүх машин үзэх
          </Link>
        </div>
      </main>
    </Shell>
  );

  const leasingOn = v.company?.features?.leasing !== false;
  const images = v.images || [];
  const fullImgs = images.map(u => imgSrc(u, 2000));
  const price = fmtPrice(v.price);
  const km = v.mileage > 0 ? `${Number(v.mileage).toLocaleString('en-US')} км` : null;
  const engine = fmtEngine(v.engine_cc);

  const highlights = [
    { icon: Ic.odo,    label: 'Гүйлт',          value: km || '—' },
    { icon: Ic.fuel,   label: 'Түлш',           value: FUEL[v.fuel_type] || '—' },
    { icon: Ic.gear,   label: 'Хурдны хайрцаг', value: TRANS[v.transmission] || '—' },
    { icon: Ic.engine, label: 'Хөдөлгүүр',      value: engine || '—' },
  ];

  const allSpecs = [
    { label: 'Марк',            value: v.brand },
    { label: 'Загвар',          value: v.model },
    { label: 'Он',              value: String(v.year) },
    { label: 'Үйлдвэрлэсэн',    value: v.manufactured_date ? v.manufactured_date.slice(0, 7).replace('-', '.') : null },
    { label: 'Өнгө',            value: v.color || null },
    { label: 'Гүйлт',           value: km },
    { label: 'Түлшний төрөл',   value: FUEL[v.fuel_type] },
    { label: 'Хурдны хайрцаг',  value: TRANS[v.transmission] },
    { label: 'Хөдөлгүүр',       value: engine },
    { label: 'Улсын дугаар',    value: v.has_plates ? 'Дугаартай' : 'Дугааргүй' },
  ].filter(s => s.value);

  const descLines = (v.description || '').split('\n').map(l => l.trim());
  const features  = descLines.filter(l => l.startsWith('•')).map(l => l.replace(/^•\s*/, ''));
  const credit    = descLines.find(l => l.startsWith('Зургийн эх сурвалж'));
  const intro     = descLines.filter(l => l && !l.startsWith('•') && !l.startsWith('Зургийн эх сурвалж')).join('\n\n');
  const waHref    = v.company?.phone
    ? `https://wa.me/976${v.company.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Сайн байна уу, ${v.year} оны ${v.brand} ${v.model} машины талаар лавлах гэсэн юм.`)}`
    : '';

  async function copyLink() {
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `${v!.year} ${v!.brand} ${v!.model}`, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const onStripScroll = () => {
    const el = stripRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const card = 'bg-white rounded-[28px] ring-1 ring-ink/[0.06] shadow-card';

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      <SiteHeader company={company} />

      <main className="max-w-7xl mx-auto px-4 pt-2 sm:pt-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-5 sm:mb-7">
          <button onClick={() => router.back()} aria-label="Буцах"
            className="w-10 h-10 rounded-full bg-white ring-1 ring-ink/[0.06] flex items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors">
            {Ic.back}
          </button>
          <Link href="/#cars" className="px-2 py-2 hover:text-ink transition-colors">Машинууд</Link>
          <span className="text-zinc-300">/</span>
          <span className="text-ink font-medium truncate">{v.brand} {v.model}</span>
        </nav>

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-2">{v.brand}</div>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-ink leading-[1.02]">
              {v.model} <span className="text-zinc-400">{v.year}</span>
            </h1>
            <div className="flex flex-wrap gap-2 mt-4">
              {v.has_plates && (
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-soft text-brand text-sm font-medium">
                  {Ic.check} Дугаартай
                </span>
              )}
              {v.color && <span className="inline-flex items-center h-8 px-3 rounded-full bg-white ring-1 ring-ink/[0.08] text-sm text-zinc-700">{v.color}</span>}
              {km && <span className="inline-flex items-center h-8 px-3 rounded-full bg-white ring-1 ring-ink/[0.08] text-sm text-zinc-700">{km}</span>}
            </div>
          </div>
          <button onClick={copyLink}
            className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white ring-1 ring-ink/[0.08] text-sm font-medium text-ink hover:ring-ink/30 transition-all shrink-0">
            {Ic.link} {copied ? 'Хуулагдлаа' : 'Хуваалцах'}
          </button>
        </div>

        {/* ── Gallery ── */}
        {images.length > 0 ? (
          <>
            {/* Mobile: гулсуулах */}
            <div className="sm:hidden relative -mx-4">
              <div ref={stripRef} onScroll={onStripScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 gap-2">
                {images.map((u, i) => (
                  <button key={u} onClick={() => setLightbox(i)} className="relative shrink-0 w-full snap-center aspect-[4/3] rounded-[24px] overflow-hidden bg-zinc-100">
                    <img src={imgSrc(u, 900)} alt={i === 0 ? `${v.brand} ${v.model}` : ''} loading={i === 0 ? 'eager' : 'lazy'} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-3 right-7 glass-dark text-white text-xs font-medium tabular-nums px-3 py-1.5 rounded-full">
                  {slide + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Desktop: bento */}
            <div className={`hidden sm:grid gap-2 sm:gap-3 h-[420px] lg:h-[560px] ${images.length >= 3 ? 'grid-cols-[2fr_1fr] grid-rows-2' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {images.slice(0, 3).map((u, i) => (
                <button key={u} onClick={() => setLightbox(i)}
                  className={`group relative overflow-hidden bg-zinc-100 rounded-[24px] ${i === 0 && images.length >= 3 ? 'row-span-2' : ''} ${i === 0 ? 'lg:rounded-[32px]' : ''}`}>
                  <img src={imgSrc(u, i === 0 ? 1600 : 900)} alt={i === 0 ? `${v.brand} ${v.model}` : ''} loading={i === 0 ? 'eager' : 'lazy'}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.2s] ease-out-expo" />
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  {i === Math.min(2, images.length - 1) && images.length > 1 && (
                    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 glass rounded-full px-4 h-10 text-sm font-medium text-ink">
                      {Ic.grid} Бүх зураг ({images.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="aspect-[16/9] lg:aspect-[21/9] rounded-[28px] bg-zinc-100 text-zinc-500 flex items-center justify-center">
            <CarPlaceholder className="w-1/3" />
          </div>
        )}

        {/* ── Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-10 mt-6 sm:mt-10">
          <div className="space-y-6 min-w-0">
            {/* Key specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {highlights.map(({ icon, label, value }) => (
                <div key={label} className={`${card} p-4 sm:p-5`}>
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-ink flex items-center justify-center">{icon}</div>
                  <div className="text-xs sm:text-sm text-zinc-500 mt-4">{label}</div>
                  <div className="font-display text-base sm:text-lg font-semibold text-ink mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {intro && (
              <section className={`${card} p-6 sm:p-8`}>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink mb-4">Машины тухай</h2>
                <p className="text-[15px] sm:text-base text-zinc-600 leading-relaxed whitespace-pre-line">{intro}</p>
              </section>
            )}

            {features.length > 0 && (
              <section className={`${card} p-6 sm:p-8`}>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink mb-5">Онцлох тоноглол</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3.5 text-sm text-zinc-700">
                      <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-brand text-white flex items-center justify-center">{Ic.check}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={`${card} p-6 sm:p-8`}>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink mb-3">Техникийн үзүүлэлт</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
                {allSpecs.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3.5 border-b border-zinc-100">
                    <dt className="text-sm text-zinc-500">{label}</dt>
                    <dd className="text-sm font-medium text-ink text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {credit && <p className="text-xs text-zinc-500 px-2">{credit}</p>}
          </div>

          {/* ── Price card ── */}
          <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start space-y-3">
            <div className={`${card} p-6 sm:p-7`}>
              <div className="text-sm text-zinc-500">Үнэ</div>
              {price ? (
                <div className="font-display text-4xl sm:text-[44px] font-semibold text-ink tabular-nums tracking-tight leading-tight mt-1">{price}</div>
              ) : (
                <div className="font-display text-2xl font-semibold text-ink mt-1">Тохиролцоно</div>
              )}
              <div className="text-sm text-zinc-500 mt-2">{v.year} он{v.color ? ` · ${v.color}` : ''}{km ? ` · ${km}` : ''}</div>

              {leasingOn && (
                <button type="button" onClick={() => setCalcOpen(true)}
                  className="group w-full mt-5 flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 hover:bg-brand-soft px-4 py-3.5 text-left transition-colors">
                  <span className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-white ring-1 ring-ink/[0.06] text-brand flex items-center justify-center">{Ic.calc}</span>
                    <span>
                      <span className="block text-sm font-medium text-ink">Лизингийн тооцоолол</span>
                      <span className="block text-xs text-zinc-500">Сарын төлбөрөө тооцоолох</span>
                    </span>
                  </span>
                  <span className="text-zinc-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all">{Ic.arrow}</span>
                </button>
              )}

              {v.company?.phone && (
                <div className="space-y-2 mt-5">
                  <a href={`tel:${v.company.phone}`}
                    className="flex items-center justify-center gap-2 w-full h-14 rounded-full bg-ink hover:bg-brand text-white font-medium transition-colors">
                    <IcPhone cls="w-4 h-4" /> Залгах · {v.company.phone}
                  </a>
                  <a href={waHref} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-14 rounded-full bg-white ring-1 ring-ink/10 hover:ring-ink/30 text-ink font-medium transition-all">
                    <IcWa cls="w-4 h-4" /> WhatsApp-аар бичих
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-100">
                <BrandMark logoUrl={v.company?.logo_url} name={v.company?.name || ''} size={40} showName={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-500">Худалдагч</div>
                  <div className="font-medium text-ink text-sm truncate">{v.company?.name}</div>
                </div>
                <button onClick={copyLink} aria-label="Холбоос хуулах" title={copied ? 'Хуулагдлаа' : 'Холбоос хуулах'}
                  className="sm:hidden w-10 h-10 rounded-full bg-zinc-100 text-ink flex items-center justify-center">
                  {Ic.link}
                </button>
              </div>
            </div>
            {copied && <div className="sm:hidden text-center text-xs text-zinc-500">Холбоос хуулагдлаа</div>}
          </aside>
        </div>
      </main>

      {/* ── Similar vehicles ── */}
      {(others === null || others.length > 0) && (
        <section className="px-4 pt-16 sm:pt-24 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-2">Бусад машинууд</div>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-ink">Танд таалагдаж магадгүй</h2>
              </div>
              <Link href="/#cars" className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white ring-1 ring-ink/[0.08] text-sm font-medium text-ink hover:ring-ink/30 transition-all whitespace-nowrap">
                Бүгдийг үзэх {Ic.arrow}
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {others === null
                ? [...Array(4)].map((_, i) => <VehicleCardSkeleton key={i} />)
                : others.map((o) => <div key={o.id} className="reveal flex"><VehicleCard v={o} /></div>)}
            </div>
          </div>
        </section>
      )}

      <SiteFooter company={company} />

      <Lightbox images={fullImgs} index={lightbox} onClose={() => setLightbox(null)} onIndex={(i) => setLightbox(i)} />

      {leasingOn && <LeasingCalculator open={calcOpen} onClose={() => setCalcOpen(false)}
        price={price ? Number(v.price) : null}
        carName={`${v.year} ${v.brand} ${v.model}`} phone={v.company?.phone} />}

      {/* Mobile: хөвөгч доод мөр */}
      {v.company?.phone && (
        <div className="lg:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 glass rounded-full p-1.5 flex gap-1.5">
          {leasingOn && (
            <button type="button" onClick={() => setCalcOpen(true)} aria-label="Лизингийн тооцоолол"
              className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white border border-zinc-200 text-ink">
              {Ic.calc}
            </button>
          )}
          <a href={`tel:${v.company.phone}`}
            className="flex-1 flex items-center justify-center gap-2 bg-ink active:bg-brand text-white text-sm font-medium h-12 rounded-full">
            <IcPhone cls="w-4 h-4" /> Залгах
          </a>
          <a href={waHref} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-zinc-200 text-ink text-sm font-medium h-12 rounded-full">
            <IcWa cls="w-4 h-4" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

export default function VehicleClient({ id, initial }: { id: string; initial: VehicleDetail | null }) {
  return <Suspense><VehicleContent id={id} initial={initial} /></Suspense>;
}
