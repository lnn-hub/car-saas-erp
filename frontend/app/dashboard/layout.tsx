'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconDashboard, IconCar, IconPlus, IconSales, IconLogout } from '@/components/icons';

const nav = [
  { href: '/dashboard',    label: 'Нүүр хуудас', Icon: IconDashboard },
  { href: '/vehicles',     label: 'Машинууд',    Icon: IconCar },
  { href: '/vehicles/new', label: 'Машин нэмэх', Icon: IconPlus },
  { href: '/sales',        label: 'Борлуулалт',  Icon: IconSales },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(user.name || '');
    setUserRole(user.role || '');
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-[#1e1e1e] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded-sm shrink-0" />
            <span className="text-sm font-semibold text-white tracking-tight">AutoERP</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-[#1e1e1e] text-white'
                    : 'text-[#666] hover:text-[#ccc] hover:bg-[#161616]'
                }`}
              >
                <Icon className="w-[15px] h-[15px] shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 py-3 border-t border-[#1e1e1e]">
          <div className="px-3 py-2 mb-0.5">
            <div className="text-xs text-white font-medium truncate">{userName}</div>
            <div className="text-[11px] text-[#555] mt-0.5">{userRole}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#666] hover:text-red-400 hover:bg-[#161616] transition-colors"
          >
            <IconLogout className="w-[15px] h-[15px] shrink-0" />
            Гарах
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
