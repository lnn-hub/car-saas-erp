"use client";
import { useEffect, useRef } from "react";

export function Lightbox({ images, index, onClose, onIndex }: {
  images: string[]; index: number | null; onClose: () => void; onIndex: (i: number) => void;
}) {
  const touchX = useRef<number | null>(null);
  const open = index !== null && images.length > 0;
  const go = (d: number) => { if (index !== null) onIndex((index + d + images.length) % images.length); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  if (!open || index === null) return null;
  const btn = "absolute top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-[pageIn_0.2s_ease-out]"
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button onClick={onClose} aria-label="Хаах" className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      <div className="absolute top-5 left-5 text-white/70 text-sm tabular-nums">{index + 1} / {images.length}</div>

      <img src={images[index]} alt="" onClick={(e) => e.stopPropagation()}
        className="max-w-[94vw] max-h-[86vh] object-contain select-none" draggable={false} />

      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Өмнөх" className={`${btn} left-3 sm:left-6`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Дараах" className={`${btn} right-3 sm:right-6`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
