"use client";
import { useEffect, useRef, useState } from "react";
import { imgUrl } from "@/lib/site";

// Лого байвал лого, үгүй бол нэрийн эхний үсэг. Лого дөрвөлжин (дүрс) бол нэрийг хажууд нь харуулна.
export function BrandMark({ logoUrl, name, size = 40, showName = true, onDark = false, nameClassName = "" }: {
  logoUrl?: string | null; name: string; size?: number; showName?: boolean; onDark?: boolean; nameClassName?: string;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = imgUrl(logoUrl ?? null);

  // Сервер талаас ирсэн зураг hydration-аас өмнө ачаалагдсан бол onLoad алдагддаг
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth) setRatio(el.naturalWidth / (el.naturalHeight || 1));
  }, [src]);

  if (src) {
    const compact = ratio !== null && ratio < 1.8;
    const img = (
      <img
        ref={imgRef}
        src={src}
        alt={name}
        onLoad={(e) => setRatio(e.currentTarget.naturalWidth / (e.currentTarget.naturalHeight || 1))}
        style={{ height: size }}
        className={`object-contain max-w-[180px] ${onDark ? "bg-white rounded-sm p-1 box-content" : ""}`}
      />
    );
    return (
      <span className="inline-flex items-center gap-2.5 min-w-0">
        {img}
        {showName && compact && <span className={`truncate ${nameClassName}`}>{name}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      <span
        style={{ width: size, height: size }}
        className="bg-brand rounded-sm flex items-center justify-center shrink-0 text-white font-bold"
      >
        <span style={{ fontSize: size * 0.45 }} className="leading-none">{name?.[0] || ""}</span>
      </span>
      {showName && <span className={`truncate ${nameClassName}`}>{name}</span>}
    </span>
  );
}
