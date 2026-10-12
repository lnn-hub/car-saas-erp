export const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  total_cost: string | null;
  main_image: string | null;
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
  total_cost: string | null; images: string[];
  company: Company;
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
