'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { auth } from '@/lib/firebase';
import { persistAdminSession } from '@/lib/session';

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/login');
    }
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (nextPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(user, nextPassword);
      await api.post('/auth/password-changed', {});
      const token = await user.getIdToken(true);
      await persistAdminSession(token);
      window.localStorage.removeItem('kk-admin-must-change-password');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('requires-recent-login')
          ? 'Your session expired. Sign in again using the temporary password, then set a new password.'
          : 'Could not update your password. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            KK
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Change Temporary Password
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            Set a private password before continuing to the admin dashboard.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="admin-panel flex flex-col gap-4"
          style={{ borderRadius: 'var(--radius-lg)', padding: '2rem' }}
        >
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
              New Password
            </label>
            <span className="relative">
              <input
                type={showNextPassword ? 'text' : 'password'}
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="surface-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
              />
              <button
                type="button"
                onClick={() => setShowNextPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45"
                style={{ color: 'var(--muted)' }}
                aria-label={showNextPassword ? 'Hide new password' : 'Show new password'}
                title={showNextPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNextPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
              Confirm Password
            </label>
            <span className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="surface-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45"
                style={{ color: 'var(--muted)' }}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {isSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {isSaving ? 'Saving...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
