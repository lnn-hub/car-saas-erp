export const FUEL: Record<string, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизель",
  HYBRID: "Хибрид",
  ELECTRIC: "Цахилгаан",
};
export const TRANS: Record<string, string> = { AUTO: "Автомат", MANUAL: "Механик" };

export function fmtPrice(n: string | number | null | undefined) {
  if (!n || Number(n) === 0) return null;
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + " сая ₮";
  return num.toLocaleString("en-US") + " ₮";
}

export function fmtKm(n: number | null | undefined) {
  if (!n) return null;
  return `${Number(n).toLocaleString("en-US")} км`;
}

export function fmtEngine(cc: string | number | null | undefined) {
  if (!cc || !Number(cc)) return null;
  return `${(Number(cc) / 1000).toFixed(1)}L`;
}
