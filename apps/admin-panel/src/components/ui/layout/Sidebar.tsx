'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Moon,
  ShieldCheck,
  Store,
  Sun,
  Ticket,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { clearAdminSession } from '@/lib/session';

const ALL_NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Operations',
    superadminOnly: false,
  },
  {
    href: '/verification',
    label: 'Verification',
    icon: ShieldCheck,
    group: 'Operations',
    superadminOnly: false,
  },
  {
    href: '/youth',
    label: 'Youth Members',
    icon: UsersRound,
    group: 'Operations',
    superadminOnly: false,
  },
  {
    href: '/merchants',
    label: 'Merchants',
    icon: Store,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/points-transactions',
    label: 'Points & Txns',
    icon: TrendingUp,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/digital-ids',
    label: 'Digital IDs',
    icon: CreditCard,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/vouchers',
    label: 'Vouchers',
    icon: Ticket,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/promotions',
    label: 'Promotions',
    icon: Megaphone,
    group: 'Management',
    superadminOnly: true,
  },
  {
    href: '/rewards',
    label: 'Rewards',
    icon: Gift,
    group: 'Management',
    superadminOnly: true,
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose: () => void;
  onNavigate?: (label: string) => void;
}

function NavLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return (
    <span
      className={`min-w-0 truncate transition-all duration-200 ${
        collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
      }`}
    >
      {children}
    </span>
  );
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileClose,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, mounted } = useAdminTheme();
  const [role, setRole] = useState<string>('admin');
  const [showLogout, setShowLogout] = useState(false);
  const isDark = mounted ? theme === 'dark' : false;

  useEffect(() => {
    setRole(window.localStorage.getItem('kk-admin-role') || 'admin');
  }, []);

  const navItems = role === 'superadmin'
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter((item) => !item.superadminOnly);

  const grouped = navItems.reduce<Record<string, typeof ALL_NAV_ITEMS>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      await clearAdminSession();
      window.localStorage.removeItem('kk-admin-role');
      window.localStorage.removeItem('kk-admin-email');
      router.push('/login');
    }
  };

  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

  const sidebarContent = useMemo(
    () => (
      <aside
        className="flex h-full flex-col overflow-hidden border-r transition-all duration-300"
        style={{
          width: sidebarWidth,
          background: 'var(--surface)',
          borderColor: 'var(--stroke)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-sm ring-1 ring-black/5">
            <Image
              src="/images/SKButingLogo.png"
              alt="SK Buting logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-cover"
            />
          </div>
          <div
            className={`min-w-0 transition-all duration-200 ${
              collapsed ? 'w-0 translate-x-1 overflow-hidden opacity-0' : 'opacity-100'
            }`}
          >
            <div className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              KK Admin
            </div>
            <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
              Barangay Buting
            </div>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl border lg:hidden"
            style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        {/* Collapse toggle */}
        <div className="hidden px-4 pb-3 lg:block">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-colors hover:bg-[color:var(--accent-soft)]"
            style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex flex-col gap-6">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div
                  className={`mb-2 px-3 text-[0.68rem] font-semibold uppercase transition-opacity ${
                    collapsed ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
                >
                  {group}
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={() => {
                          if (!pathname.startsWith(item.href)) onNavigate?.(item.label);
                          onMobileClose();
                        }}
                        className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                          collapsed ? 'justify-center' : ''
                        }`}
                        style={{
                          background: active ? 'var(--accent-soft)' : 'transparent',
                          color: active ? 'var(--accent-strong)' : 'var(--ink-soft)',
                        }}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-2 h-7 w-1 rounded-r-full"
                            style={{ background: 'var(--accent)' }}
                          />
                        )}
                        <Icon size={18} className="shrink-0" strokeWidth={2.2} />
                        <NavLabel collapsed={collapsed}>{item.label}</NavLabel>
                        {collapsed && (
                          <span
                            className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border px-2 py-1 text-xs shadow-md group-hover:block"
                            style={{
                              background: 'var(--card-solid)',
                              borderColor: 'var(--stroke)',
                              color: 'var(--ink)',
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="border-t p-3" style={{ borderColor: 'var(--stroke)' }}>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-[color:var(--accent-soft)] ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{ color: 'var(--ink-soft)' }}
              title={collapsed ? 'Toggle theme' : undefined}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <NavLabel collapsed={collapsed}>{isDark ? 'Light Mode' : 'Dark Mode'}</NavLabel>
            </button>
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{ color: 'var(--muted)' }}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} />
              <NavLabel collapsed={collapsed}>Logout</NavLabel>
            </button>
          </div>
        </div>
      </aside>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed, isDark, onCollapsedChange, onMobileClose, pathname, setTheme, sidebarWidth, grouped]
  );

  return (
    <>
      {/* Desktop sticky sidebar */}
      <div className="hidden h-screen shrink-0 lg:sticky lg:top-0 lg:block">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="absolute inset-y-0 left-0">{sidebarContent}</div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogout && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowLogout(false)}
        >
          <div className="admin-card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
              Confirm logout
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              You will be returned to the admin login screen.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
