"use client";
import { useEffect, useState } from "react";

// Харанхуй горим: <html class="theme-dark">. Анх ачаалахад app/layout.tsx-ийн скрипт тавина
// (хадгалсан сонголт эсвэл төхөөрөмжийн тохиргоо), энд зөвхөн солих товчийг удирдана.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('theme')||localStorage.getItem('admin-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('theme-dark')}catch(e){}`;

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("theme-dark"));
  }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("theme-dark");
    document.documentElement.classList.toggle("theme-dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  };
  return { dark, toggle };
}
