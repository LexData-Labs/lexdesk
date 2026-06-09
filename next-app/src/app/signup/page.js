'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [form, setForm] = useState({
    companyName: '',
    companyDomain: '',
    adminName: '',
    adminEmail: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)] bg-[var(--color-bg)]">
      <nav className="px-4 sm:px-8 md:px-16 py-6 flex justify-between items-center border-b border-[var(--color-card-border)] bg-[rgba(7,11,20,0.6)] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-[var(--color-text-main)] no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-sm text-white">L</div>
          LexDesk
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
        <div className="w-full sm:max-w-[480px] p-6 sm:p-10 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-[var(--color-text-main)]">Create your organization</h2>
            <p className="text-[var(--color-text-muted)] text-[0.95rem]">Set up LexDesk for your company in a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="text-sm text-[var(--color-red)] text-center">{error}</div>}

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Company name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Inc." required maxLength={120} className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Company domain</label>
              <input type="text" value={form.companyDomain} onChange={set('companyDomain')} placeholder="acme.com" required maxLength={120} className={inputCls} />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Each company domain can register once.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Your name</label>
                <input type="text" value={form.adminName} onChange={set('adminName')} placeholder="Jane Doe" required maxLength={120} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Your email</label>
                <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="jane@acme.com" required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
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
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center mt-2">
              {loading ? 'Creating…' : 'Create organization'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-card-border)] text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link href="/" className="text-[var(--color-purple)] hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
