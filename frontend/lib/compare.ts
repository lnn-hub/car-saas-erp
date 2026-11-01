"use client";
import { useEffect, useState } from "react";

// Харьцуулах машинуудын жагсаалт — хуудас хооронд хадгалагдана (нүүр ↔ машины хуудас)
const KEY = "compare";
const EVT = "compare-change";
export const COMPARE_MAX = 3;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = (id: string) => {
    const cur = read();
    save(cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= COMPARE_MAX ? cur : [...cur, id]);
  };
  const clear = () => save([]);

  return { ids, toggle, clear };
}
