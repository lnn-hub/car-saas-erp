'use client';
import { useSyncExternalStore } from 'react';

// Зөвхөн хөтөч дээр мэдэгдэх утгууд (localStorage, одоогийн цаг).
// useSyncExternalStore ашигласнаар сервер болон hydration үед `fallback` буцааж, дараа нь хөтчийн утга руу
// шилждэг тул effect дотор setState дуудах шаардлагагүй (prerender болон hydration-ийн зөрүүгүй).

const noSubscribe = () => () => {};

// Анх ачаалахад нэг удаа уншдаг энгийн (primitive) утга. Объект буцаавал render бүрт шинэ болж гацна.
export function useClientValue<T extends string | number | boolean | null>(get: () => T, fallback: T): T {
  return useSyncExternalStore(noSubscribe, get, () => fallback);
}

// Өнөөдрийн огноо "YYYY-MM-DD" (сервер дээр хоосон мөр)
export const useToday = () => useClientValue(() => new Date().toISOString().slice(0, 10), '');

// Одоогийн цаг, минут тутам шинэчлэгдэнэ (сервер дээр null)
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 5000);
  return () => clearInterval(t);
};
export function useNowMinute(): number | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60000) * 60000,
    () => null,
  );
}

// Нэвтэрсэн хэрэглэгч (localStorage "user"). Өөр цонхонд гарч/нэвтэрвэл шинэчлэгдэнэ.
export interface SessionUser {
  id?: string;
  name?: string;
  role?: string;
  company_name?: string;
}
let cachedRaw: string | null | undefined;
let cachedUser: SessionUser | null = null;
function readUser(): SessionUser | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem('user');
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}
const subscribeStorage = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};
export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribeStorage, readUser, () => null);
}
