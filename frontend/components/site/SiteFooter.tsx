'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Company } from '@/lib/site';
import { IcPhone, IcPin } from './icons';
import { BrandMark } from './BrandMark';
import { ChatIcon } from './ChatIcon';
import { LeadForm } from './LeadForm';
import { chatChannels } from '@/lib/contact';
import { useClientValue } from '@/lib/client-state';

export function SiteCta({ company }: { company: Company | null }) {
  const [formOpen, setFormOpen] = useState(false);
  if (!company?.phone) return null;
  return (
    <section className="px-3 sm:px-4 py-6 sm:py-10">
      <div className="reveal relative max-w-7xl mx-auto overflow-hidden rounded-[24px] sm:rounded-[40px] bg-ink text-white px-5 py-9 sm:px-14 sm:py-16">
        <div
          className="pointer-events-none absolute -top-40 -right-24 w-[520px] h-[520px]"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 65%, transparent), transparent)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-48 left-10 w-[420px] h-[420px]"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--color-brand-light) 22%, transparent), transparent)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 glass-dark rounded-full px-3 py-1.5 text-xs text-white/80 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light" /> Захиалгаар оруулна
            </div>
            <h3 className="font-display text-[26px] sm:text-5xl font-semibold leading-[1.05] tracking-tight">
              Хүссэн машинаа олоогүй юу?
            </h3>
            <p className="text-white/60 text-sm mt-3 sm:mt-4 sm:text-lg max-w-xl">
              Бидэнтэй холбогдоорой. Таны төсөв, хэрэгцээнд тохирох машиныг хайж олоод оруулж өгнө.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href={`tel:${company.phone}`}
              className="keep-white inline-flex items-center justify-center gap-2.5 bg-white text-ink hover:bg-brand-light hover:text-white h-12 sm:h-14 px-7 rounded-full text-sm sm:text-base font-medium transition-colors"
            >
              <IcPhone cls="w-4 h-4" /> {company.phone}
            </a>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center justify-center gap-2.5 glass-dark hover:bg-white/15 h-12 sm:h-14 px-7 rounded-full text-sm sm:text-base font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              Хүсэлт үлдээх
            </button>
          </div>
        </div>
      </div>
      <LeadForm open={formOpen} onClose={() => setFormOpen(false)} kind="REQUEST" />
    </section>
  );
}

export function SiteFooter({ company }: { company: Company | null }) {
  const cname = company?.name ?? '';
  // Оныг хөтөч дээр тооцно (render үед new Date() дуудвал Next.js хуудсыг prerender-ээс хасдаг)
  const year = useClientValue(() => new Date().getFullYear(), null);
  return (
    <footer className="keep-palette relative mt-6 bg-ink text-zinc-400 rounded-t-[28px] sm:rounded-t-[40px] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 pt-14 sm:pt-20 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-10 lg:gap-16">
          <div className="max-w-sm">
            <BrandMark
              logoUrl={company?.logo_url}
              name={cname}
              size={40}
              onDark
              nameClassName="font-display text-white font-semibold text-lg"
            />
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
              Чанартай, нягт шалгагдсан машиныг ил тод үнээр. Үзэх, туршиж унах цагаа урьдчилан тохироорой.
            </p>
            {company?.phone && (
              <div className="flex gap-2 mt-6">
                <a
                  href={`tel:${company.phone}`}
                  aria-label="Залгах"
                  className="w-11 h-11 rounded-full bg-white/[0.07] hover:bg-brand text-white flex items-center justify-center transition-colors"
                >
                  <IcPhone cls="w-4 h-4" />
                </a>
                {chatChannels(company).map((ch) => (
                  <a
                    key={ch.key}
                    href={ch.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={ch.label}
                    className="w-11 h-11 rounded-full bg-white/[0.07] hover:bg-brand text-white flex items-center justify-center transition-colors"
                  >
                    <ChatIcon ch={ch.key} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-zinc-500 mb-4">Цэс</div>
            <ul className="space-y-1 text-sm">
              {[
                ['/#cars', 'Машинууд'],
                ['/about', 'Бидний тухай'],
                ['/#contact', 'Холбоо барих'],
              ].map(([h, l]) => (
                <li key={h}>
                  <a href={h} className="inline-block py-1.5 text-zinc-300 hover:text-white transition-colors">
                    {l}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/admin" className="inline-block py-1.5 text-zinc-300 hover:text-white transition-colors">
                  Админ нэвтрэх
                </Link>
              </li>
            </ul>
          </div>

          {(company?.address || company?.phone || company?.email || company?.working_hours) && (
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500 mb-4">Холбоо барих</div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {company?.phone && (
                  <li>
                    <a href={`tel:${company.phone}`} className="hover:text-white transition-colors">
                      {company.phone}
                    </a>
                  </li>
                )}
                {company?.email && (
                  <li>
                    <a href={`mailto:${company.email}`} className="hover:text-white transition-colors break-all">
                      {company.email}
                    </a>
                  </li>
                )}
                {company?.working_hours && <li>{company.working_hours}</li>}
                {company?.address && (
                  <li className="flex items-start gap-2">
                    <IcPin cls="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" /> {company.address}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            © {year ? `${year} ` : ''}
            {cname}. Бүх эрх хуулиар хамгаалагдсан.
          </span>
          <a href="#" className="hover:text-white transition-colors py-2">
            Дээш буцах ↑
          </a>
        </div>
      </div>

      {/* Том нэр (watermark) */}
      {cname && (
        <div
          aria-hidden
          style={{ fontSize: `${Math.min(18, 150 / Math.max(cname.length, 1))}vw` }}
          className="pointer-events-none select-none font-display font-semibold text-white/[0.05] leading-[0.8] tracking-tighter whitespace-nowrap text-center -mb-[2vw]"
        >
          {cname}
        </div>
      )}
      {/* Утсан дээр хөвөгч "Залгах" мөрийн доор footer үргэлжилнэ */}
      <div className="lg:hidden h-[calc(5.5rem+env(safe-area-inset-bottom))]" />
    </footer>
  );
}

export function MobileCallBar({ company }: { company: Company | null }) {
  if (!company?.phone) return null;
  const ch = chatChannels(company)[0];
  return (
    <div className="lg:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 glass rounded-full p-1.5 flex gap-1.5">
      <a
        href={`tel:${company.phone}`}
        className="flex-1 flex items-center justify-center gap-2 bg-brand active:bg-brand-dark text-white text-sm font-medium h-12 rounded-full"
      >
        <IcPhone cls="w-4 h-4" /> Залгах
      </a>
      {ch && (
        <a
          href={ch.href}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-white text-ink text-sm font-medium h-12 rounded-full border border-zinc-200"
        >
          <ChatIcon ch={ch.key} /> {ch.label}
        </a>
      )}
    </div>
  );
}
