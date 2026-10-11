'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function Icon({ d, className = 'w-[15px] h-[15px]' }: { d: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d={d} /></svg>;
}

const nav = [
  { href: '/dashboard',    label: 'Нүүр хуудас', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { href: '/vehicles',     label: 'Машинууд',    d: 'M5 17H3a1 1 0 01-1-1v-4l2.5-5h13l2.5 5v4a1 1 0 01-1 1h-2M7.5 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z' },
  { href: '/vehicles/new', label: 'Машин нэмэх', d: 'M12 5v14M5 12h14' },
  { href: '/sales',        label: 'Борлуулалт',  d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/customers',    label: 'Үйлчлүүлэгч', d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { href: '/reports',      label: 'Тайлан',       d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/finance',      label: 'Санхүү',       d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/billing',      label: 'Subscription', d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(u.name || ''); setUserRole(u.role || '');
  }, [router]);

  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      <aside className="w-52 shrink-0 bg-white border-r border-[#e4e4e7] flex flex-col fixed h-full">
        <div className="px-5 py-4 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#09090b] rounded-sm shrink-0" />
            <span className="text-sm font-semibold text-[#09090b]">AutoERP</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, d }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? 'bg-[#f4f4f5] text-[#09090b] font-medium' : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]'
                }`}>
                <Icon d={d} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-2 border-t border-[#e4e4e7]">
          <div className="px-3 py-2 mb-0.5">
            <div className="text-xs font-medium text-[#09090b] truncate">{userName}</div>
            <div className="text-[11px] text-[#a1a1aa] mt-0.5">{userRole}</div>
          </div>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#71717a] hover:text-red-500 hover:bg-red-50 transition-colors">
            <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            Гарах
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-52 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
