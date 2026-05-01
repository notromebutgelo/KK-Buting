'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  Gift,
  LayoutDashboard,
  Megaphone,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const COMMANDS = [
  { label: 'Dashboard', action: '/dashboard', icon: LayoutDashboard },
  { label: 'Verification', action: '/verification', icon: ShieldCheck },
  { label: 'Youth Members', action: '/youth', icon: UsersRound },
  { label: 'Merchants', action: '/merchants', icon: Store },
  { label: 'Points & Transactions', action: '/points-transactions', icon: TrendingUp },
  { label: 'Reports', action: '/reports', icon: BarChart3 },
  { label: 'Digital IDs', action: '/digital-ids', icon: CreditCard },
  { label: 'Vouchers', action: '/vouchers', icon: Ticket },
  { label: 'Promotions', action: '/promotions', icon: Megaphone },
  { label: 'Rewards', action: '/rewards', icon: Gift },
];

export default function CommandBar({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 20);
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (action: string) => {
    router.push(action);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24"
      style={{ background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--card-solid)', borderColor: 'var(--stroke)' }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--stroke)' }}>
          <Search size={18} style={{ color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--ink)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0].action);
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl"
            style={{ color: 'var(--muted)' }}
            aria-label="Close command bar"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.label}
                onClick={() => handleSelect(cmd.action)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[color:var(--accent-soft)]"
                style={{ color: 'var(--ink)' }}
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                >
                  <Icon size={17} />
                </span>
                <span>{cmd.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
              No matching page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
