"use client";
import { useEffect, useState, Suspense } from "react";
import { optimizeImg, SiteInitial } from "@/lib/site";
import { useSiteData } from "@/lib/useSiteData";
import { FUEL } from "@/lib/format";
import { useCompare, COMPARE_MAX } from "@/lib/compare";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MobileCallBar, SiteCta, SiteFooter } from "@/components/site/SiteFooter";
import { HeroSlides } from "@/components/site/HeroSlides";
import { CompareModal } from "@/components/site/CompareModal";
import { VehicleCard, VehicleCardSkeleton } from "@/components/site/VehicleCard";
import { IcPhone, IcPin } from "@/components/site/icons";
import { ChatIcon } from "@/components/site/ChatIcon";
import { LeadForm } from "@/components/site/LeadForm";
import { chatChannels } from "@/lib/contact";

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
function IcFilter({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
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
  const { ids: compare, toggle: toggleCompare, clear: clearCompare } = useCompare();
  const [compareOpen, setCompareOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [mapOn, setMapOn] = useState(false);
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
  const activeCount = [filterBrand, filterPrice, filterFuel, filterTrans].filter(Boolean).length;

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

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

  const chats = chatChannels(company);
  const info = [
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
        <div className="relative max-w-[1400px] mx-auto rounded-[28px] sm:rounded-[40px] overflow-hidden bg-ink text-white min-h-[440px] sm:min-h-[640px] lg:min-h-[700px] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-deep)_0%,#121010_60%)]" />
          <HeroSlides vehicles={vehicles} />

          <div className="relative px-5 sm:px-12 lg:px-16 pt-16 sm:pt-24 pb-12 sm:pb-20 max-w-4xl">
            <div className="inline-flex items-center gap-2.5 glass-dark rounded-full pl-2.5 pr-3.5 py-1 sm:pr-4 sm:py-1.5 text-xs sm:text-[13px] text-white/85 mb-4 sm:mb-8">
              <span className={`w-2 h-2 rounded-full ${loading || retrying ? "bg-amber-300 animate-pulse" : "bg-green-400 animate-[pulseDot_2s_ease-in-out_infinite]"}`} />
              {retrying ? "Сервер асаж байна, түр хүлээнэ үү..." : loading ? "Ачааллаж байна" : `${vehicles.length} машин худалдаанд байна`}
            </div>
            <h1 className="font-display text-[32px] leading-[1.05] sm:text-7xl lg:text-[88px] font-semibold tracking-[-0.04em]">
              Чанартай машин,
              <br />
              <span className="text-brand-light">шууд таны гарт.</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-lg leading-relaxed mt-3 sm:mt-7 max-w-xl">
              {company?.address
                ? `${company.address}. Бүх машин техникийн бүрэн үзлэгт тэнцсэн.`
                : "Бүх машин техникийн бүрэн үзлэгт тэнцсэн, нягт шалгагдсан."}
            </p>
            <div className="flex flex-wrap gap-3 mt-8 sm:mt-10">
              <button
                onClick={goCars}
                className="keep-white group inline-flex items-center gap-3 bg-white text-ink pl-5 sm:pl-6 pr-1.5 sm:pr-2 h-11 sm:h-14 rounded-full text-sm sm:text-base font-medium hover:bg-brand-soft transition-colors"
              >
                Машинууд үзэх
                <span className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center group-hover:bg-brand transition-colors">
                  <IcArrow />
                </span>
              </button>
              {company?.phone && (
                <a href={`tel:${company.phone}`} className="inline-flex items-center gap-2.5 glass-dark hover:bg-white/15 px-5 sm:px-6 h-11 sm:h-14 text-sm sm:text-base rounded-full font-medium transition-colors">
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
        <div className="relative z-10 mt-3 sm:mt-6 px-0 sm:px-8">
          {/* Утас: хайх мөр + шүүлтүүрийн товч */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              (document.activeElement as HTMLElement | null)?.blur();
              goCars();
            }}
            className="md:hidden flex items-center gap-1.5 bg-white rounded-full shadow-lift ring-1 ring-ink/5 p-1.5"
          >
            <label className="flex-1 min-w-0 flex items-center gap-2.5 pl-3.5 h-12">
              <IcSearch cls="w-5 h-5 text-zinc-500 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                enterKeyHint="search"
                placeholder="Марк, загвар хайх"
                className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-zinc-400 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="relative shrink-0 h-12 pl-4 pr-5 rounded-full bg-brand text-white text-sm font-medium flex items-center gap-2 active:bg-brand-dark"
            >
              <IcFilter /> Шүүлтүүр
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-ink text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">
                  {activeCount}
                </span>
              )}
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              goCars();
            }}
            className="hidden md:grid max-w-5xl mx-auto bg-white rounded-full shadow-lift ring-1 ring-ink/5 p-2 md:grid-cols-[1.6fr_1fr_1fr_auto] gap-0"
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
      <section id="cars" className="px-4 pt-10 sm:pt-24 pb-10 sm:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-5 mb-4 sm:mb-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Худалдаанд байгаа</div>
              <h2 className="font-display text-[28px] sm:text-5xl font-semibold tracking-[-0.03em] text-ink flex items-baseline gap-2.5 sm:gap-3">
                Машинууд
                <span className="text-zinc-400 text-xl sm:text-3xl tabular-nums">{loading ? "" : filtered.length}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {hasFilter && (
                <button onClick={clearAll} className="h-11 px-4 rounded-full text-sm text-zinc-600 hover:text-ink hover:bg-white transition-colors">
                  Цэвэрлэх
                </button>
              )}
              <button
                onClick={() => setSheetOpen(true)}
                className="sm:hidden inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-zinc-200 text-sm font-medium text-ink"
              >
                <IcFilter /> Шүүлтүүр, эрэмбэ
                {activeCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-brand text-white text-[11px] font-semibold flex items-center justify-center">{activeCount}</span>}
              </button>
              <label className="relative hidden sm:block">
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
          <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 sm:mb-8">
            <button onClick={() => setBrand("")} className={chip(!filterBrand)}>
              Бүгд <span className="ml-1 opacity-60 tabular-nums">{vehicles.length}</span>
            </button>
            {uniqueBrands.map((b) => (
              <button key={b} onClick={() => setBrand(filterBrand === b ? "" : b)} className={chip(filterBrand === b)}>
                {b} <span className="ml-1 opacity-60 tabular-nums">{brandCounts[b]}</span>
              </button>
            ))}
            {(fuelsInUse.length > 1 || transInUse.length > 1) && <span className="hidden sm:block w-px h-6 bg-zinc-200 shrink-0 mx-1" />}
            {fuelsInUse.length > 1 &&
              fuelsInUse.map((k) => (
                <button key={k} onClick={() => setFilterFuel(filterFuel === k ? "" : k)} className={`hidden sm:inline-block ${chip(filterFuel === k)}`}>
                  {FUEL[k]}
                </button>
              ))}
            {transInUse.length > 1 &&
              transInUse.map((k) => (
                <button key={k} onClick={() => setFilterTrans(filterTrans === k ? "" : k)} className={`hidden sm:inline-block ${chip(filterTrans === k)}`}>
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
      <section id="contact" className="px-4 py-8 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-6 sm:mb-10">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Холбоо барих</div>
            <h2 className="font-display text-[28px] sm:text-5xl font-semibold tracking-[-0.03em] text-ink leading-[1.05]">Бидэнтэй холбогдоорой</h2>
            <p className="text-zinc-600 text-sm sm:text-lg mt-3 sm:mt-4 leading-relaxed">
              Машин сонирхсон, үнэ болон үзэх цагийн талаар асуух зүйл байвал шууд холбогдоорой.
            </p>
          </div>

          {company?.phone || info.length ? (
            <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${company?.phone && info.length ? "lg:grid-cols-[1.05fr_1fr]" : ""}`}>
              {company?.phone && (
                <div className="reveal relative overflow-hidden bg-brand text-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 flex flex-col justify-between gap-10 min-h-[280px] sm:min-h-[360px]">
                  <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96" style={{ background: "radial-gradient(closest-side, rgb(255 255 255 / 0.14), transparent)" }} />
                  <div className="pointer-events-none absolute -left-16 -bottom-24 w-72 h-72" style={{ background: "radial-gradient(closest-side, rgb(0 0 0 / 0.14), transparent)" }} />
                  <div className="relative flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"><IcPhone cls="w-5 h-5" /></span>
                    <span className="text-sm text-white/75">Утсаар шууд холбогдох</span>
                  </div>
                  <div className="relative">
                    <a href={`tel:${company.phone}`} className="block font-display text-[40px] sm:text-6xl lg:text-7xl font-semibold tracking-tight tabular-nums leading-none hover:opacity-90 transition-opacity">
                      {company.phone}
                    </a>
                    <div className="flex flex-wrap items-center gap-2 mt-7">
                      <a href={`tel:${company.phone}`} className="keep-white inline-flex items-center gap-2 bg-white text-ink h-12 px-5 rounded-full text-sm font-medium hover:bg-brand-soft transition-colors">
                        <IcPhone cls="w-4 h-4" /> Залгах
                      </a>
                      <button type="button" onClick={() => setLeadOpen(true)} className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white h-12 px-5 rounded-full text-sm font-medium transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                        Үзэх цаг товлох
                      </button>
                      {chats.map((ch) => (
                        <a key={ch.key} href={ch.href} target="_blank" rel="noreferrer" aria-label={ch.label} title={ch.label}
                          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                          <ChatIcon ch={ch.key} cls="w-5 h-5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {info.length > 0 && (
                <div className="reveal bg-white rounded-[24px] sm:rounded-[28px] ring-1 ring-ink/[0.06] shadow-card overflow-hidden flex flex-col">
                  <ul className="divide-y divide-zinc-100">
                    {info.map((c) => {
                      const inner = (
                        <>
                          <span className="w-11 h-11 rounded-full bg-zinc-100 text-ink flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">{c.icon}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs text-zinc-500">{c.label}</span>
                            <span className="block text-[15px] font-medium text-ink break-words mt-0.5">{c.value}</span>
                          </span>
                          {c.href && (
                            <svg className="w-4 h-4 text-zinc-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
                          )}
                        </>
                      );
                      const cls = "group flex items-center gap-4 px-5 sm:px-6 py-4";
                      return (
                        <li key={c.key}>
                          {c.href ? (
                            <a href={c.href} {...(c.ext ? { target: "_blank", rel: "noreferrer" } : {})} className={`${cls} hover:bg-zinc-50 transition-colors`}>{inner}</a>
                          ) : (
                            <div className={cls}>{inner}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {company?.address && (
                    <div className="relative flex-1 min-h-[200px] sm:min-h-[220px] border-t border-zinc-100 bg-zinc-100">
                      {mapOn ? (
                        <iframe
                          title="Байршил газрын зураг дээр"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address)}&z=14&output=embed`}
                          referrerPolicy="no-referrer-when-downgrade"
                          className="contact-map absolute inset-0 w-full h-full border-0"
                        />
                      ) : (
                        // Google Maps-ийг дарсны дараа л ачаална (утсанд гүйлгэлтийг удаашруулахгүй)
                        <button type="button" onClick={() => setMapOn(true)}
                          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-ink transition-colors"
                          style={{ backgroundImage: "radial-gradient(rgb(0 0 0 / 0.07) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
                          <span className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-card"><IcPin cls="w-5 h-5" /></span>
                          <span className="text-sm font-medium">Газрын зураг харах</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[28px] ring-1 ring-ink/5 p-8 text-sm text-zinc-500">Холбоо барих мэдээлэл удахгүй нэмэгдэнэ.</div>
          )}
        </div>
      </section>

      <LeadForm open={leadOpen} onClose={() => setLeadOpen(false)} kind="VIEWING" />

      <SiteCta company={company} />
      <SiteFooter company={company} />

      {compareOn && compared.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 z-40 bg-ink/90 backdrop-blur-xl text-white rounded-full shadow-lift flex items-center gap-2 sm:gap-3 pl-2 pr-2 py-2 max-w-[calc(100vw-24px)] animate-[fadeUp_0.3s_var(--ease-out-expo)]">
          <div className="flex -space-x-2 pl-1">
            {compared.map((v) => (
              <span key={v.id} className="w-8 h-8 rounded-full ring-2 ring-ink bg-zinc-700 overflow-hidden">
                {v.main_image && <img src={optimizeImg(v.main_image, 96)!} alt="" className="w-full h-full object-cover" />}
              </span>
            ))}
          </div>
          <span className="text-sm whitespace-nowrap px-1">{compare.length}/{COMPARE_MAX}</span>
          <button onClick={clearCompare} className="text-sm text-white/60 hover:text-white whitespace-nowrap px-2 h-10">Цэвэрлэх</button>
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
            if (compared.length <= 2) setCompareOpen(false);
          }}
        />
      )}
      {/* Утас: шүүлтүүрийн доороос гарах цонх */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[90]" role="dialog" aria-label="Шүүлтүүр">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-[pageIn_0.2s_ease-out]" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] shadow-lift max-h-[88dvh] flex flex-col animate-[sheetUp_0.4s_var(--ease-out-expo)]">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-zinc-200" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="font-display text-xl font-semibold text-ink">Шүүлтүүр</h3>
              <button onClick={() => setSheetOpen(false)} aria-label="Хаах" className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-ink">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-6">
              {[
                {
                  title: "Эрэмбэлэх",
                  items: SORTS.filter((o) => hasPrices || !o.key.startsWith("price")).map((o) => ({ key: o.key || "new", label: o.label, on: sortBy === o.key, click: () => setSort(o.key) })),
                },
                {
                  title: "Марк",
                  items: [
                    { key: "all", label: `Бүгд · ${vehicles.length}`, on: !filterBrand, click: () => setBrand("") },
                    ...uniqueBrands.map((b) => ({ key: b, label: `${b} · ${brandCounts[b]}`, on: filterBrand === b, click: () => setBrand(filterBrand === b ? "" : b) })),
                  ],
                },
                ...(hasPrices
                  ? [{ title: "Үнэ", items: PRICE_RANGES.map((r) => ({ key: r.key, label: r.label, on: filterPrice === r.key, click: () => setPrice(filterPrice === r.key ? "" : r.key) })) }]
                  : []),
                ...(fuelsInUse.length > 1
                  ? [{ title: "Түлш", items: fuelsInUse.map((k) => ({ key: k, label: FUEL[k], on: filterFuel === k, click: () => setFilterFuel(filterFuel === k ? "" : k) })) }]
                  : []),
                ...(transInUse.length > 1
                  ? [{ title: "Хурдны хайрцаг", items: transInUse.map((k) => ({ key: k, label: k === "AUTO" ? "Автомат" : "Механик", on: filterTrans === k, click: () => setFilterTrans(filterTrans === k ? "" : k) })) }]
                  : []),
              ].map((g) => (
                <div key={g.title}>
                  <div className="text-sm font-medium text-zinc-500 mb-2.5">{g.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <button
                        key={it.key}
                        onClick={it.click}
                        className={`h-11 px-4 rounded-full text-sm font-medium border transition-colors ${
                          it.on ? "bg-ink border-ink text-white" : "bg-white border-zinc-200 text-zinc-700 active:bg-zinc-50"
                        }`}
                      >
                        {it.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-zinc-100">
              <button
                onClick={() => {
                  clearAll();
                  setSort("");
                }}
                className="h-12 px-5 rounded-full text-sm font-medium text-zinc-600 active:bg-zinc-100"
              >
                Цэвэрлэх
              </button>
              <button
                onClick={() => {
                  setSheetOpen(false);
                  goCars();
                }}
                className="flex-1 h-12 rounded-full bg-brand active:bg-brand-dark text-white text-sm font-medium"
              >
                {filtered.length} машин харах
              </button>
            </div>
          </div>
        </div>
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
