import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoDealer",
  description: "Чанартай машин — шууд таны гарт",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
