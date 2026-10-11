"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { imgUrl } from "@/lib/site";
import { useSiteData } from "@/lib/useSiteData";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteCta, SiteFooter } from "@/components/site/SiteFooter";
import { IcPhone, IcWa, IcPin } from "@/components/site/icons";


const FUEL: Record<string, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизель",
  HYBRID: "Хибрид",
  ELECTRIC: "Цахилгаан",
};

function fmtPrice(n: string | number | null) {
  if (!n || Number(n) === 0) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + " сая ₮";
  return num.toLocaleString("mn-MN") + " ₮";
}
function fmtKm(n: number) {
  if (!n) return null;
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k км` : `${n} км`;
}

/* ─── Icons ─── */
function IcSearch({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IcFuel() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16M3 22h14M13 4h2l2 2v3.5a1.5 1.5 0 003 0V8l-2-2" />
      <path d="M7 14h4v4H7z" />
    </svg>
  );
}
function IcGear() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function IcOdo() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function IcEngine() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <path d="M6 7V5M18 7V5M6 17v2M18 17v2M2 12h2M20 12h2" />
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
  { key: "", label: "Эрэмбэ: Шинэ" },
  { key: "price_asc", label: "Үнэ: багаас их" },
  { key: "price_desc", label: "Үнэ: ихээс бага" },
  { key: "year_desc", label: "Он: шинэ нь эхэнд" },
  { key: "km_asc", label: "Гүйлт: бага нь эхэнд" },
];

function HomeContent() {
  const { company, vehicles, loading, retrying } = useSiteData();
  const [search, setSearch] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [filterTrans, setFilterTrans] = useState("");
  const [filterBrand, setBrand] = useState("");
  const [filterPrice, setPrice] = useState("");
  const [sortBy, setSort] = useState("");

  const uniqueBrands = [...new Set(vehicles.map((v) => v.brand))].sort();
  const fuelsInUse = [...new Set(vehicles.map((v) => v.fuel_type))];

  const hasPrices = vehicles.some((v) => Number(v.total_cost) > 0);
  const range = PRICE_RANGES.find((r) => r.key === filterPrice);
  const priceOf = (v: (typeof vehicles)[number]) => Number(v.total_cost) || 0;

  const filtered = vehicles
    .filter((v) => {
      const q = search.toLowerCase();
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

  const hasFilter = search || filterFuel || filterTrans || filterBrand || filterPrice;
  const cname = company?.name ?? "";

  return (
    <div
      className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}
    >
      <SiteHeader company={company} />

      {/* ━━━ HERO ━━━ */}
      <section className="relative bg-[#111] text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(135deg,#2a0a10 0%,#111 55%,#0d0d0d 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px)",
          }}
        />
        <div className="pointer-events-none select-none absolute top-6 left-1/2 -translate-x-1/2 text-[72px] sm:text-[200px] font-black uppercase tracking-tighter text-white/[0.03] whitespace-nowrap">
          {cname}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-white/80 text-[10px] font-black px-3 py-1.5 rounded-sm mb-4 sm:mb-6 tracking-[0.2em] uppercase">
              <span
                className={`w-1.5 h-1.5 bg-red-400 rounded-full ${loading || retrying ? "animate-pulse" : ""}`}
              />
              {retrying
                ? "Сервер асаж байна, түр хүлээнэ үү..."
                : loading
                  ? "Ачааллаж байна"
                  : `${vehicles.length} машин зарагдаж байна`}
            </div>
            <h1 className="text-3xl sm:text-6xl font-black leading-tight tracking-tight mb-3 sm:mb-5">
              Чанартай машин
              <span className="text-brand-light"> шууд таны гарт</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg leading-relaxed mb-6 sm:mb-10 max-w-xl">
              {company?.address
                ? `${company.address} — бүх машин техникийн бүрэн үзлэгт тэнцсэн.`
                : "Бүх машин техникийн бүрэн үзлэгт тэнцсэн, нягт шалгагдсан."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#cars"
                className="bg-brand hover:bg-white hover:text-[#111] text-white font-black uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 rounded-sm transition-colors text-[11px]"
              >
                Машинуудыг үзэх
              </a>
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="border border-white/25 hover:border-white text-white font-bold uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 rounded-sm transition-colors text-[11px]"
                >
                  <span className="flex items-center gap-2">
                    <IcPhone cls="w-3.5 h-3.5" />
                    {company.phone}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="relative border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {[
                { n: loading ? "—" : vehicles.length, l: "Нийт машин" },
                {
                  n: loading
                    ? "—"
                    : [...new Set(vehicles.map((v) => v.brand))].length,
                  l: "Брэнд",
                },
                {
                  n: `${new Date().getFullYear() - 2010}+`,
                  l: "Жилийн туршлага",
                },
              ].map(({ n, l }) => (
                <div key={l} className="py-4 sm:py-5 text-center">
                  <div className="text-xl sm:text-3xl font-black text-white tabular-nums">
                    {n}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 uppercase tracking-wider">
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FILTER BAR ━━━ */}
      <section
        id="cars"
        className="bg-white border-b border-gray-200 sticky top-[96px] z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto">
          {/* Search row – full width on mobile */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <IcSearch cls="w-3.5 h-3.5" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Марк, загвар хайх..."
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
          {/* Chips row – horizontal scroll on mobile */}
          <div
            className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Brand */}
            <select
              value={filterBrand}
              onChange={(e) => setBrand(e.target.value)}
              className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-600 focus:outline-none focus:border-brand bg-white transition-colors font-semibold"
            >
              <option value="">Бүх марк</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {hasPrices && (
              <select
                value={filterPrice}
                onChange={(e) => setPrice(e.target.value)}
                className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-600 focus:outline-none focus:border-brand bg-white transition-colors font-semibold"
              >
                <option value="">Бүх үнэ</option>
                {PRICE_RANGES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSort(e.target.value)}
              className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-600 focus:outline-none focus:border-brand bg-white transition-colors font-semibold"
            >
              {SORTS.filter((o) => hasPrices || !o.key.startsWith("price")).map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="w-px h-5 bg-gray-200 shrink-0" />
            {/* Fuel chips */}
            {fuelsInUse.map((k) => (
              <button
                key={k}
                onClick={() => setFilterFuel(filterFuel === k ? "" : k)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filterFuel === k
                    ? "bg-brand border-brand text-white"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {FUEL[k]}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 shrink-0" />
            {/* Trans chips */}
            {[
              ["AUTO", "Автомат"],
              ["MANUAL", "Механик"],
            ].map(
              ([k, l]) =>
                vehicles.some((v) => v.transmission === k) && (
                  <button
                    key={k}
                    onClick={() => setFilterTrans(filterTrans === k ? "" : k)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      filterTrans === k
                        ? "bg-[#111] border-[#111] text-white"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {l}
                  </button>
                ),
            )}
            {hasFilter && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterFuel("");
                  setFilterTrans("");
                  setBrand("");
                  setPrice("");
                }}
                className="shrink-0 ml-auto px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200"
              >
                × Цэвэрлэх
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ CAR GRID ━━━ */}
      <section className="py-5 sm:py-8 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl overflow-hidden animate-pulse shadow-sm"
                >
                  <div className="aspect-[16/10] bg-gray-100" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-full mt-2" />
                    <div className="h-6 bg-gray-100 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-gray-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
                  <rect x="7" y="17" width="10" height="4" rx="2" />
                  <path d="M5 11L7.5 5h9L19 11" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm mb-3">Машин олдсонгүй</p>
              <button
                onClick={() => {
                  setSearch("");
                  setFilterFuel("");
                  setFilterTrans("");
                  setBrand("");
                  setPrice("");
                }}
                className="text-sm text-brand hover:underline"
              >
                Шүүлтийг цэвэрлэх
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {filtered.map((v) => {
                const src = imgUrl(v.main_image);
                const price = fmtPrice(v.total_cost);
                const km = fmtKm(v.mileage);
                const cc = v.engine_cc
                  ? `${(Number(v.engine_cc) / 1000).toFixed(1)}L`
                  : null;
                return (
                  <Link
                    key={v.id}
                    href={`/vehicle/${v.id}`}
                    className="group bg-white rounded-sm overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-zinc-200 hover:border-brand/40"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-gray-100 overflow-hidden">
                      {src ? (
                        <img
                          src={src}
                          alt={`${v.brand} ${v.model}`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            viewBox="0 0 200 130"
                            className="w-3/4 opacity-20"
                          >
                            <path
                              d="M30 90 L42 55 Q50 38 68 34 L100 30 L132 34 Q150 38 158 55 L170 90 Z"
                              fill="#999"
                            />
                            <path
                              d="M68 34 L76 14 Q80 8 90 7 L110 7 Q120 8 124 14 L132 34 Z"
                              fill="#bbb"
                            />
                            <circle cx="60" cy="98" r="16" fill="#666" />
                            <circle cx="60" cy="98" r="10" fill="#999" />
                            <circle cx="140" cy="98" r="16" fill="#666" />
                            <circle cx="140" cy="98" r="10" fill="#999" />
                          </svg>
                        </div>
                      )}
                      {/* Year badge */}
                      <div className="absolute top-2 left-2 bg-[#111]/85 text-white text-[10px] sm:text-[11px] font-black tracking-wider px-2 py-0.5 rounded-sm">
                        {v.year}
                      </div>
                      {v.has_plates && (
                        <div className="absolute top-2 right-2 bg-brand text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
                          Дугаартай
                        </div>
                      )}
                      {/* Red hover line */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </div>

                    {/* Info */}
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      {/* Name */}
                      <div className="mb-2 sm:mb-3">
                        <div className="text-[10px] sm:text-[11px] font-black text-brand uppercase tracking-[0.18em] mb-0.5">
                          {v.brand}
                        </div>
                        <h3 className="font-extrabold text-[#111] text-[13px] sm:text-[15px] leading-tight">
                          {v.model}
                        </h3>
                      </div>

                      {/* Specs – 2 items only on mobile, 4 on desktop */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 sm:mb-4">
                        <div className="flex items-center gap-1 text-[11px] sm:text-[12px] text-gray-500">
                          <span className="text-gray-400">
                            <IcFuel />
                          </span>
                          {FUEL[v.fuel_type]}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] sm:text-[12px] text-gray-500">
                          <span className="text-gray-400">
                            <IcGear />
                          </span>
                          {v.transmission === "AUTO" ? "Авт" : "Мех"}
                        </div>
                        {km && (
                          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-gray-500">
                            <span className="text-gray-400">
                              <IcOdo />
                            </span>
                            {km}
                          </div>
                        )}
                        {cc && (
                          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-gray-500">
                            <span className="text-gray-400">
                              <IcEngine />
                            </span>
                            {cc}
                          </div>
                        )}
                      </div>

                      {/* Price + CTA */}
                      <div className="mt-auto pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                        {price ? (
                          <div>
                            <div className="hidden sm:block text-[10px] text-gray-400 uppercase tracking-wide">
                              Үнэ
                            </div>
                            <div className="text-[13px] sm:text-[16px] font-black text-[#111] leading-tight">
                              {price}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] sm:text-sm text-gray-400 italic">
                            Тохиролцоно
                          </div>
                        )}
                        <span className="shrink-0 bg-[#111] group-hover:bg-brand text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-3.5 py-2 rounded-sm transition-colors whitespace-nowrap">
                          Үзэх →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ━━━ CONTACT ━━━ */}
      <section
        id="contact"
        className="py-16 sm:py-24 px-4 bg-[#f5f5f5] border-t border-zinc-200"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="text-[10px] font-black text-brand uppercase tracking-[0.25em] mb-3">
              Холбоо барих
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#111] leading-tight border-l-4 border-brand pl-4 mb-5">
              Бидэнтэй
              <br />
              холбогдоорой
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-md">
              Машин сонирхсон, үнэ болон үзэх цагийн талаар асуух зүйл байвал
              доорх сувгуудаар шууд холбогдоорой.
            </p>
          </div>

          <div className="space-y-3">
            {[
              company?.phone && {
                href: `tel:${company.phone}`,
                label: "Утас",
                value: company.phone,
                icon: <IcPhone cls="w-5 h-5" />,
                bg: "bg-brand",
                ext: false,
              },
              company?.phone && {
                href: `https://wa.me/976${company.phone.replace(/\D/g, "")}`,
                label: "WhatsApp",
                value: "Мессеж бичих",
                icon: <IcWa cls="w-5 h-5" />,
                bg: "bg-[#25d366]",
                ext: true,
              },
              company?.email && {
                href: `mailto:${company.email}`,
                label: "И-мэйл",
                value: company.email,
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                ),
                bg: "bg-brand-dark",
                ext: false,
              },
              company?.working_hours && {
                href: "#contact",
                label: "Ажлын цаг",
                value: company.working_hours,
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                ),
                bg: "bg-zinc-500",
                ext: false,
              },
              company?.address && {
                href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`,
                label: "Байршил",
                value: company.address,
                icon: <IcPin cls="w-5 h-5" />,
                bg: "bg-[#111]",
                ext: true,
              },
            ]
              .filter(Boolean)
              .map((c) => {
                const it = c as {
                  href: string;
                  label: string;
                  value: string;
                  icon: React.ReactNode;
                  bg: string;
                  ext: boolean;
                };
                return (
                  <a
                    key={it.label}
                    href={it.href}
                    {...(it.ext ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="group flex items-center gap-4 bg-white border border-zinc-200 border-l-4 border-l-zinc-300 hover:border-l-brand p-4 sm:p-5 transition-all hover:shadow-md"
                  >
                    <div
                      className={`w-12 h-12 ${it.bg} rounded-sm flex items-center justify-center text-white shrink-0`}
                    >
                      {it.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">
                        {it.label}
                      </div>
                      <div className="font-black text-[#111] text-base sm:text-lg truncate">
                        {it.value}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                );
              })}
            {!company?.phone && !company?.address && (
              <div className="bg-white border border-zinc-200 p-6 text-sm text-gray-400">
                Холбоо барих мэдээлэл удахгүй нэмэгдэнэ.
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteCta company={company} />
      <SiteFooter company={company} />
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
