'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [form, setForm] = useState({
    companyName: '',
    companyDomain: '',
    adminName: '',
    designation: '',
    adminEmail: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const emailHost = (email) => {
    const at = String(email).indexOf('@');
    return at >= 0 ? String(email).slice(at + 1).toLowerCase().trim() : '';
  };
  const update = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // Company domain is always derived from the admin email — read-only so an
      // admin can't register a company under a domain they don't own.
      if (k === 'adminEmail') next.companyDomain = emailHost(value);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create organization');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide mb-1.5 text-[var(--color-text-muted)]';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-5 bg-[var(--color-bg)]">
      {/* Left — brand panel */}
      <aside className="relative hidden lg:flex lg:col-span-2 flex-col overflow-hidden border-r border-[var(--color-card-border)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_20%,rgba(139,92,246,0.28),transparent_60%),radial-gradient(50%_40%_at_80%_90%,rgba(30,58,138,0.32),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="relative flex flex-1 flex-col p-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] no-underline w-fit">
            <span aria-hidden>←</span> Back to home
          </Link>

          <div className="flex flex-1 flex-col justify-center py-10">
            <Link href="/" className="inline-flex items-center gap-3 no-underline w-fit">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-white font-bold">L</div>
              <span className="text-lg font-semibold tracking-tight text-[var(--color-text-main)]">LexDesk</span>
            </Link>

            <h1 className="mt-6 text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[var(--color-text-main)]">
              Set up attendance for your team in minutes.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              One workspace for attendance, leave, and team management — with role-based access out of the box.
            </p>

            <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 list-none p-0">
              <FeatureChip label="Real-time Sync" icon={<SyncIcon />} />
              <FeatureChip label="Advanced Analytics" icon={<ChartIcon />} />
              <FeatureChip label="Role-based Access" icon={<ShieldIcon />} />
              <FeatureChip label="Leave & Teams" icon={<UsersIcon />} />
            </ul>
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">© {new Date().getFullYear()} LexDesk</p>
        </div>
      </aside>

      {/* Right — form panel */}
      <section className="relative flex min-h-screen lg:min-h-0 items-center justify-center px-4 py-12 lg:col-span-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_55%_at_50%_-10%,rgba(139,92,246,0.08),transparent_60%)]"
        />
        <div className="relative w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] no-underline">
              <span aria-hidden>←</span> Back to home
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Create your organization</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Set up LexDesk for your company in a minute.</p>
          </div>

          <div className="card">
            {error && (
              <div className="mb-4 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-sm text-[var(--color-red)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Company name</label>
                <input type="text" value={form.companyName} onChange={update('companyName')} placeholder="Acme Inc." required maxLength={120} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Admin email</label>
                <input type="email" autoComplete="email" value={form.adminEmail} onChange={update('adminEmail')} placeholder="you@acme.com" required className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Company domain</label>
                <input type="text" value={form.companyDomain} readOnly tabIndex={-1} aria-readonly="true" placeholder="acme.com" className={`${inputCls} cursor-not-allowed opacity-80`} />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Derived from your admin email. One organization per domain.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Your name</label>
                  <input type="text" autoComplete="name" value={form.adminName} onChange={update('adminName')} placeholder="Jane Doe" required maxLength={120} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <input type="text" value={form.designation} onChange={update('designation')} placeholder="HR Manager" required maxLength={120} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">At least 8 characters.</p>
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center mt-2">
                {loading ? 'Creating…' : 'Create organization'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link href="/" className="font-medium text-[var(--color-purple)] hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureChip({ icon, label }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text-main)] backdrop-blur">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[var(--color-purple)] shrink-0">{icon}</span>
      {label}
    </li>
  );
}

const svgProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function SyncIcon() {
  return (
    <svg {...svgProps}><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
  );
}
function ChartIcon() {
  return (
    <svg {...svgProps}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}
function UsersIcon() {
  return (
    <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
}
