'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Download,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/utils/cn';

type TabKey = 'accounts' | 'audit';

interface AdminAccount {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  disabledAt?: string | null;
  temporaryPasswordIssuedAt?: string | null;
}

interface AuditLog {
  id: string;
  createdAt?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  status: string;
  summary: string;
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const AUDIT_MODULES = [
  'all',
  'admin-accounts',
  'verification',
  'digital-ids',
  'youth',
  'merchants',
  'rewards',
  'vouchers',
  'promotions',
  'physical-id-requests',
  'points-transactions',
];

export default function AdminControlsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('accounts');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');

  const [audit, setAudit] = useState<AuditResponse>({
    logs: [],
    pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
  });
  const [auditFilters, setAuditFilters] = useState({
    search: '',
    actor: '',
    module: 'all',
    action: '',
    target: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [auditPage, setAuditPage] = useState(1);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  async function loadAccounts() {
    setIsAccountsLoading(true);
    setAccountError('');
    try {
      const response = await api.get<{ accounts: AdminAccount[] }>('/admin/admin-accounts');
      setAccounts(response.data.accounts || []);
    } catch (error) {
      setAccountError(getApiError(error, 'Unable to load admin accounts.'));
    } finally {
      setIsAccountsLoading(false);
    }
  }

  async function loadAuditLogs(page = auditPage) {
    setIsAuditLoading(true);
    setAuditError('');
    try {
      const response = await api.get<AuditResponse>('/admin/audit-logs', {
        params: {
          ...auditFilters,
          page,
          pageSize: audit.pagination.pageSize,
        },
      });
      setAudit(response.data);
      setAuditPage(response.data.pagination.page);
    } catch (error) {
      setAuditError(getApiError(error, 'Unable to load audit logs.'));
    } finally {
      setIsAuditLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      void loadAuditLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const accountStats = useMemo(() => {
    const active = accounts.filter((account) => account.status !== 'disabled').length;
    const disabled = accounts.filter((account) => account.status === 'disabled').length;
    return { active, disabled, total: accounts.length };
  }, [accounts]);

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    setTemporaryPassword('');
    setAccountMessage('');
    setAccountError('');

    try {
      const response = await api.post<{
        account: AdminAccount;
        temporaryPassword: string;
      }>('/admin/admin-accounts', {
        displayName,
        email,
      });

      setTemporaryPassword(response.data.temporaryPassword);
      setAccountMessage(`Admin account created for ${response.data.account.email}.`);
      setDisplayName('');
      setEmail('');
      await loadAccounts();
    } catch (error) {
      setAccountError(getApiError(error, 'Unable to create admin account.'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleResetPassword(account: AdminAccount) {
    setAccountError('');
    setAccountMessage('');
    setTemporaryPassword('');

    try {
      const response = await api.post<{ temporaryPassword: string }>(
        `/admin/admin-accounts/${account.uid}/reset-password`
      );
      setTemporaryPassword(response.data.temporaryPassword);
      setAccountMessage(`Temporary password reset for ${account.email}.`);
      await loadAccounts();
    } catch (error) {
      setAccountError(getApiError(error, 'Unable to reset temporary password.'));
    }
  }

  async function handleToggleStatus(account: AdminAccount) {
    const nextStatus = account.status === 'disabled' ? 'active' : 'disabled';
    setAccountError('');
    setAccountMessage('');

    try {
      await api.patch(`/admin/admin-accounts/${account.uid}/status`, { status: nextStatus });
      setAccountMessage(`${account.email} is now ${nextStatus}.`);
      await loadAccounts();
    } catch (error) {
      setAccountError(getApiError(error, 'Unable to update admin status.'));
    }
  }

  async function handleAuditSearch(event: FormEvent) {
    event.preventDefault();
    await loadAuditLogs(1);
  }

  async function handleExportAudit() {
    setAuditError('');
    try {
      const response = await api.get('/admin/audit-logs/export', {
        params: auditFilters,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setAuditError(getApiError(error, 'Unable to export audit logs.'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Super Admin
        </div>
        <h1 className="text-[2rem] font-black tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
          Admin Controls
        </h1>
        <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
          Create administrator access and review accountable system activity from one place.
        </p>
      </section>

      <div className="flex w-fit rounded-2xl border p-1" style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}>
        <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<UsersRound className="h-4 w-4" />}>
          Admin Accounts
        </TabButton>
        <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Search className="h-4 w-4" />}>
          Audit Trail
        </TabButton>
      </div>

      {activeTab === 'accounts' ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.35fr)]">
          <div className="admin-card h-fit">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Create Admin</h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Temporary credentials are shown once.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-5 flex flex-col gap-4">
              <FieldLabel label="Display Name">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
              </FieldLabel>
              <FieldLabel label="Email">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="surface-input rounded-xl px-3 py-2.5 text-sm" />
              </FieldLabel>
              <button type="submit" disabled={isCreating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 text-sm font-bold text-white disabled:opacity-60">
                {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {isCreating ? 'Creating...' : 'Generate Account'}
              </button>
            </form>

            {accountMessage ? <Notice tone="success">{accountMessage}</Notice> : null}
            {accountError ? <Notice tone="danger">{accountError}</Notice> : null}
            {temporaryPassword ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Temporary password</p>
                <p className="mt-2 select-all rounded-xl bg-white px-3 py-2 font-mono text-base font-black text-[#0b2f5b]">
                  {temporaryPassword}
                </p>
              </div>
            ) : null}
          </div>

          <div className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Admin Accounts</h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {accountStats.total} total - {accountStats.active} active - {accountStats.disabled} disabled
                </p>
              </div>
              <button onClick={loadAccounts} className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold" style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase" style={{ color: 'var(--muted)' }}>
                  <tr>
                    <th className="px-3 py-2">Admin</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAccountsLoading ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Loading accounts...</td></tr>
                  ) : accounts.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>No generated admins yet.</td></tr>
                  ) : accounts.map((account) => (
                    <tr key={account.uid} className="border-t" style={{ borderColor: 'var(--stroke)' }}>
                      <td className="px-3 py-3">
                        <p className="font-semibold" style={{ color: 'var(--ink)' }}>{account.displayName}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{account.email}</p>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={account.status} /></td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(account.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleResetPassword(account)} className="grid h-9 w-9 place-items-center rounded-xl border" style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }} title="Reset temporary password">
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(account)} className="rounded-xl border px-3 text-xs font-bold" style={{ borderColor: 'var(--stroke)', color: account.status === 'disabled' ? 'var(--accent-strong)' : '#be123c' }}>
                            {account.status === 'disabled' ? 'Enable' : 'Disable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="admin-card">
          <form onSubmit={handleAuditSearch} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldLabel label="Search">
              <input value={auditFilters.search} onChange={(event) => setAuditFilters((current) => ({ ...current, search: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>
            <FieldLabel label="Actor">
              <input value={auditFilters.actor} onChange={(event) => setAuditFilters((current) => ({ ...current, actor: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>
            <FieldLabel label="Module">
              <select value={auditFilters.module} onChange={(event) => setAuditFilters((current) => ({ ...current, module: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm">
                {AUDIT_MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Action">
              <input value={auditFilters.action} onChange={(event) => setAuditFilters((current) => ({ ...current, action: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>
            <FieldLabel label="Target">
              <input value={auditFilters.target} onChange={(event) => setAuditFilters((current) => ({ ...current, target: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>
            <FieldLabel label="Status">
              <select value={auditFilters.status} onChange={(event) => setAuditFilters((current) => ({ ...current, status: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm">
                <option value="all">all</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
            </FieldLabel>
            <FieldLabel label="From">
              <input type="date" value={auditFilters.dateFrom} onChange={(event) => setAuditFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>
            <FieldLabel label="To">
              <input type="date" value={auditFilters.dateTo} onChange={(event) => setAuditFilters((current) => ({ ...current, dateTo: event.target.value }))} className="surface-input rounded-xl px-3 py-2.5 text-sm" />
            </FieldLabel>

            <div className="flex gap-2 md:col-span-2 xl:col-span-4">
              <button type="submit" disabled={isAuditLoading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 text-sm font-bold text-white disabled:opacity-60">
                <Search className="h-4 w-4" />
                Apply Filters
              </button>
              <button type="button" onClick={handleExportAudit} className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold" style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}>
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </form>

          {auditError ? <Notice tone="danger">{auditError}</Notice> : null}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase" style={{ color: 'var(--muted)' }}>
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {isAuditLoading ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>Loading audit logs...</td></tr>
                ) : audit.logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>No audit records match these filters.</td></tr>
                ) : audit.logs.map((log) => (
                  <tr key={log.id} className="border-t align-top" style={{ borderColor: 'var(--stroke)' }}>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>{log.actorEmail || 'System'}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{log.actorRole || '-'}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold" style={{ color: 'var(--ink-soft)' }}>{log.module}</td>
                    <td className="px-3 py-3">{prettify(log.action)}</td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted)' }}>{log.targetLabel || log.targetId || '-'}</td>
                    <td className="px-3 py-3"><StatusPill status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--muted)' }}>
            <span>Page {audit.pagination.page} of {audit.pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={audit.pagination.page <= 1 || isAuditLoading} onClick={() => loadAuditLogs(audit.pagination.page - 1)} className="rounded-xl border px-3 py-2 disabled:opacity-50" style={{ borderColor: 'var(--stroke)' }}>Previous</button>
              <button disabled={audit.pagination.page >= audit.pagination.totalPages || isAuditLoading} onClick={() => loadAuditLogs(audit.pagination.page + 1)} className="rounded-xl border px-3 py-2 disabled:opacity-50" style={{ borderColor: 'var(--stroke)' }}>Next</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition', active ? 'shadow-sm' : '')}
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent-strong)' : 'var(--ink-soft)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
      {label}
      {children}
    </label>
  );
}

function Notice({ tone, children }: { tone: 'success' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'mt-4 rounded-2xl border px-4 py-3 text-sm',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-700'
      )}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isBad = status === 'disabled' || status === 'failed';
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', isBad ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
      {prettify(status || 'active')}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function prettify(value: string) {
  return value.split(/[-_]/).join(' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = error.response as { data?: { error?: string } } | undefined;
    if (response?.data?.error) return response.data.error;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
