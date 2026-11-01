'use client';
import { useSyncExternalStore } from 'react';

// Харанхуй горим: <html class="theme-dark">. Анх ачаалахад app/layout.tsx-ийн скрипт тавина
// (хадгалсан сонголт эсвэл төхөөрөмжийн тохиргоо), энд зөвхөн солих товчийг удирдана.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('theme')||localStorage.getItem('admin-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('theme-dark')}catch(e){}`;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const isDark = () => document.documentElement.classList.contains('theme-dark');

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle('theme-dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
    listeners.forEach((l) => l());
  };
  return { dark, toggle };
}
