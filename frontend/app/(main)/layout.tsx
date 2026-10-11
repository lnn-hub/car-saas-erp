'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';

function IcHome()    { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IcCar()     { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="17" width="10" height="4" rx="2"/><path d="M5 11L7.5 5h9L19 11"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>; }
function IcPlus()    { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>; }
function IcMoney()   { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcPeople()  { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function IcChart()   { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function IcFinance() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function IcSettings(){ return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function IcGlobe()   { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>; }

const NAV = [
  { href: '/dashboard',    label: 'Нүүр хуудас',  Icon: IcHome },
  { href: '/vehicles',     label: 'Машинууд',      Icon: IcCar },
  { href: '/vehicles/new', label: 'Машин нэмэх',  Icon: IcPlus },
  { href: '/sales',        label: 'Борлуулалт',    Icon: IcMoney },
  { href: '/customers',    label: 'Үйлчлүүлэгч',  Icon: IcPeople },
  { href: '/reports',      label: 'Тайлан',        Icon: IcChart },
  { href: '/finance',      label: 'Санхүү',        Icon: IcFinance },
];

const NAV_BOTTOM = [
  { href: '/settings', label: 'Тохиргоо', Icon: IcSettings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#f6f6f7]" />}>
      <MainLayoutInner>{children}</MainLayoutInner>
    </React.Suspense>
  );
}

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [userName, setUserName]   = useState('');
  const [userRole, setUserRole]   = useState('');
  const [companyName, setCompany] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(u.name || ''); setUserRole(u.role || '');
    fetch('http://localhost:4000/api/settings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setCompany(d.name || '')).catch(() => {});
  }, [router]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex">
      <aside className="w-56 shrink-0 bg-white border-r border-[#e4e4e7] flex flex-col fixed h-full shadow-sm">

        {/* Компанийн нэр */}
        <div className="px-5 py-5 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#09090b] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{companyName?.[0] || 'A'}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#09090b] leading-none truncate">{companyName || 'Удирдлага'}</div>
              <div className="text-[10px] text-[#a1a1aa] mt-0.5">Удирдлагын систем</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-[#09090b] text-white font-medium shadow-sm'
                    : 'text-[#52525b] hover:text-[#09090b] hover:bg-[#f4f4f5]'
                }`}>
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Вэбсайт руу холбоос */}
        <div className="px-3 pb-2">
          <a href="/" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#16a34a] bg-[#f0fdf4] hover:bg-[#dcfce7] transition-colors">
            <IcGlobe />
            Вэбсайт үзэх
          </a>
        </div>

        {/* Bottom */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-[#e4e4e7] pt-3">
          {NAV_BOTTOM.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-[#09090b] text-white font-medium'
                    : 'text-[#52525b] hover:text-[#09090b] hover:bg-[#f4f4f5]'
                }`}>
                <Icon />
                {label}
              </Link>
            );
          })}

          {/* Хэрэглэгч */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-8 h-8 rounded-full bg-[#09090b] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#09090b] truncate">{userName}</div>
              <div className="text-[10px] text-[#a1a1aa]">{userRole}</div>
            </div>
            <button onClick={() => { localStorage.clear(); router.push('/login'); }}
              title="Гарах"
              className="text-[#d4d4d8] hover:text-red-400 transition-colors shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-56 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
