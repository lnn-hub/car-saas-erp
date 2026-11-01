"use client";
import { useEffect, useState } from "react";

export type Role = "ADMIN" | "SALES" | "FINANCE" | "";
export const ROLE_LABEL: Record<string, string> = { ADMIN: "Админ", SALES: "Борлуулагч", FINANCE: "Нягтлан" };

// Нэвтэрсэн хэрэглэгчийн эрх. Backend мөн адил шалгадаг тул энэ нь зөвхөн UI-д харагдах эсэхийг шийднэ.
export function useRole() {
  const [role, setRole] = useState<Role>("");
  useEffect(() => {
    try { setRole(JSON.parse(localStorage.getItem("user") || "{}").role || ""); } catch {}
  }, []);
  return { role, ready: role !== "", isAdmin: role === "ADMIN", canSeeMoney: role === "ADMIN" || role === "FINANCE" };
}
