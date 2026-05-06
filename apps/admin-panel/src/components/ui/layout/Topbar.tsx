'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Command, Menu, Search } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  link: string | null;
}

interface TopbarProps {
  onCommandOpen?: () => void;
  onMobileNavOpen?: () => void;
}

const NAV_META: Record<string, { label: string; why: string }> = {
  '/dashboard': { label: 'Dashboard', why: 'System pulse and daily highlights.' },
  '/verification': { label: 'Verification', why: 'Approve credentials and documents.' },
  '/youth': { label: 'Youth Members', why: 'Review registrations and member profiles.' },
  '/merchants': { label: 'Merchants', why: 'Manage partner merchant accounts.' },
  '/points-transactions': { label: 'Points & Transactions', why: 'Monitor operational metrics and trends.' },
  '/reports': { label: 'Reports', why: 'Analytics and membership reports.' },
  '/digital-ids': { label: 'Digital IDs', why: 'Generate and manage member digital IDs.' },
  '/vouchers': { label: 'Vouchers', why: 'Create and redeem youth vouchers.' },
  '/promotions': { label: 'Promotions', why: 'Review merchant promotion requests.' },
  '/rewards': { label: 'Rewards', why: 'Manage the KK rewards catalogue.' },
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function notifDotColor(type: string) {
  if (type === 'success') return 'bg-green-500';
  if (type === 'error' || type === 'warning') return 'bg-red-500';
  if (type === 'transaction') return 'bg-sky-500';
  return 'bg-[color:var(--accent)]';
}

function resolveAdminNotificationHref(link: string | null) {
  if (!link) return null;
  if (link.startsWith('/verification/upload')) return '/verification';
  if (link.startsWith('/scanner/digital-id')) return '/digital-ids';
  if (link.startsWith('/rewards/my-redemptions')) return '/rewards';
  return link;
}

export default function Topbar({ onCommandOpen, onMobileNavOpen }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('admin');
  const [mounted, setMounted] = useState(false);
  const [lastSync] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPos, setNotifPos] = useState({ top: 0, right: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Find page metadata
  const navMeta = Object.entries(NAV_META).find(([path]) => pathname.startsWith(path))?.[1];

  useEffect(() => {
    setMounted(true);
    setAdminEmail(window.localStorage.getItem('kk-admin-email') || '');
    setAdminRole(window.localStorage.getItem('kk-admin-role') || 'admin');
  }, []);

  useEffect(() => {
    let active = true;

    async function syncNotifications() {
      try {
        const res = await api.get<{ notifications: Notification[] }>('/notifications/me');
        if (active) {
          setNotifications(res.data.notifications || []);
        }
      } catch {
        // Keep the last successful state so the bell does not flash empty.
      }
    }

    syncNotifications();
    const interval = window.setInterval(syncNotifications, 30000);
    window.addEventListener('focus', syncNotifications);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', syncNotifications);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (bellRef.current?.contains(target)) return;
      if (notifDropdownRef.current?.contains(target)) return;
      setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen]);

  const handleBellClick = async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setNotifPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const res = await api.get<{ notifications: Notification[] }>('/notifications/me');
      setNotifications(res.data.notifications || []);
    } catch { /* keep existing */ }
    finally { setNotifLoading(false); }
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.post('/notifications/me/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    } catch { /* silent */ }
    finally { setMarkingRead(false); }
  };

  const handleNotificationClick = async (notification: Notification) => {
    const nextHref = resolveAdminNotificationHref(notification.link);

    setOpeningNotificationId(notification.id);
    try {
      if (!notification.read) {
        await api.post(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((entry) =>
            entry.id === notification.id
              ? { ...entry, read: true, readAt: new Date().toISOString() }
              : entry
          )
        );
      }
    } catch {
      // Continue with navigation even if the read-state update fails.
    } finally {
      setOpeningNotificationId(null);
      setNotifOpen(false);
    }

    if (nextHref) {
      router.push(nextHref);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"
        style={{
          background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
          borderColor: 'var(--stroke)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Left: hamburger + page title */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMobileNavOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border lg:hidden"
              style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                {navMeta?.label ?? 'Dashboard'}
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                {navMeta?.why ?? 'Admin operations and governance.'}
              </div>
            </div>
          </div>

          {/* Right: search + bell + user */}
          <div className="flex items-center gap-2">
            {/* Command bar trigger */}
            <button
              type="button"
              onClick={onCommandOpen}
              className="hidden h-10 min-w-48 items-center justify-between gap-3 rounded-xl border px-3 text-left text-xs transition-colors hover:bg-[color:var(--accent-soft)] md:flex"
              style={{ borderColor: 'var(--stroke)', color: 'var(--muted)', background: 'var(--card)' }}
            >
              <span className="flex items-center gap-2">
                <Search size={15} />
                Search pages
              </span>
              <span
                className="flex items-center gap-1 rounded-lg border px-1.5 py-0.5"
                style={{ borderColor: 'var(--stroke)' }}
              >
                <Command size={12} /> K
              </span>
            </button>

            {/* Notification bell */}
            <button
              ref={bellRef}
              type="button"
              onClick={handleBellClick}
              className="relative grid h-10 w-10 place-items-center rounded-xl border transition-colors hover:bg-[color:var(--accent-soft)]"
              style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)', background: 'var(--card)' }}
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>

            {/* User pill */}
            <div
              className="hidden items-center gap-3 rounded-xl border px-3 py-2 lg:flex"
              style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}
            >
              <div className="text-right">
                <div className="text-[0.68rem]" style={{ color: 'var(--muted)' }}>
                  Last sync {lastSync}
                </div>
                <div className="max-w-40 truncate text-xs font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                  {adminRole} {adminEmail ? `· ${adminEmail}` : ''}
                </div>
              </div>
              <div
                className="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--accent)' }}
              >
                {adminRole === 'superadmin' ? 'S' : 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification dropdown portal */}
      {mounted && notifOpen ? createPortal(
        <div
          ref={notifDropdownRef}
          className="w-[340px] overflow-hidden rounded-[20px] border shadow-[var(--shadow-lg)]"
          style={{
            position: 'fixed',
            top: notifPos.top,
            right: notifPos.right,
            zIndex: 9999,
            borderColor: 'var(--stroke)',
            background: 'var(--card-solid)',
          }}
        >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--stroke)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Notifications</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingRead}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[color:var(--accent-soft)] disabled:opacity-50"
                  style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)', background: 'var(--accent-soft)' }}
                >
                  {markingRead ? 'Marking...' : 'Mark all read'}
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                  <Bell size={28} style={{ color: 'var(--surface-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>No notifications yet</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>System events will appear here.</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notif) => (
                    <li
                      key={notif.id}
                      className="border-b"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: notif.read ? 'color-mix(in srgb, var(--bg) 88%, #d8dde6 12%)' : 'var(--accent-soft)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        disabled={openingNotificationId === notif.id}
                        className="flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-black/5 disabled:cursor-wait"
                      >
                        <div className="mt-1 shrink-0">
                          <span className={`block h-2 w-2 rounded-full ${notif.read ? 'bg-slate-300' : notifDotColor(notif.type)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="text-sm leading-snug"
                              style={{ color: notif.read ? 'var(--muted)' : 'var(--ink)', fontWeight: notif.read ? 500 : 700 }}
                            >
                              {notif.title}
                            </p>
                            <span className="shrink-0 text-[11px]" style={{ color: 'var(--muted)' }}>
                              {openingNotificationId === notif.id ? 'Opening...' : formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: notif.read ? 'color-mix(in srgb, var(--muted) 86%, #8b96a9 14%)' : 'var(--muted)' }}>
                            {notif.body}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t px-5 py-3 text-center" style={{ borderColor: 'var(--stroke)' }}>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
        </div>,
        document.body
      ) : null}
    </>
  );
}
