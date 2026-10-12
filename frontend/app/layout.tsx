import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteData } from "@/lib/server-data";
import { optimizeImg } from "@/lib/site";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const name = data?.company?.name;
  const logoIcon = optimizeImg(data?.company?.logo_url ?? null, 128);
  // Лого байхгүй бол брэндийн өнгөтэй, нэрийн эхний үсэгтэй дүрс
  const letter = (name?.[0] || "A").replace(/[<>&"']/g, "");
  const letterIcon = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#8b1e2d"/><text x="32" y="45" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`
  )}`;
  const icon = logoIcon || letterIcon;
  if (name) {
    return {
      ...(icon ? { icons: { icon, apple: icon } } : {}),
      title: { default: name, template: `%s | ${name}` },
      description: `${name} - чанартай машин шууд таны гарт`,
    };
  }
  return { title: "Автомашины худалдаа", description: "Чанартай машин шууд таны гарт" };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
