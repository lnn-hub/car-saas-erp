"use client";
import { Suspense, useEffect } from "react";
import { optimizeImg, SiteInitial } from "@/lib/site";
import { useSiteData } from "@/lib/useSiteData";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MobileCallBar, SiteCta, SiteFooter } from "@/components/site/SiteFooter";

const sv = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const VALUES = [
  {
    t: "Нягт техникийн үзлэг",
    d: "Борлуулахын өмнө бүх машин үзлэгт орж, шалгагдана.",
    icon: <svg className="w-6 h-6" {...sv}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg>,
  },
  {
    t: "Ил тод мэдээлэл",
    d: "Он, гүйлт, түлш, хурдны хайрцаг, үнэ бүгд тодорхой харагдана.",
    icon: <svg className="w-6 h-6" {...sv}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  },
  {
    t: "Шууд холбоо",
    d: "Утсаар болон чатаар холбогдож, машиныг очиж үзэх цагаа товлох боломжтой.",
    icon: <svg className="w-6 h-6" {...sv}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  },
];

function AboutContent({ initial }: { initial: SiteInitial | null }) {
  const { company, vehicles, team, loading } = useSiteData(initial);
  const uniqueBrands = [...new Set(vehicles.map((v) => v.brand))];
  const collage = vehicles.filter((v) => v.main_image).slice(0, 3);

  useEffect(() => {
    if (company?.name) document.title = `Бидний тухай | ${company.name}`;
  }, [company?.name]);

  const stats = [
    { n: vehicles.length, l: "Машин худалдаанд" },
    { n: uniqueBrands.length, l: "Брэнд" },
    { n: vehicles.filter((v) => v.has_plates).length, l: "Дугаартай машин" },
    ...(team.length ? [{ n: team.length, l: "Багийн гишүүн" }] : []),
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader company={company} />

      {/* ━━━ HERO ━━━ */}
      <section className="px-3 sm:px-4">
        <div className="relative max-w-[1400px] mx-auto rounded-[28px] sm:rounded-[40px] overflow-hidden bg-ink text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--color-brand-deep)_0%,#121010_55%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.7) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          />
          <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center px-6 sm:px-12 lg:px-16 py-14 sm:py-20 lg:py-24">
            <div>
              <nav className="text-sm text-white/50 mb-6">
                <a href="/" className="hover:text-white transition-colors py-2">Нүүр</a>
                <span className="mx-2">/</span>
                <span className="text-white/80">Бидний тухай</span>
              </nav>
              <h1 className="font-display text-[40px] leading-[1.03] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.04em]">
                Итгэлтэй худалдаа,
                <br />
                <span className="text-brand-light">ил тод үйлчилгээ.</span>
              </h1>
              <p className="text-white/65 sm:text-lg leading-relaxed mt-6 max-w-lg">
                {company?.name ? `${company.name} нь ` : "Бид "}зөвхөн нягт шалгагдсан, мэдээлэл нь бүрэн ил тод машиныг санал болгож, сонголтоос эхлээд гэрээ хийх хүртэл тань хамт байна.
              </p>
              <a
                href="/#contact"
                className="keep-white group inline-flex items-center gap-3 bg-white text-ink pl-6 pr-2 h-14 rounded-full font-medium hover:bg-brand-soft transition-colors mt-8"
              >
                Холбогдох
                <span className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center group-hover:bg-brand transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </a>
            </div>

            {collage.length >= 3 && (
              <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-3 h-[420px]">
                {collage.map((v, i) => (
                  <div key={v.id} className={`relative overflow-hidden rounded-[24px] bg-white/5 ${i === 0 ? "row-span-2" : ""}`}>
                    <img src={optimizeImg(v.main_image, 800)!} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-3 left-3 glass-dark rounded-full px-3 py-1 text-xs">{v.year} {v.brand} {v.model}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ ҮНЭТ ЗҮЙЛС ━━━ */}
      <section className="px-4 pt-16 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-8 sm:mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Бидний зарчим</div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-ink leading-[1.05]">Яагаад бидийг сонгох вэ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {VALUES.map(({ t, d, icon }, i) => (
              <div key={t} className="reveal group bg-white rounded-[28px] ring-1 ring-ink/[0.06] shadow-card p-7 sm:p-8 hover:shadow-lift hover:-translate-y-1 transition-all duration-500 ease-out-expo">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">{icon}</div>
                  <span className="font-display text-sm font-semibold text-zinc-300 tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mt-8">{t}</h3>
                <p className="text-zinc-600 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          {/* Тоонууд */}
          <div className={`reveal mt-3 sm:mt-4 bg-white rounded-[28px] ring-1 ring-ink/[0.06] shadow-card grid grid-cols-2 ${stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {stats.map(({ n, l }, i) => (
              <div key={l} className={`p-6 sm:p-9 ${i % 2 ? "border-l border-zinc-100" : ""} ${i >= 2 ? "border-t lg:border-t-0 border-zinc-100" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
                <div className="font-display text-4xl sm:text-5xl font-semibold text-ink tabular-nums tracking-tight">{loading ? "—" : n}</div>
                <div className="text-sm text-zinc-500 mt-2">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ БАГ ━━━ */}
      {team.length > 0 && (
        <section id="team" className="px-4 pt-16 sm:pt-24 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-12">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand mb-3">Манай баг</div>
              <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-ink leading-[1.05]">Таныг угтах мэргэжлийн баг</h2>
              <p className="text-zinc-600 sm:text-lg leading-relaxed mt-4">
                Машин сонгохоос эхлээд гэрээ хийх хүртэл бүх шатанд танд зөвлөж, дэмжинэ.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {team.map((m) => {
                const src = optimizeImg(m.photo_url, 600);
                return (
                  <div key={m.id} className="reveal group bg-white rounded-[24px] sm:rounded-[28px] p-1.5 sm:p-2 ring-1 ring-ink/[0.06] shadow-card">
                    <div className="relative aspect-[4/5] rounded-[18px] sm:rounded-[22px] bg-zinc-100 overflow-hidden">
                      {src ? (
                        <img src={src} alt={m.name} loading="lazy" className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-[1.2s] ease-out-expo" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--color-brand-deep),#121010)]">
                          <span className="font-display text-5xl sm:text-6xl font-semibold text-white/85 tracking-tight">
                            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 sm:px-3 pt-4 pb-3">
                      <h3 className="font-display font-semibold text-ink text-base sm:text-lg leading-tight">{m.name}</h3>
                      {m.position && <div className="text-sm text-brand mt-1">{m.position}</div>}
                      {m.bio && <p className="hidden sm:block text-sm text-zinc-600 leading-relaxed mt-3">{m.bio}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="pt-10 sm:pt-16" />
      <SiteCta company={company} />
      <SiteFooter company={company} />
      <MobileCallBar company={company} />
    </div>
  );
}

export default function AboutClient({ initial }: { initial: SiteInitial | null }) {
  return (
    <Suspense>
      <AboutContent initial={initial} />
    </Suspense>
  );
}
