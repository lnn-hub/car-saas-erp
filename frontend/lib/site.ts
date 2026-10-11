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
