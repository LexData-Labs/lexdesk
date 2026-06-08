'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('signin'); // 'signin' | 'forgot'
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
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

  const handleForgot = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMsg('');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send reset link');
      setResetMsg('If an account exists for that email, we’ve sent a password reset link — check your inbox.');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)] bg-[var(--color-bg)]">
      <nav className="px-16 py-6 flex justify-between items-center border-b border-[var(--color-card-border)] bg-[rgba(7,11,20,0.6)] backdrop-blur-md">
        <div className="flex items-center gap-3 text-2xl font-bold text-[var(--color-text-main)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-sm text-white">L</div>
          LexDesk
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-between px-16 max-w-[1400px] mx-auto w-full gap-16">
        <div className="flex-1 max-w-[600px]">
          <h1 className="text-6xl font-extrabold leading-[1.1] mb-6 bg-gradient-to-br from-[var(--color-text-main)] to-[var(--color-text-muted)] text-transparent bg-clip-text">
            Next-Gen Attendance Management
          </h1>
          <p className="text-xl text-[var(--color-text-muted)] mb-10 leading-relaxed">
            A high-fidelity platform for employee attendance, leave, and team management with robust role-based access.
          </p>
          <div className="flex gap-8 text-[0.95rem] text-[var(--color-text-muted)] font-medium">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Real-time Sync
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Advanced Analytics
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-[var(--color-green)] text-xs">✓</div>
              Role Based Views
            </div>
          </div>
        </div>

        <div className="w-[450px] p-10 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-[var(--color-text-main)]">{mode === 'forgot' ? 'Reset password' : 'Sign In'}</h2>
            <p className="text-[var(--color-text-muted)] text-[0.95rem]">{mode === 'forgot' ? 'We’ll email you a reset link' : 'Access your workspace based on your role'}</p>
          </div>

          <form onSubmit={handleLogin} className={mode === 'forgot' ? 'hidden' : undefined}>
            {error && <div className="mb-4 text-sm text-[var(--color-red)] text-center">{error}</div>}
            
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all"
              />
            </div>
            
            <div className="mb-8 relative">
              <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-4 py-3 pr-10 text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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

            <div className="mb-4 text-right -mt-4">
              <button type="button" onClick={() => { setMode('forgot'); setResetEmail(email); setResetMsg(''); setResetError(''); }} className="text-xs text-[var(--color-purple)] hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              {resetError && <div className="mb-4 text-sm text-[var(--color-red)] text-center">{resetError}</div>}
              {resetMsg ? (
                <div className="mb-6 text-sm text-[var(--color-green)] text-center">{resetMsg}</div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-muted)]">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all"
                  />
                </div>
              )}
              {!resetMsg && (
                <button type="submit" disabled={resetLoading} className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center">
                  {resetLoading ? 'Sending…' : 'Send reset link'}
                </button>
              )}
              <div className="mt-4 text-center">
                <button type="button" onClick={() => { setMode('signin'); setResetMsg(''); setResetError(''); }} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}

          {APP_DOWNLOAD_URL && mode === 'signin' && (
            <div className="mt-6 pt-5 border-t border-[var(--color-card-border)] text-center text-sm text-[var(--color-text-muted)]">
              Use the mobile app to check in ·{' '}
              <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" download className="text-[var(--color-purple)] hover:underline font-medium">
                Download the app
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
