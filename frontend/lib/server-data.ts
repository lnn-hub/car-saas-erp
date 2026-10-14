import { cacheLife } from "next/cache";
import { companyQuery, type SiteInitial, type VehicleDetail } from "./site";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getJson(path: string) {
  // Render унтсан үед сэрэх хугацааг (~30с) тэсвэрлэнэ
  const r = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Нийтийн сайтын өгөгдөл: Vercel дээр кэшлэгдэнэ, 1 минутад арын фонд шинэчлэгдэнэ.
// Render унтсан үед ч хэрэглэгч кэшлэгдсэн хуудсыг шууд авна.
export async function getSiteData(): Promise<SiteInitial | null> {
  "use cache";
  let data: SiteInitial | null = null;
  try {
    const [company, vehicles, team] = await Promise.all([
      getJson(`/api/public${companyQuery()}`),
      getJson(`/api/public/vehicles${companyQuery()}`),
      getJson(`/api/public/team${companyQuery()}`).catch(() => []),
    ]);
    data = {
      company: company?.error ? null : company,
      vehicles: vehicles?.vehicles || [],
      team: Array.isArray(team) ? team : [],
    };
  } catch {}
  if (data) cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 * 24 });
  else cacheLife({ stale: 0, revalidate: 5, expire: 60 });
  return data;
}

export async function getVehicle(id: string): Promise<VehicleDetail | null> {
  "use cache";
  let data: VehicleDetail | null = null;
  try {
    const v = await getJson(`/api/public/vehicles/${encodeURIComponent(id)}${companyQuery()}`);
    data = v?.error ? null : v;
  } catch {}
  if (data) cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 * 24 });
  else cacheLife({ stale: 0, revalidate: 5, expire: 60 });
  return data;
}
