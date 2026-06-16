'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { persistAdminSession } from '@/lib/session';
import { resolveApiBaseUrl } from '@/lib/api-base-url';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loginName = username.trim();
      const isEmailLogin = loginName.includes('@');
      const userCredential = isEmailLogin
        ? await signInWithEmailAndPassword(auth, loginName, password)
        : await signInWithCustomToken(
            auth,
            await getBootstrapAdminToken(loginName, password),
          );
      const token = await userCredential.user.getIdToken();
      const session = await persistAdminSession(token, password);
      const role = session.user?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        await auth.signOut();
        setError('Access denied. This portal is for admins only.');
        setIsLoading(false);
        return;
      }
      window.localStorage.setItem('kk-admin-role', role);
      window.localStorage.setItem(
        'kk-admin-email',
        session.user?.email || userCredential.user.email || '',
      );

      if (session.user?.mustChangePassword) {
        window.localStorage.setItem('kk-admin-must-change-password', 'true');
        router.push('/change-password');
      } else {
        window.localStorage.removeItem('kk-admin-must-change-password');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (
        message.includes('wrong-password') ||
        message.includes('user-not-found') ||
        message.includes('invalid-credential')
      ) {
        setError('Invalid username or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            KK
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
              KK Admin Panel
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Kabataang Katipunan · Barangay Buting
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="admin-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            Administrator Login
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Use your admin credentials to access the dashboard.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or admin email"
                required
                autoComplete="username"
                className="surface-input rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="surface-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--accent)]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45"
                  style={{ color: 'var(--muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
          Kabataang Katipunan &copy; {new Date().getFullYear()} · Admin Access Only
        </p>
      </div>
    </div>
  );
}

async function getBootstrapAdminToken(username: string, password: string) {
  const adminLoginResponse = await fetch(`${resolveApiBaseUrl()}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ username, password }),
  });
  const adminLoginPayload = await adminLoginResponse.json().catch(() => null);

  if (!adminLoginResponse.ok || !adminLoginPayload?.token) {
    throw new Error(String(adminLoginPayload?.error || 'Invalid username or password.'));
  }

  return String(adminLoginPayload.token);
}
