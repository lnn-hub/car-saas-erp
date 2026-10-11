import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const r = await fetch(`${api}/api/public`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const c = await r.json();
      if (c?.name) {
        return {
          title: { default: c.name, template: `%s | ${c.name}` },
          description: `${c.name} - чанартай машин шууд таны гарт`,
        };
      }
    }
  } catch {}
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
