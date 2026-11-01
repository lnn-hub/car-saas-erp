import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/server-data";
import { imgUrl, SITE_URL } from "@/lib/site";

// Google-д сайтын хуудсуудыг мэдэгдэнэ (машин бүрийн хуудас орно)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSiteData();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...(data?.vehicles || []).map((v) => ({
      url: `${SITE_URL}/vehicle/${v.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(v.main_image ? { images: [imgUrl(v.main_image)!] } : {}),
    })),
  ];
}
