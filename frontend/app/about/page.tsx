import { Suspense } from 'react';
import type { Metadata } from 'next';
import AboutClient from './AboutClient';
import { getSiteData } from '@/lib/server-data';

export const metadata: Metadata = { title: 'Бидний тухай' };

async function About() {
  const initial = await getSiteData();
  return <AboutClient initial={initial} />;
}

export default function Page() {
  return (
    <Suspense fallback={<AboutClient initial={null} />}>
      <About />
    </Suspense>
  );
}
