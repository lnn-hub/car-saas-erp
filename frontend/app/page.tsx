"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SLUG = process.env.NEXT_PUBLIC_COMPANY_SLUG || "mongol-auto";

interface Company {
  name: string;
  phone: string;
  address: string;
  logo_url: string | null;
}
interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuel_type: string;
  transmission: string;
  engine_cc: string;
  mileage: number;
  has_plates: boolean;
  total_cost: string | null;
  main_image: string | null;
}

const FUEL: Record<string, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизель",
  HYBRID: "Хибрид",
  ELECTRIC: "Цахилгаан",
};

function imgUrl(u: string | null) {
  if (!u) return null;
  return u.startsWith("http") ? u : `${BACKEND}${u}`;
}
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
function IcPhone({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.05 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
function IcWa({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function IcPin({ cls = "w-4 h-4" }: { cls?: string }) {
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
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

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const days = ['Ням','Дав','Мяг','Лха','Пүр','Баа','Бям'];
  return `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${days[now.getDay()]} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function HomeContent() {
  const [company, setCompany] = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [filterTrans, setFilterTrans] = useState("");
  const [filterBrand, setBrand] = useState("");
  const [menuOpen, setMenu] = useState(false);
  const clock = useClock();

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/api/public/${SLUG}`).then((r) => r.json()),
      fetch(`${BACKEND}/api/public/${SLUG}/vehicles`).then((r) => r.json()),
    ])
      .then(([comp, data]) => {
        if (!comp.error) setCompany(comp);
        setVehicles(data.vehicles || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const uniqueBrands = [...new Set(vehicles.map((v) => v.brand))].sort();
  const fuelsInUse = [...new Set(vehicles.map((v) => v.fuel_type))];

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      (!q || `${v.brand} ${v.model} ${v.year}`.toLowerCase().includes(q)) &&
      (!filterFuel || v.fuel_type === filterFuel) &&
      (!filterTrans || v.transmission === filterTrans) &&
      (!filterBrand || v.brand === filterBrand)
    );
  });

  const hasFilter = search || filterFuel || filterTrans || filterBrand;
  const cname = company?.name || "AutoDealer";

  return (
    <div
      className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}
    >
      {/* ━━━ NAVBAR ━━━ */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Top bar */}
        <div className="bg-[#c00] text-white text-xs">
          <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between">
            <span className="opacity-80 font-mono tracking-wide">{clock}</span>
            <div className="flex items-center gap-4">
              {company?.phone && (
                <a href={`tel:${company.phone}`} className="hidden sm:flex items-center gap-1.5 font-semibold">
                  <IcPhone cls="w-3 h-3" />{company.phone}
                </a>
              )}
              <span className="opacity-40">|</span>
              <span className="opacity-80 hidden sm:block">{company?.address || "Улаанбаатар хот"}</span>
            </div>
          </div>
        </div>
        {/* Main nav */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <a href="#" className="flex items-center gap-3">
              {company?.logo_url ? (
                <img
                  src={imgUrl(company.logo_url)!}
                  className="h-10 object-contain"
                  alt=""
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[#c00] rounded flex items-center justify-center">
                    <span className="text-white font-black text-lg leading-none">
                      {cname[0]}
                    </span>
                  </div>
                  <span className="font-black text-[#111] text-lg tracking-tight">
                    {cname}
                  </span>
                </div>
              )}
            </a>

            <nav className="hidden md:flex items-center gap-1">
              {[
                ["#", "Нүүр хуудас"],
                ["#cars", "Машинууд"],
                ["#about", "Бидний тухай"],
                ["#contact", "Холбоо барих"],
              ].map(([h, l]) => (
                <a
                  key={h}
                  href={h}
                  className="px-4 py-2 text-sm font-semibold text-[#333] hover:text-[#c00] transition-colors rounded-lg hover:bg-[#fff0f0]"
                >
                  {l}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="hidden lg:flex items-center gap-2 bg-[#c00] hover:bg-[#a00] text-white text-sm font-bold px-5 py-2.5 rounded transition-colors"
                >
                  <IcPhone /> Залгах
                </a>
              )}
              <Link href="/login"
                className="hidden md:flex items-center gap-1.5 border border-gray-200 hover:border-[#c00] hover:text-[#c00] text-gray-500 text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                Админ
              </Link>
              <button
                onClick={() => setMenu(!menuOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {menuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
            {[
              ["#", "Нүүр хуудас"],
              ["#cars", "Машинууд"],
              ["#about", "Бидний тухай"],
              ["#contact", "Холбоо барих"],
            ].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMenu(false)}
                className="block py-2 px-3 text-sm font-semibold text-[#333] hover:text-[#c00] rounded hover:bg-[#fff0f0]">
                {l}
              </a>
            ))}
            <Link href="/login" onClick={() => setMenu(false)}
              className="block py-2 px-3 text-sm font-semibold text-[#c00] rounded hover:bg-[#fff0f0]">
              Админ нэвтрэх →
            </Link>
          </div>
        )}
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className="relative bg-[#111] text-white overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(135deg,#1a0000 0%,#111 50%,#0a1a0a 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.5) 39px,rgba(255,255,255,0.5) 40px)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#c00]/20 border border-[#c00]/30 text-red-300 text-xs font-bold px-3 py-1.5 rounded-full mb-4 sm:mb-6 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              {loading
                ? "Ачааллаж байна"
                : `${vehicles.length} машин зарагдаж байна`}
            </div>
            <h1 className="text-3xl sm:text-6xl font-black leading-tight tracking-tight mb-3 sm:mb-5">
              Чанартай машин —<br />
              <span className="text-[#ff3333]">шууд таны гарт</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg leading-relaxed mb-6 sm:mb-10 max-w-xl">
              {company?.address
                ? `${company.address} — бүх машин техникийн бүрэн үзлэгт тэнцсэн.`
                : "Бүх машин техникийн бүрэн үзлэгт тэнцсэн, нягт шалгагдсан."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#cars"
                className="bg-[#c00] active:bg-[#a00] text-white font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded transition-colors text-sm"
              >
                Машинуудыг үзэх
              </a>
              {company?.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="border border-white/20 active:border-white/50 text-white font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded transition-colors text-sm"
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
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c00] transition-colors"
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
              className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-600 focus:outline-none focus:border-[#c00] bg-white transition-colors font-semibold"
            >
              <option value="">Бүх марк</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
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
                    ? "bg-[#c00] border-[#c00] text-white"
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
                }}
                className="text-sm text-[#c00] hover:underline"
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
                    className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-transparent hover:border-[#c00]/20 active:scale-[0.98]"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-gray-100 overflow-hidden">
                      {src ? (
                        <img
                          src={src}
                          alt={`${v.brand} ${v.model}`}
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
                      <div className="absolute top-2 left-2 bg-[#111]/80 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded">
                        {v.year}
                      </div>
                      {v.has_plates && (
                        <div className="absolute top-2 right-2 bg-[#c00] text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Дугаартай
                        </div>
                      )}
                      {/* Red hover line */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c00] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </div>

                    {/* Info */}
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      {/* Name */}
                      <div className="mb-2 sm:mb-3">
                        <div className="text-[10px] sm:text-[11px] font-bold text-[#c00] uppercase tracking-wider mb-0.5">
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
                            <div className="text-[13px] sm:text-[15px] font-black text-[#c00] leading-tight">
                              {price}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] sm:text-sm text-gray-400 italic">
                            Тохиролцоно
                          </div>
                        )}
                        <span className="shrink-0 bg-[#c00] text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-colors whitespace-nowrap">
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

      {/* ━━━ ABOUT ━━━ */}
      <section
        id="about"
        className="py-16 px-4 bg-white border-t border-gray-100"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-[#c00] uppercase tracking-widest mb-3">
                Бидний тухай
              </div>
              <h2 className="text-3xl font-black text-[#111] mb-4 leading-tight">
                Яагаад бидэнд
                <br />
                хандах вэ?
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {new Date().getFullYear() - 2010}+ жилийн туршлагатай баг. Бүх
                машин техникийн нягт үзлэгт орж, шалгагдсаны дараа зарагдана.
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-[#c00] hover:bg-[#a00] text-white text-sm font-bold px-6 py-3 rounded transition-colors"
              >
                Холбогдох
              </a>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              {[
                {
                  n: `${vehicles.length}`,
                  l: "Нийт машин",
                  sub: "Агуулахад байгаа",
                },
                {
                  n: `${new Date().getFullYear() - 2010}+`,
                  l: "Жил",
                  sub: "Туршлага",
                },
                { n: "100%", l: "Шалгасан", sub: "Бүх машин" },
              ].map(({ n, l, sub }) => (
                <div
                  key={l}
                  className="bg-[#f9f9f9] rounded-xl p-5 text-center border border-gray-100"
                >
                  <div className="text-3xl font-black text-[#c00] mb-1">
                    {n}
                  </div>
                  <div className="text-sm font-bold text-[#111]">{l}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ CONTACT ━━━ */}
      <section
        id="contact"
        className="py-16 px-4 bg-[#f5f5f5] border-t border-gray-200"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold text-[#c00] uppercase tracking-widest mb-2">
              Холбоо барих
            </div>
            <h2 className="text-3xl font-black text-[#111]">
              Бидэнтэй холбогдоорой
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-[#c00] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-[#c00] rounded-xl flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <IcPhone cls="w-5 h-5" />
                </div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Утас
                </div>
                <div className="font-black text-[#111] text-base">
                  {company.phone}
                </div>
              </a>
            )}
            {company?.phone && (
              <a
                href={`https://wa.me/976${company.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-[#25d366] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-[#25d366] rounded-xl flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <IcWa cls="w-5 h-5" />
                </div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  WhatsApp
                </div>
                <div className="font-black text-[#111] text-base">Мессеж</div>
              </a>
            )}
            {company?.address && (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
                <div className="w-12 h-12 bg-[#111] rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                  <IcPin cls="w-5 h-5" />
                </div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Байршил
                </div>
                <div className="font-bold text-[#111] text-sm">
                  {company.address}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="bg-[#111] text-gray-500">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#c00] rounded flex items-center justify-center">
                <span className="text-white font-black text-sm">
                  {cname[0]}
                </span>
              </div>
              <span className="text-white font-black text-base">{cname}</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              {[
                ["#cars", "Машинууд"],
                ["#about", "Бидний тухай"],
                ["#contact", "Холбоо барих"],
              ].map(([h, l]) => (
                <a
                  key={h}
                  href={h}
                  className="hover:text-white transition-colors"
                >
                  {l}
                </a>
              ))}
              <Link
                href="/admin"
                className="hover:text-white transition-colors"
              >
                Нэвтрэх
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-xs text-center text-gray-600">
            © {new Date().getFullYear()} {cname}. Бүх эрх хуулиар хамгаалагдсан.
          </div>
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
