"use client";
import Link from "next/link";
import { optimizeImg, Vehicle } from "@/lib/site";
import { FUEL, fmtEngine, fmtKm, fmtPrice } from "@/lib/format";

export function CarPlaceholder({ className = "w-2/3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 130" className={`${className} opacity-[0.12]`} aria-hidden>
      <path d="M30 90 L42 55 Q50 38 68 34 L100 30 L132 34 Q150 38 158 55 L170 90 Z" fill="currentColor" />
      <path d="M68 34 L76 14 Q80 8 90 7 L110 7 Q120 8 124 14 L132 34 Z" fill="currentColor" />
      <circle cx="60" cy="98" r="16" fill="currentColor" />
      <circle cx="140" cy="98" r="16" fill="currentColor" />
    </svg>
  );
}

export function VehicleCard({
  v,
  compareOn = false,
  compared = false,
  onCompare,
  priority = false,
}: {
  v: Vehicle;
  compareOn?: boolean;
  compared?: boolean;
  onCompare?: (id: string) => void;
  priority?: boolean;
}) {
  const src = optimizeImg(v.main_image, 720);
  const src2 = v.images?.[1] ? optimizeImg(v.images[1], 720) : null;
  const price = fmtPrice(v.price);
  const km = fmtKm(v.mileage);
  const cc = fmtEngine(v.engine_cc);
  const specs = [km, FUEL[v.fuel_type], v.transmission === "AUTO" ? "Автомат" : "Механик", cc].filter(Boolean) as string[];

  return (
    <Link
      href={`/vehicle/${v.id}`}
      className="group relative w-full flex flex-col bg-white rounded-[22px] sm:rounded-[26px] p-1.5 sm:p-2 ring-1 ring-ink/[0.06] shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-500 ease-out-expo"
    >
      {/* Зураг */}
      <div className="relative aspect-[4/3] rounded-[17px] sm:rounded-[20px] overflow-hidden bg-zinc-100 text-zinc-500">
        {src ? (
          <>
            <img
              src={src}
              alt={`${v.year} ${v.brand} ${v.model}`}
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[1.2s] ease-out-expo"
            />
            {src2 && (
              <img
                src={src2}
                alt=""
                loading="lazy"
                className="hidden sm:block absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CarPlaceholder />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5">
          <span className="bg-white/90 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-ink tabular-nums">
            {v.year}
          </span>
          {v.has_plates && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-brand/90 px-2.5 py-1 text-xs font-medium text-white">
              Дугаартай
            </span>
          )}
        </div>

        {compareOn && onCompare && (
          <button
            type="button"
            aria-pressed={compared}
            aria-label="Харьцуулахад нэмэх"
            title="Харьцуулах"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCompare(v.id);
            }}
            className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full ${compared ? "flex" : "hidden sm:flex"} items-center justify-center transition-all duration-300 ${
              compared
                ? "bg-brand text-white shadow-lg scale-100"
                : "bg-white/90 text-ink sm:opacity-0 sm:scale-90 group-hover:opacity-100 group-hover:scale-100"
            }`}
          >
            {compared ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M12 8v8M8 12h8" /></svg>
            )}
          </button>
        )}
      </div>

      {/* Мэдээлэл */}
      <div className="flex flex-col flex-1 px-2 sm:px-3 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="text-[11px] sm:text-xs font-medium text-zinc-500 uppercase tracking-[0.08em]">{v.brand}</div>
        <h3 className="mt-0.5 font-display text-[15px] sm:text-lg font-semibold text-ink leading-snug truncate">{v.model}</h3>

        <div className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] text-zinc-600 truncate">
          <span className="sm:hidden">{specs.slice(0, 2).join(" · ")}</span>
          <span className="hidden sm:inline">{specs.join("  ·  ")}</span>
        </div>

        <div className="mt-auto pt-3 sm:pt-4 flex items-end justify-between gap-2">
          {price ? (
            <div className="font-display text-[15px] sm:text-[22px] font-semibold text-ink tabular-nums leading-none tracking-tight whitespace-nowrap">{price}</div>
          ) : (
            <div className="text-sm text-zinc-500">Үнэ тохиролцоно</div>
          )}
          <span className="shrink-0 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-zinc-100 text-ink group-hover:bg-brand group-hover:text-white flex items-center justify-center transition-all duration-300 group-hover:-rotate-45">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-white rounded-[22px] sm:rounded-[26px] p-1.5 sm:p-2 ring-1 ring-ink/[0.06] animate-pulse">
      <div className="aspect-[4/3] rounded-[17px] sm:rounded-[20px] bg-zinc-100" />
      <div className="px-2 sm:px-3 pt-4 pb-3 space-y-2.5">
        <div className="h-3 bg-zinc-100 rounded-full w-1/3" />
        <div className="h-4 bg-zinc-100 rounded-full w-2/3" />
        <div className="h-3 bg-zinc-100 rounded-full w-full" />
        <div className="h-6 bg-zinc-100 rounded-full w-1/2 mt-4" />
      </div>
    </div>
  );
}
