'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = [
  { role: 'superadmin', label: 'Super Admin', email: 'superadmin@example.com', password: 'admin123' },
  { role: 'admin',      label: 'Admin',       email: 'admin@example.com',      password: 'admin123' },
  { role: 'employee',   label: 'Employee',    email: 'employee@example.com',   password: 'user123' },
];

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const useDemo = (acct) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[28rem] h-[28rem] rounded-full bg-[var(--color-purple)] opacity-[0.08] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-[28rem] h-[28rem] rounded-full bg-[var(--color-blue)] opacity-[0.08] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-bg)_70%)]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_24px_var(--color-purple-glow)] flex items-center justify-center text-white text-xl font-bold">
              A
            </div>
            <span className="text-[1.6rem] font-semibold text-white tracking-tight">Attendance Pro</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Sign in to access your dashboard</p>
        </div>

        <div className="bg-[rgba(15,23,42,0.7)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-7">
          <form onSubmit={handleLogin} className="flex flex-col gap-5" autoComplete="on">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-white text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg px-4 py-3 pr-11 text-white text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-sm text-[var(--color-red)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 mt-1 bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)] text-white font-semibold text-sm rounded-lg shadow-[0_4px_20px_var(--color-purple-glow)] transition-all hover:shadow-[0_6px_28px_var(--color-purple-glow)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_var(--color-purple-glow)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-card-border)]">
            <button
              type="button"
              onClick={() => setShowDemo(s => !s)}
              className="w-full text-xs text-[var(--color-text-muted)] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{showDemo ? 'Hide' : 'Use a'} demo account</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showDemo ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDemo && (
              <div className="mt-4 grid gap-2">
                {DEMO_ACCOUNTS.map(acct => (
                  <button
                    key={acct.role}
                    type="button"
                    onClick={() => useDemo(acct)}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--color-card-border)] hover:border-[var(--color-purple)] hover:bg-black/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium">{acct.label}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] truncate">{acct.email}</div>
                      </div>
                      <span className="text-[11px] text-[var(--color-purple)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Use →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--color-text-muted)] mt-6 tracking-wide">
          Attendance Pro · Internal use only
        </p>
      </div>
    </div>
  );
}
