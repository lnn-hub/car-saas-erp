"use client";
import { Suspense, useEffect } from "react";
import { optimizeImg, SiteInitial } from "@/lib/site";
import { useSiteData } from "@/lib/useSiteData";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MobileCallBar, SiteCta, SiteFooter } from "@/components/site/SiteFooter";

function AboutContent({ initial }: { initial: SiteInitial | null }) {
  const { company, vehicles, team, loading } = useSiteData(initial);
  const uniqueBrands = [...new Set(vehicles.map((v) => v.brand))];
  const cname = company?.name ?? "";

  useEffect(() => {
    if (company?.name) document.title = `Бидний тухай | ${company.name}`;
  }, [company?.name]);

  return (
    <div className="min-h-screen bg-[#f6f3ef] pb-[76px] lg:pb-0">
      <SiteHeader company={company} />

      {/* ━━━ PAGE HERO ━━━ */}
      <section className="relative bg-[#111] text-white overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(135deg,#2a0a10 0%,#111 55%,#0d0d0d 100%)" }} />
        <div className="pointer-events-none select-none absolute top-4 left-1/2 -translate-x-1/2 text-[72px] sm:text-[200px] font-semibold uppercase tracking-tighter text-white/[0.03] whitespace-nowrap">
          {cname}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-14 sm:py-24">
          <nav className="text-xs font-semibold text-white/50 mb-4">
            <a href="/" className="hover:text-white transition-colors">Нүүр</a>
            <span className="mx-2">/</span>
            <span className="text-brand-light">Бидний тухай</span>
          </nav>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight max-w-3xl">
            Итгэлтэй худалдаа,<br />
            <span className="text-brand-light">ил тод үйлчилгээ</span>
          </h1>
        </div>
      </section>

      {/* ━━━ ABOUT ━━━ */}
      <section
        id="about"
        className="py-16 sm:py-24 px-4 bg-white border-t border-zinc-200"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div className="text-xs font-semibold text-brand mb-3">
              Бидний тухай
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#111] leading-tight border-l-4 border-brand pl-4 mb-5">
              Яагаад бидэнд
              <br />
              итгэх вэ?
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
              {new Date().getFullYear() - 2010}+ жилийн туршлагатай баг. Бид
              зөвхөн нягт шалгагдсан, мэдээлэл нь бүрэн ил тод машиныг танд
              санал болгоно.
            </p>

            <div className="divide-y divide-zinc-200 border-y border-zinc-200 mb-8">
              {[
                [
                  "01",
                  "Нягт техникийн үзлэг",
                  "Борлуулахын өмнө бүх машин үзлэгт орж, шалгагдана.",
                ],
                [
                  "02",
                  "Ил тод мэдээлэл",
                  "Он, гүйлт, түлш, хурдны хайрцаг бүгд тодорхой харагдана.",
                ],
                [
                  "03",
                  "Шууд холбоо",
                  "Утас, WhatsApp-аар холбогдож машиныг очиж үзэх боломжтой.",
                ],
              ].map(([n, t, d]) => (
                <div key={n} className="flex gap-4 py-4 group">
                  <div className="text-2xl font-bold text-zinc-300 group-hover:text-brand transition-colors tabular-nums w-10 shrink-0">
                    {n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#111]">
                      {t}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{d}</div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/#contact"
              className="inline-flex items-center gap-2 bg-[#111] hover:bg-brand text-white text-sm px-7 py-3.5 rounded-sm transition-colors font-medium"
            >
              Холбогдох
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>

          <div className="relative bg-[#111] border-t-4 border-brand overflow-hidden">
            <div className="pointer-events-none select-none absolute -bottom-6 -right-2 text-[120px] sm:text-[180px] font-bold leading-none text-white/[0.04]">
              {new Date().getFullYear() - 2010}+
            </div>
            <div className="relative grid grid-cols-2 divide-x divide-y divide-white/10">
              {[
                {
                  n: loading ? "—" : vehicles.length,
                  l: "Нийт машин",
                  sub: "Одоо зарагдаж буй",
                },
                {
                  n: loading ? "—" : uniqueBrands.length,
                  l: "Брэнд",
                  sub: "Сонголтын олон хувилбар",
                },
                {
                  n: `${new Date().getFullYear() - 2010}+`,
                  l: "Жил",
                  sub: "Зах зээлийн туршлага",
                },
                { n: "100%", l: "Шалгасан", sub: "Бүх машин үзлэгт орсон" },
              ].map(({ n, l, sub }) => (
                <div key={l} className="p-6 sm:p-9">
                  <div className="text-4xl sm:text-5xl font-bold text-white tabular-nums leading-none mb-3">
                    {n}
                  </div>
                  <div className="text-xs font-semibold text-brand-light">
                    {l}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ TEAM ━━━ */}
      {team.length > 0 && (
        <section id="team" className="py-16 sm:py-24 px-4 bg-[#faf8f5] border-t border-zinc-200">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-10 sm:mb-14">
              <div className="text-xs font-semibold text-brand mb-3">Манай баг</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#111] leading-tight border-l-4 border-brand pl-4 mb-4">
                Таныг угтах<br />мэргэжлийн баг
              </h2>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                Машин сонгохоос эхлээд гэрээ хийх хүртэл бүх шатанд танд зөвлөж, дэмжинэ.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {team.map((m) => {
                const src = optimizeImg(m.photo_url, 600);
                return (
                  <div key={m.id} className="group bg-white border border-zinc-200 hover:border-brand/40 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="relative aspect-[4/5] bg-zinc-100 overflow-hidden">
                      {src ? (
                        <img src={src} alt={m.name} loading="lazy"
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a0a10] to-[#111]">
                          <span className="text-5xl sm:text-6xl font-bold text-white/80 tracking-tight">
                            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </div>
                    <div className="p-3 sm:p-5">
                      {m.position && (
                        <div className="text-xs sm:text-xs font-semibold text-brand mb-1">{m.position}</div>
                      )}
                      <h3 className="font-bold text-[#111] text-sm sm:text-lg leading-tight">{m.name}</h3>
                      {m.bio && <p className="hidden sm:block text-sm text-gray-500 leading-relaxed mt-2">{m.bio}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
