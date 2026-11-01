export const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Сайтын үндсэн хаяг (Facebook/Google-д зориулсан холбоос). Vercel production хаягийг автоматаар авна.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

// Олон компанит серверт: энэ нийтийн сайт аль компанийн өгөгдлийг харуулахыг тодорхойлно.
// Тохируулаагүй бол анхны компани (нэг компанит байршуулалт).
export const SITE_COMPANY = process.env.NEXT_PUBLIC_SITE_COMPANY || "";
export const companyQuery = () => (SITE_COMPANY ? `?company=${encodeURIComponent(SITE_COMPANY)}` : "");

export interface Features { reports?: boolean; sales?: boolean; team?: boolean; leasing?: boolean; compare?: boolean }

export interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  bio: string | null;
  photo_url: string | null;
}
export interface Company {
  name: string;
  phone: string;
  address: string;
  email?: string | null;
  working_hours?: string | null;
  logo_url: string | null;
  features?: Features;
  messenger_url?: string | null;
  viber_phone?: string | null;
  whatsapp_phone?: string | null;
}
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuel_type: string;
  transmission: string;
  engine_cc: string;
  mileage: number;
  has_plates: boolean;
  price: string | null;
  prev_price?: string | null;
  main_image: string | null;
  images?: string[];
}

export function imgUrl(u: string | null) {
  if (!u) return null;
  return u.startsWith("http") ? u : `${BACKEND}${u}`;
}

export interface SiteInitial {
  company: Company | null;
  vehicles: Vehicle[];
  team: TeamMember[];
}

export interface VehicleDetail {
  id: string; brand: string; model: string; year: number; color: string;
  fuel_type: string; transmission: string; engine_cc: string; mileage: number;
  description: string; has_plates: boolean; manufactured_date: string | null;
  price: string | null; prev_price?: string | null; images: string[];
  company: Company;
}

const isCld = (url: string) => url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/f_auto");

// Хэд хэдэн өргөнтэй хувилбар: хөтөч дэлгэцдээ тохирохыг нь сонгож татна (утсанд жижиг файл)
export function imgSrcSet(u: string | null, widths: number[]) {
  const url = imgUrl(u);
  if (!url || !isCld(url)) return undefined;
  return widths.map((w) => `${url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`)} ${w}w`).join(", ");
}

// Маш жижиг (≈1KB) бүдэг хувилбар — зураг ачаалагдах хүртэл саарал хайрцагны оронд харагдана
export function imgBlur(u: string | null) {
  const url = imgUrl(u);
  if (!url || !isCld(url)) return undefined;
  return url.replace("/upload/", "/upload/f_auto,q_auto:low,w_40,e_blur:400/");
}

// Cloudinary зургийг хэрэгтэй хэмжээгээр нь (багаар, auto format) авна
export function optimizeImg(u: string | null, width: number) {
  const url = imgUrl(u);
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/f_auto")) {
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
}
