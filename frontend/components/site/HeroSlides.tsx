"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { imgSrcSet, optimizeImg, Vehicle } from "@/lib/site";
import { fmtPrice } from "@/lib/format";

const INTERVAL = 6000;

export function HeroSlides({ vehicles }: { vehicles: Vehicle[] }) {
  const slides = vehicles.filter((v) => v.main_image).slice(0, 5);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // Зөвхөн харагдаж буй болон дараагийн зургийг татна (утсанд эхэнд 5 том зураг зэрэг татахгүй)
  const [mounted, setMounted] = useState<number[]>([0]);
  useEffect(() => {
    const t = setTimeout(() => {
      setMounted((m) => [...new Set([...m, i, (i + 1) % Math.max(slides.length, 1)])]);
    }, i === 0 ? 1500 : 0);
    return () => clearTimeout(t);
  }, [i, slides.length]);

  // Ачаалагдсан зургууд: дараагийн зураг бэлэн болсон үед л солино (хар дэлгэц гарахгүй)
  const [loaded, setLoaded] = useState<number[]>([0]); // эхний зураг сервер талаас аль хэдийн харагдсан
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const next = (i + 1) % slides.length;
    if (!loaded.includes(next)) return;
    const t = setTimeout(() => setI(next), INTERVAL);
    return () => clearTimeout(t);
  }, [slides.length, i, paused, loaded]);

  if (!slides.length) return null;
  const idx = Math.min(i, slides.length - 1);
  const cur = slides[idx];
  const price = fmtPrice(cur.price);

  return (
    <>
      <div className="absolute inset-0" aria-hidden>
        {slides.map((v, k) => (k === idx || mounted.includes(k)) && (
          <div
            key={v.id}
            className={`absolute inset-0 transition-opacity duration-[1.4s] ease-out ${k === idx ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={optimizeImg(v.main_image, 1600)!}
              srcSet={imgSrcSet(v.main_image, [640, 960, 1280, 1600])}
              sizes="(max-width: 640px) 70vw, 100vw"
              alt=""
              fetchPriority={k === 0 ? "high" : "low"}
              decoding="async"
              onLoad={() => setLoaded((l) => (l.includes(k) ? l : [...l, k]))}
              className="w-full h-full object-cover sm:animate-[kenburns_14s_ease-in-out_infinite_alternate]"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/0" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />
      </div>

      {/* Одоо харагдаж буй машин */}
      <div
        className="hidden md:block absolute right-6 lg:right-10 bottom-[104px] z-10 w-[300px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Link
          href={`/vehicle/${cur.id}`}
          className="group glass-dark rounded-[22px] p-2 pr-4 flex items-center gap-3 text-white hover:bg-black/55 transition-colors"
        >
          <img
            src={optimizeImg(cur.main_image, 200)!}
            alt=""
            className="w-[76px] h-[56px] rounded-[14px] object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">{cur.year} · {cur.brand}</div>
            <div className="font-display font-semibold truncate">{cur.model}</div>
            {price && <div className="text-sm text-white/80 tabular-nums">{price}</div>}
          </div>
          <span className="w-9 h-9 rounded-full bg-white text-ink flex items-center justify-center shrink-0 group-hover:-rotate-45 transition-transform duration-300">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </Link>
      </div>

      {slides.length > 1 && (
        <div className="hidden sm:flex absolute right-6 lg:right-10 bottom-[68px] z-10 gap-1.5 md:w-[300px]">
          {slides.map((v, k) => (
            <button
              key={v.id}
              onClick={() => setI(k)}
              aria-label={`${k + 1}-р зураг`}
              className="flex-1 py-3 group"
            >
              <span className="relative block h-[3px] w-8 md:w-auto rounded-full bg-white/25 overflow-hidden">
                {k === idx && (
                  <span
                    key={`${idx}-${paused}`}
                    className="absolute inset-0 bg-white origin-left rounded-full"
                    style={{ animation: paused ? "none" : `progress ${INTERVAL}ms linear both` }}
                  />
                )}
                {k < idx && <span className="absolute inset-0 bg-white/70 rounded-full" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
