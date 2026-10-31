"use client";
import { useState, Suspense } from "react";
import { optimizeImg, SiteInitial } from "@/lib/site";
import { useSiteData } from "@/lib/useSiteData";
import { FUEL } from "@/lib/format";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MobileCallBar, SiteCta, SiteFooter } from "@/components/site/SiteFooter";
import { HeroSlides } from "@/components/site/HeroSlides";
import { CompareModal } from "@/components/site/CompareModal";
import { VehicleCard, VehicleCardSkeleton } from "@/components/site/VehicleCard";
import { IcPhone, IcWa, IcPin } from "@/components/site/icons";

function IcSearch({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="7.5" />
      <path d="M20.5 20.5L16.5 16.5" />
    </svg>
  );
}
function IcArrow({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IcChevron() {
  return (
    <svg className="w-4 h-4 text-zinc-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const PRICE_RANGES: { key: string; label: string; min: number; max: number }[] = [
  { key: "lt50", label: "50 саяас бага", min: 0, max: 50_000_000 },
  { key: "50_100", label: "50 - 100 сая", min: 50_000_000, max: 100_000_000 },
  { key: "100_200", label: "100 - 200 сая", min: 100_000_000, max: 200_000_000 },
  { key: "gt200", label: "200 саяас дээш", min: 200_000_000, max: Infinity },
];
const SORTS: { key: string; label: string }[] = [
  { key: "", label: "Шинээр нэмэгдсэн" },
  { key: "price_asc", label: "Үнэ: багаас их" },
  { key: "price_desc", label: "Үнэ: ихээс бага" },
  { key: "year_desc", label: "Он: шинэ нь эхэнд" },
  { key: "km_asc", label: "Гүйлт: бага нь эхэнд" },
];

function HomeContent({ initial }: { initial: SiteInitial | null }) {
  const { company, vehicles, loading, retrying } = useSiteData(initial);
  const [search, setSearch] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [filterTrans, setFilterTrans] = useState("");
  const [filterBrand, setBrand] = useState("");
  const [filterPrice, setPrice] = useState("");
  const [sortBy, setSort] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));
  const compareOn = company?.features?.compare !== false;
  const compared = vehicles.filter((v) => compare.includes(v.id));

  const brandCounts = vehicles.reduce<Record<string, number>>((m, v) => ((m[v.brand] = (m[v.brand] || 0) + 1), m), {});
  const uniqueBrands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a] || a.localeCompare(b));
  const fuelsInUse = [...new Set(vehicles.map((v) => v.fuel_type))].filter((f) => FUEL[f]);
  const transInUse = (["AUTO", "MANUAL"] as const).filter((k) => vehicles.some((v) => v.transmission === k));

  const hasPrices = vehicles.some((v) => Number(v.price) > 0);
  const range = PRICE_RANGES.find((r) => r.key === filterPrice);
  const priceOf = (v: (typeof vehicles)[number]) => Number(v.price) || 0;

  const filtered = vehicles
    .filter((v) => {
      const q = search.trim().toLowerCase();
      return (
        (!q || `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q)) &&
        (!filterFuel || v.fuel_type === filterFuel) &&
        (!filterTrans || v.transmission === filterTrans) &&
        (!filterBrand || v.brand === filterBrand) &&
        (!range || (priceOf(v) > 0 && priceOf(v) >= range.min && priceOf(v) < range.max))
      );
    })
    .sort((a, b) => {
      if (sortBy === "price_asc" || sortBy === "price_desc") {
        const dir = sortBy === "price_asc" ? 1 : -1;
        // үнэгүй машин үргэлж төгсгөлд
        if (!priceOf(a) && !priceOf(b)) return 0;
        if (!priceOf(a)) return 1;
        if (!priceOf(b)) return -1;
        return (priceOf(a) - priceOf(b)) * dir;
      }
      if (sortBy === "year_desc") return b.year - a.year;
      if (sortBy === "km_asc") return (a.mileage || 0) - (b.mileage || 0);
      return 0;
    });

  const hasFilter = !!(search || filterFuel || filterTrans || filterBrand || filterPrice);
  const clearAll = () => {
    setSearch("");
    setFilterFuel("");
    setFilterTrans("");
    setBrand("");
    setPrice("");
  };
  const goCars = () => document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });

  const stats = [
    { n: loading ? "—" : vehicles.length, l: "Машин худалдаанд" },
    { n: loading ? "—" : uniqueBrands.length, l: "Брэнд" },
    { n: loading ? "—" : vehicles.filter((v) => v.has_plates).length, l: "Дугаартай" },
  ];

  const chip = (active: boolean) =>
    `shrink-0 h-10 px-4 rounded-full text-sm font-medium border transition-all ${
      active ? "bg-ink border-ink text-white shadow-card" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`;

  const contacts = [
    company?.phone && { key: "wa", href: `https://wa.me/976${company.phone.replace(/\D/g, "")}`, label: "WhatsApp", value: "Мессеж бичих", icon: <IcWa cls="w-5 h-5" />, ext: true },
    company?.email && {
      key: "mail", href: `mailto:${company.email}`, label: "И-мэйл", value: company.email, ext: false,
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M22 7l-10 6L2 7" /></svg>,
    },
    company?.working_hours && {
      key: "hours", href: "", label: "Ажлын цаг", value: company.working_hours, ext: false,
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    },
    company?.address && { key: "addr", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`, label: "Байршил", value: company.address, icon: <IcPin cls="w-5 h-5" />, ext: true },
  ].filter(Boolean) as { key: string; href: string; label: string; value: string; icon: React.ReactNode; ext: boolean }[];

  return (
    <div className="min-h-screen">
      <SiteHeader company={company} />

      {/* ━━━ HERO ━━━ */}
      <section className="px-3 sm:px-4">
        <div className="relative max-w-[1400px] mx-auto rounded-[28px] sm:rounded-[40px] overflow-hidden bg-ink text-white min-h-[560px] sm:min-h-[640px] lg:min-h-[700px] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#5a1420_0%,#121010_60%)]" />
          <HeroSlides vehicles={vehicles} />

          <div className="relative px-6 sm:px-12 lg:px-16 pt-24 pb-24 sm:pb-28 max-w-4xl">
            <div className="inline-flex items-center gap-2.5 glass-dark rounded-full pl-2.5 pr-4 py-1.5 text-[13px] text-white/85 mb-6 sm:mb-8">
              <span className={`w-2 h-2 rounded-full ${loading || retrying ? "bg-amber-300 animate-pulse" : "bg-green-400 animate-[pulseDot_2s_ease-in-out_infinite]"}`} />
              {retrying ? "Сервер асаж байна, түр хүлээнэ үү..." : loading ? "Ачааллаж байна" : `${vehicles.length} машин худалдаанд байна`}
            </div>
            <h1 className="font-display text-[42px] leading-[1.02] sm:text-7xl lg:text-[88px] font-semibold tracking-[-0.04em]">
              Чанартай машин,
              <br />
              <span className="text-brand-light">шууд таны гарт.</span>
            </h1>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed mt-5 sm:mt-7 max-w-xl">
              {company?.address
                ? `${company.address}. Бүх машин техникийн бүрэн үзлэгт тэнцсэн.`
                : "Бүх машин техникийн бүрэн үзлэгт тэнцсэн, нягт шалгагдсан."}
            </p>
            <div className="flex flex-wrap gap-3 mt-8 sm:mt-10">
              <button
                onClick={goCars}
                className="group inline-flex items-center gap-3 bg-white text-ink pl-6 pr-2 h-14 rounded-full font-medium hover:bg-brand-soft transition-colors"
              >
                Машинууд үзэх
                <span className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center group-hover:bg-brand transition-colors">
                  <IcArrow />
                </span>
              </button>
              {company?.phone && (
                <a href={`tel:${company.phone}`} className="inline-flex items-center gap-2.5 glass-dark hover:bg-white/15 px-6 h-14 rounded-full font-medium transition-colors">
                  <IcPhone cls="w-4 h-4" /> {company.phone}
                </a>
              )}
            </div>
            <dl className="hidden sm:flex gap-10 mt-12">
              {stats.map(({ n, l }) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-4xl font-semibold tabular-nums tracking-tight">{n}</dd>
                  <div className="text-sm text-white/55 mt-1">{l}</div>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Хайлтын самбар */}
        <div className="relative z-10 -mt-10 sm:-mt-12 px-2 sm:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goCars();
            }}
            className="max-w-5xl mx-auto bg-white rounded-[26px] md:rounded-full shadow-lift ring-1 ring-ink/5 p-2 grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_auto] gap-1 md:gap-0"
          >
            <label className="col-span-2 md:col-span-1 flex items-center gap-3 px-4 md:px-6 h-14 md:h-16 rounded-full hover:bg-zinc-50 focus-within:bg-zinc-50 transition-colors cursor-text">
              <IcSearch cls="w-5 h-5 text-zinc-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Хайх</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Марк, загвар, он..."
                  className="w-full bg-transparent text-[15px] text-ink placeholder:text-zinc-400 focus:outline-none"
                />
              </span>
            </label>
            <label className="relative flex flex-col justify-center px-4 md:px-6 h-14 md:h-16 rounded-full hover:bg-zinc-50 transition-colors md:border-l border-zinc-100 cursor-pointer">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Марк</span>
              <select value={filterBrand} onChange={(e) => setBrand(e.target.value)} className="appearance-none bg-transparent text-[15px] text-ink focus:outline-none pr-6 cursor-pointer">
                <option value="">Бүх марк</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <IcChevron />
            </label>
            <label className={`relative flex flex-col justify-center px-4 md:px-6 h-14 md:h-16 rounded-full hover:bg-zinc-50 transition-colors md:border-l border-zinc-100 cursor-pointer ${hasPrices ? "" : "opacity-50"}`}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Үнэ</span>
              <select value={filterPrice} onChange={(e) => setPrice(e.target.value)} disabled={!hasPrices} className="appearance-none bg-transparent text-[15px] text-ink focus:outline-none pr-6 cursor-pointer">
                <option value="">Бүх үнэ</option>
                {PRICE_RANGES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <IcChevron />
            </label>
            <button type="submit" className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white h-14 md:h-16 md:w-16 lg:w-auto lg:px-8 rounded-full font-medium transition-colors">
              <IcSearch cls="w-5 h-5" />
              <span className="md:hidden lg:inline">{hasFilter ? `${filtered.length} машин` : "Хайх"}</span>
            </button>
          </form>
        </div>
      </section>

      {/* ━━━ МАШИНУУД ━━━ */}
      <section id="cars" className="px-4 pt-16 sm:pt-24 pb-12 sm:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6 sm:mb-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Худалдаанд байгаа</div>
              <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-ink flex items-baseline gap-3">
                Машинууд
                <span className="text-zinc-400 text-2xl sm:text-3xl tabular-nums">{loading ? "" : filtered.length}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {hasFilter && (
                <button onClick={clearAll} className="h-11 px-4 rounded-full text-sm text-zinc-600 hover:text-ink hover:bg-white transition-colors">
                  Цэвэрлэх
                </button>
              )}
              <label className="relative">
                <span className="sr-only">Эрэмбэлэх</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none h-11 pl-4 pr-10 rounded-full bg-white border border-zinc-200 text-sm font-medium text-ink focus:outline-none focus:border-ink/40 cursor-pointer"
                >
                  {SORTS.filter((o) => hasPrices || !o.key.startsWith("price")).map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <IcChevron />
              </label>
            </div>
          </div>

          {/* Шүүлтүүр чипүүд */}
          <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-6 sm:mb-8">
            <button onClick={() => setBrand("")} className={chip(!filterBrand)}>
              Бүгд <span className="ml-1 opacity-60 tabular-nums">{vehicles.length}</span>
            </button>
            {uniqueBrands.map((b) => (
              <button key={b} onClick={() => setBrand(filterBrand === b ? "" : b)} className={chip(filterBrand === b)}>
                {b} <span className="ml-1 opacity-60 tabular-nums">{brandCounts[b]}</span>
              </button>
            ))}
            {(fuelsInUse.length > 1 || transInUse.length > 1) && <span className="w-px h-6 bg-zinc-200 shrink-0 mx-1" />}
            {fuelsInUse.length > 1 &&
              fuelsInUse.map((k) => (
                <button key={k} onClick={() => setFilterFuel(filterFuel === k ? "" : k)} className={chip(filterFuel === k)}>
                  {FUEL[k]}
                </button>
              ))}
            {transInUse.length > 1 &&
              transInUse.map((k) => (
                <button key={k} onClick={() => setFilterTrans(filterTrans === k ? "" : k)} className={chip(filterTrans === k)}>
                  {k === "AUTO" ? "Автомат" : "Механик"}
                </button>
              ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <VehicleCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 sm:py-28 bg-white rounded-[32px] ring-1 ring-ink/5">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5 text-zinc-400">
                <IcSearch cls="w-7 h-7" />
              </div>
              <p className="font-display text-xl font-semibold text-ink">Машин олдсонгүй</p>
              <p className="text-zinc-500 text-sm mt-1.5 mb-6">Шүүлтүүрээ өөрчлөөд дахин оролдоно уу</p>
              <button onClick={clearAll} className="h-11 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-brand transition-colors">
                Шүүлтийг цэвэрлэх
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {filtered.map((v, i) => (
                <div key={v.id} className="reveal flex">
                  <VehicleCard
                    v={v}
                    priority={i < 4}
                    compareOn={compareOn}
                    compared={compare.includes(v.id)}
                    onCompare={toggleCompare}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ━━━ ХОЛБОО БАРИХ ━━━ */}
      <section id="contact" className="px-4 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-8 sm:mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Холбоо барих</div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-ink leading-[1.05]">Бидэнтэй холбогдоорой</h2>
            <p className="text-zinc-600 sm:text-lg mt-4 leading-relaxed">
              Машин сонирхсон, үнэ болон үзэх цагийн талаар асуух зүйл байвал шууд холбогдоорой.
            </p>
          </div>

          {company?.phone || contacts.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="reveal group relative overflow-hidden sm:col-span-2 lg:row-span-2 bg-brand text-white rounded-[28px] p-7 sm:p-10 flex flex-col justify-between min-h-[260px] sm:min-h-[340px]"
                >
                  <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
                  <div className="relative w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                    <IcPhone cls="w-6 h-6" />
                  </div>
                  <div className="relative">
                    <div className="text-white/70 text-sm mb-2">Утсаар шууд</div>
                    <div className="font-display text-4xl sm:text-6xl font-semibold tracking-tight tabular-nums">{company.phone}</div>
                    <div className="mt-6 inline-flex items-center gap-3 bg-white text-ink pl-5 pr-1.5 h-12 rounded-full text-sm font-medium">
                      Залгах
                      <span className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center group-hover:-rotate-45 transition-transform duration-300">
                        <IcArrow />
                      </span>
                    </div>
                  </div>
                </a>
              )}
              {contacts.map((c) => {
                const inner = (
                  <>
                    <div className="w-12 h-12 rounded-full bg-zinc-100 text-ink flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                      {c.icon}
                    </div>
                    <div className="mt-6 min-w-0">
                      <div className="text-sm text-zinc-500">{c.label}</div>
                      <div className="font-display text-lg font-semibold text-ink mt-0.5 break-words">{c.value}</div>
                    </div>
                  </>
                );
                const cls = "reveal group bg-white rounded-[28px] p-6 sm:p-7 ring-1 ring-ink/[0.06] shadow-card flex flex-col justify-between min-h-[160px] transition-all duration-500 ease-out-expo";
                return c.href ? (
                  <a key={c.key} href={c.href} {...(c.ext ? { target: "_blank", rel: "noreferrer" } : {})} className={`${cls} hover:shadow-lift hover:-translate-y-1`}>
                    {inner}
                  </a>
                ) : (
                  <div key={c.key} className={cls}>{inner}</div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[28px] ring-1 ring-ink/5 p-8 text-sm text-zinc-500">Холбоо барих мэдээлэл удахгүй нэмэгдэнэ.</div>
          )}
        </div>
      </section>

      <SiteCta company={company} />
      <SiteFooter company={company} />

      {compareOn && compare.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 z-40 bg-ink/90 backdrop-blur-xl text-white rounded-full shadow-lift flex items-center gap-2 sm:gap-3 pl-2 pr-2 py-2 max-w-[calc(100vw-24px)] animate-[fadeUp_0.3s_var(--ease-out-expo)]">
          <div className="flex -space-x-2 pl-1">
            {compared.map((v) => (
              <span key={v.id} className="w-8 h-8 rounded-full ring-2 ring-ink bg-zinc-700 overflow-hidden">
                {v.main_image && <img src={optimizeImg(v.main_image, 96)!} alt="" className="w-full h-full object-cover" />}
              </span>
            ))}
          </div>
          <span className="text-sm whitespace-nowrap px-1">{compare.length}/3</span>
          <button onClick={() => setCompare([])} className="text-sm text-white/60 hover:text-white whitespace-nowrap px-2 h-10">Цэвэрлэх</button>
          <button
            onClick={() => setCompareOpen(true)}
            disabled={compare.length < 2}
            className="bg-white text-ink hover:bg-brand-soft disabled:bg-white/10 disabled:text-white/40 text-sm font-medium px-5 h-10 rounded-full transition-colors whitespace-nowrap"
          >
            {compare.length < 2 ? "2+ сонгоно уу" : "Харьцуулах"}
          </button>
        </div>
      )}
      {compareOpen && compared.length >= 2 && (
        <CompareModal
          vehicles={compared}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => {
            toggleCompare(id);
            if (compare.length <= 2) setCompareOpen(false);
          }}
        />
      )}
      <MobileCallBar company={company} />
    </div>
  );
}

export default function HomeClient({ initial }: { initial: SiteInitial | null }) {
  return (
    <Suspense>
      <HomeContent initial={initial} />
    </Suspense>
  );
}
