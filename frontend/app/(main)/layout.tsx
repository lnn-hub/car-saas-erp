'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';
import { warmUp } from '@/lib/api';
import { BrandMark } from '@/components/site/BrandMark';
import { api } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/role';
import { useTheme } from '@/lib/theme';
import { useSessionUser } from '@/lib/client-state';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function IcHome() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcCar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      <rect x="7" y="17" width="10" height="4" rx="2" />
      <path d="M5 11L7.5 5h9L19 11" />
    </svg>
  );
}
function IcPlus() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
function IcMoney() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IcChart() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IcSettings() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function IcGlobe() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function IcMenu() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IcX() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IcInbox() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}
function IcUsers() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IcMoon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}
function IcSun() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function IcOut() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

// Mobile-д харагдах tab bar-ийн nav
const TAB_NAV = [
  { href: '/dashboard', label: 'Нүүр', Icon: IcHome },
  { href: '/vehicles', label: 'Машин', Icon: IcCar },
  { href: '/vehicles/new', label: 'Нэмэх', Icon: IcPlus },
  { href: '/leads', label: 'Хүсэлт', Icon: IcInbox },
  { href: '/sales', label: 'Борлуулалт', Icon: IcMoney },
];

// Desktop sidebar nav
const SIDE_NAV = [
  { href: '/dashboard', label: 'Нүүр хуудас', Icon: IcHome },
  { href: '/vehicles', label: 'Машинууд', Icon: IcCar },
  { href: '/vehicles/new', label: 'Машин нэмэх', Icon: IcPlus },
  { href: '/leads', label: 'Хүсэлтүүд', Icon: IcInbox },
  { href: '/customers', label: 'Үйлчлүүлэгчид', Icon: IcUsers },
  { href: '/sales', label: 'Борлуулалт', Icon: IcMoney },
  { href: '/reports', label: 'Тайлан', Icon: IcChart },
  { href: '/settings', label: 'Тохиргоо', Icon: IcSettings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <MainLayoutInner>{children}</MainLayoutInner>
    </React.Suspense>
  );
}

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const userName = user?.name || '';
  const userRole = user?.role || '';
  const [companyName, setCompany] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Цэс нээгдсэн хуудасны зам. Өөр хуудас руу шилжихэд автоматаар хаагдана.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const [newLeads, setNewLeads] = useState(0);
  const { dark, toggle: toggleDark } = useTheme();

  useEffect(() => {
    warmUp(); // Render cold start-аас сэргийлэх
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    fetch(`${BACKEND}/api/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.clear();
          router.push('/login');
          throw new Error('unauthorized');
        }
        return r.json();
      })
      .then((d) => {
        setCompany(d.name || '');
        setLogoUrl(d.logo_url || null);
      })
      .catch(() => {});
  }, [router]);

  // Шинэ хүсэлтийн тоо (минут тутам шинэчилнэ)
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const load = () =>
      api
        .leadsCount()
        .then((d: { new: number }) => setNewLeads(d.new || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [pathname]);

  const isActive = (href: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const canSeeMoney = userRole === 'ADMIN' || userRole === 'FINANCE';
  const navItems = SIDE_NAV.filter(
    (n) => (n.href !== '/reports' || canSeeMoney) && (n.href !== '/settings' || userRole === 'ADMIN'),
  );

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const sidebarContent = (
    <>
      {/* Компани */}
      <div className="px-5 pt-6 pb-5">
        <BrandMark
          logoUrl={logoUrl}
          name={companyName || 'Удирдлага'}
          size={36}
          nameClassName="font-display text-[15px] font-semibold text-ink"
        />
        <div className="text-xs text-zinc-500 mt-2.5 pl-0.5">Удирдлагын самбар</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Цэс</div>
        {navItems.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-ink shadow-card ring-1 ring-ink/[0.05]'
                  : 'text-zinc-600 hover:text-ink hover:bg-white/60'
              }`}
            >
              <span className={active ? 'text-brand' : 'text-zinc-400 group-hover:text-zinc-600'}>
                <Icon />
              </span>
              <span className="flex-1">{label}</span>
              {href === '/leads' && newLeads > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-semibold flex items-center justify-center">
                  {newLeads}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Вэбсайт */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={toggleDark}
          className="w-full flex items-center justify-between gap-2 px-4 h-11 rounded-xl text-sm text-zinc-700 hover:bg-white/60 transition-colors font-medium"
        >
          <span className="flex items-center gap-2.5">
            <span className="text-zinc-400">{dark ? <IcSun /> : <IcMoon />}</span>
            {dark ? 'Цайвар горим' : 'Харанхуй горим'}
          </span>
          <span className={`relative w-9 h-5 rounded-full transition-colors ${dark ? 'bg-brand' : 'bg-zinc-300'}`}>
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${dark ? 'left-[18px]' : 'left-0.5'}`}
            />
          </span>
        </button>
      </div>
      <div className="px-3 pb-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-2 px-4 h-11 rounded-xl text-sm text-zinc-700 bg-white/60 hover:bg-white ring-1 ring-ink/[0.06] transition-colors font-medium"
        >
          <span className="flex items-center gap-2.5">
            <span className="text-zinc-400">
              <IcGlobe />
            </span>{' '}
            Вэбсайт үзэх
          </span>
          <svg
            className="w-3.5 h-3.5 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </div>

      {/* Хэрэглэгч */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white ring-1 ring-ink/[0.06] shadow-card">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">{userName}</div>
            <div className="text-xs text-zinc-500">{ROLE_LABEL[userRole] || userRole}</div>
          </div>
          <button
            onClick={logout}
            title="Гарах"
            aria-label="Гарах"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-brand-soft transition-colors shrink-0"
          >
            <IcOut />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* ── Desktop sidebar ── */}
      <aside className="print:hidden hidden lg:flex w-64 shrink-0 flex-col fixed h-full z-30 bg-canvas border-r border-ink/[0.06]">
        {sidebarContent}
      </aside>

      {/* ── Mobile top header ── */}
      <header className="print:hidden lg:hidden fixed top-0 left-0 right-0 z-40 h-14 px-4 flex items-center justify-between bg-canvas/80 backdrop-blur-xl border-b border-ink/[0.06]">
        <BrandMark
          logoUrl={logoUrl}
          name={companyName || 'Удирдлага'}
          size={30}
          nameClassName="font-display text-sm font-semibold text-ink max-w-[200px]"
        />
        <button
          onClick={() => setDrawerPath(drawerOpen ? null : pathname)}
          aria-label="Цэс"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white ring-1 ring-ink/[0.08] text-ink"
        >
          {drawerOpen ? <IcX /> : <IcMenu />}
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm"
            onClick={() => setDrawerPath(null)}
          />
          <aside className="lg:hidden fixed top-14 left-0 bottom-0 w-72 z-40 bg-canvas rounded-tr-3xl shadow-lift flex flex-col overflow-y-auto animate-[pageIn_0.2s_ease-out]">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <main className="[&>*]:animate-[pageIn_0.25s_ease-out] flex-1 lg:ml-64 print:!ml-0 print:!p-0 min-w-0 overflow-auto pt-14 lg:pt-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="print:hidden lg:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 glass rounded-full p-1.5">
        <div className="flex items-center h-14">
          {TAB_NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            if (href === '/vehicles/new')
              return (
                <Link key={href} href={href} aria-label={label} className="flex-1 flex items-center justify-center">
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${active ? 'bg-ink' : 'bg-brand'}`}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </Link>
              );
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
                  active ? 'text-brand' : 'text-zinc-500'
                }`}
              >
                <span className="relative">
                  <Icon />
                  {href === '/leads' && newLeads > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                      {newLeads}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
