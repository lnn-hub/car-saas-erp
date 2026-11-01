'use client';
import { useSessionUser } from './client-state';

export type Role = 'ADMIN' | 'SALES' | 'FINANCE' | '';
export const ROLE_LABEL: Record<string, string> = { ADMIN: 'Админ', SALES: 'Борлуулагч', FINANCE: 'Нягтлан' };

// Нэвтэрсэн хэрэглэгчийн эрх. Backend мөн адил шалгадаг тул энэ нь зөвхөн UI-д харагдах эсэхийг шийднэ.
export function useRole() {
  const role = (useSessionUser()?.role || '') as Role;
  return { role, ready: role !== '', isAdmin: role === 'ADMIN', canSeeMoney: role === 'ADMIN' || role === 'FINANCE' };
}
