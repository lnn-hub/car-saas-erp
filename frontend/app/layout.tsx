import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteData } from "@/lib/server-data";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const name = data?.company?.name;
  if (name) {
    return {
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
