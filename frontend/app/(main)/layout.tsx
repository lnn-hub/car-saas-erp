'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';
import { warmUp } from '@/lib/api';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function IcHome()    { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IcCar()     { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/></svg>; }
function IcPlus()    { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>; }
function IcMoney()   { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcChart()   { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function IcSettings(){ return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function IcGlobe()   { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>; }
function IcMenu()    { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function IcX()       { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IcOut()     { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }

// Mobile-д харагдах tab bar-ийн nav
const TAB_NAV = [
  { href: '/dashboard',    label: 'Нүүр',      Icon: IcHome },
  { href: '/vehicles',     label: 'Машин',      Icon: IcCar },
  { href: '/vehicles/new', label: 'Нэмэх',     Icon: IcPlus },
  { href: '/sales',        label: 'Борлуулалт', Icon: IcMoney },
  { href: '/settings',     label: 'Тохиргоо',  Icon: IcSettings },
];

// Desktop sidebar nav
const SIDE_NAV = [
  { href: '/dashboard',    label: 'Нүүр хуудас',  Icon: IcHome },
  { href: '/vehicles',     label: 'Машинууд',      Icon: IcCar },
  { href: '/vehicles/new', label: 'Машин нэмэх',  Icon: IcPlus },
  { href: '/sales',        label: 'Борлуулалт',    Icon: IcMoney },
  { href: '/reports',      label: 'Тайлан',        Icon: IcChart },
  { href: '/settings',     label: 'Тохиргоо',      Icon: IcSettings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#f5f5f5]" />}>
      <MainLayoutInner>{children}</MainLayoutInner>
    </React.Suspense>
  );
}

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [userName, setUserName]   = useState('');
  const [userRole, setUserRole]   = useState('');
  const [companyName, setCompany] = useState('');
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);
  const [drawerOpen, setDrawer]   = useState(false);

  useEffect(() => {
    warmUp(); // Render cold start-аас сэргийлэх
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(u.name || ''); setUserRole(u.role || '');
    fetch(`${BACKEND}/api/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => { if (r.status === 401) { localStorage.clear(); router.push('/login'); throw new Error('unauthorized'); } return r.json(); })
      .then(d => { setCompany(d.name || ''); setLogoUrl(d.logo_url || null); }).catch(() => {});
  }, [router]);

  // Drawer хаах хуудас солигдоход
  useEffect(() => { setDrawer(false); }, [pathname]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const logout = () => { localStorage.clear(); router.push('/login'); };

  const SidebarContent = () => (
    <>
      {/* Компани */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center shrink-0 overflow-hidden p-1">
              <img src={logoUrl.startsWith('http') ? logoUrl : `${BACKEND}${logoUrl}`} alt="" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-brand rounded-sm flex items-center justify-center shrink-0">
              <span className="text-white text-base font-bold">{companyName?.[0] || 'A'}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight truncate">{companyName || 'Удирдлага'}</div>
            <div className="text-xs font-medium text-white/40 mt-1">Админ самбар</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-xs font-medium text-white/30">Цэс</div>
        {SIDE_NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              className={`relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-sm text-[13px] font-semibold transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}>
              <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${active ? 'bg-brand-light' : 'bg-transparent'}`} />
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Вэбсайт */}
      <div className="px-3 pb-3">
        <a href="/" target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-sm text-sm text-white bg-brand hover:bg-brand-dark transition-colors font-medium">
          <IcGlobe />
          Вэбсайт үзэх
        </a>
      </div>

      {/* Хэрэглэгч */}
      <div className="px-3 pb-3 border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{userName}</div>
            <div className="text-xs text-white/40">{userRole}</div>
          </div>
          <button onClick={logout} title="Гарах"
            className="text-white/40 hover:text-brand-light transition-colors shrink-0">
            <IcOut />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#111] flex-col fixed h-full z-30 border-r-4 border-brand">
        <SidebarContent />
      </aside>

      {/* ── Mobile top header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#111] border-b-2 border-brand flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-sm flex items-center justify-center">
            <span className="text-white text-sm font-bold">{companyName?.[0] || 'A'}</span>
          </div>
          <span className="text-sm font-bold text-white truncate max-w-[180px]">{companyName || 'Удирдлага'}</span>
        </div>
        <button onClick={() => setDrawer(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors text-white">
          {drawerOpen ? <IcX /> : <IcMenu />}
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="lg:hidden fixed top-14 left-0 bottom-0 w-72 z-40 bg-[#111] shadow-2xl flex flex-col overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <main className="[&>*]:animate-[pageIn_0.25s_ease-out] flex-1 lg:ml-60 min-w-0 overflow-auto pt-14 lg:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-16">
          {TAB_NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-brand' : 'text-zinc-400'
                }`}>
                <span className={`absolute top-0 h-[3px] w-8 rounded-b-full transition-colors ${active ? 'bg-brand' : 'bg-transparent'}`} />
                <Icon />
                <span className="text-[10px] font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
