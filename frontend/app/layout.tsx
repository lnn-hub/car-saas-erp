import type { Metadata, Viewport } from 'next';
import { Onest, Geologica } from 'next/font/google';
import './globals.css';
import { getSiteData } from '@/lib/server-data';
import { optimizeImg, SITE_URL } from '@/lib/site';
import { THEME_SCRIPT } from '@/lib/theme';

const onest = Onest({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-onest', display: 'swap' });
const geologica = Geologica({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-geologica',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f3f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0e0d' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const name = data?.company?.name;
  const logoIcon = optimizeImg(data?.company?.logo_url ?? null, 128);
  // Лого байхгүй бол брэндийн өнгөтэй, нэрийн эхний үсэгтэй дүрс
  const letter = (name?.[0] || 'A').replace(/[<>&"']/g, '');
  const letterIcon = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1f5c4a"/><text x="32" y="45" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`,
  )}`;
  const icon = logoIcon || letterIcon;
  if (name) {
    const description = `${name} - чанартай машин шууд таны гарт. ${data?.vehicles.length || 0} машин худалдаанд байна.`;
    const ogImage =
      optimizeImg(data?.vehicles.find((v) => v.main_image)?.main_image ?? null, 1200) ||
      optimizeImg(data?.company?.logo_url ?? null, 600);
    return {
      metadataBase: new URL(SITE_URL),
      ...(icon ? { icons: { icon, apple: icon } } : {}),
      title: { default: name, template: `%s | ${name}` },
      description,
      openGraph: {
        type: 'website',
        siteName: name,
        title: name,
        description,
        locale: 'mn_MN',
        ...(ogImage ? { images: [{ url: ogImage, width: 1200 }] } : {}),
      },
      twitter: { card: 'summary_large_image', title: name, description, ...(ogImage ? { images: [ogImage] } : {}) },
    };
  }
  return {
    metadataBase: new URL(SITE_URL),
    title: 'Автомашины худалдаа',
    description: 'Чанартай машин шууд таны гарт',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`h-full antialiased ${onest.variable} ${geologica.variable}`} suppressHydrationWarning>
      <head>
        {/* Харанхуй горимыг хуудас зурагдахаас өмнө тавина (цагаан анивчихгүй) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
