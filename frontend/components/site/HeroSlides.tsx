"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { optimizeImg, Vehicle } from "@/lib/site";

export function HeroSlides({ vehicles }: { vehicles: Vehicle[] }) {
  const slides = vehicles.filter((v) => v.main_image).slice(0, 5);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const cur = slides[Math.min(i, slides.length - 1)];

  return (
    <>
      <div className="absolute inset-0" aria-hidden>
        {slides.map((v, k) => (
          <img
            key={v.id}
            src={optimizeImg(v.main_image, 1600)!}
            alt=""
            loading={k === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${k === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-24 z-10 flex flex-col items-end gap-3">
        <Link
          href={`/vehicle/${cur.id}`}
          className="hidden sm:flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/15 text-white text-sm font-medium px-4 py-2.5 rounded-sm transition-colors"
        >
          {cur.year} {cur.brand} {cur.model}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
        {slides.length > 1 && (
          <div className="flex gap-2">
            {slides.map((v, k) => (
              <button
                key={v.id}
                onClick={() => setI(k)}
                aria-label={`${k + 1}-р зураг`}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
