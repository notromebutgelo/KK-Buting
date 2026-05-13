'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/layout/Sidebar';
import Topbar from '@/components/ui/layout/Topbar';
import CommandBar from '@/components/layout/CommandBar';
import LoadingModal from '@/components/ui/LoadingModal';
import Skeleton from '@/components/ui/Skeleton';

const STORAGE_KEY = 'kk-admin-sidebar-collapsed';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationLabel, setNavigationLabel] = useState('Loading page');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setCollapsed(stored === 'true');
    setReady(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleCollapsedChange = (value: boolean) => {
    setCollapsed(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div
          className="w-full max-w-md rounded-2xl border p-5 shadow-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--stroke)' }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-48" />
            </div>
          </div>
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <LoadingModal
        open={isNavigating}
        title={navigationLabel}
        description="Loading the next admin page and preparing the latest dashboard data."
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileNavOpen}
        onCollapsedChange={handleCollapsedChange}
        onMobileClose={() => setMobileNavOpen(false)}
        onNavigate={(label) => {
          setNavigationLabel(`Opening ${label}`);
          setIsNavigating(true);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onCommandOpen={() => setCommandOpen(true)}
          onMobileNavOpen={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">{children}</div>
        </main>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
