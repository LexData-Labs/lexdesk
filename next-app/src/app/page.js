'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthDecor, FeatureChip, SyncIcon, ChartIcon, ShieldIcon, UsersIcon } from '@/components/authDecor';

const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-[var(--color-bg)]">
      <AuthDecor />

      <div className="relative flex-1 flex flex-col md:flex-row items-center md:justify-between px-4 sm:px-8 md:px-16 max-w-[1400px] mx-auto w-full gap-8 md:gap-16 py-10 md:py-0">
        <div className="flex-1 max-w-[600px] text-center md:text-left">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple)] to-[var(--color-blue)] shadow-[0_0_15px_var(--color-purple-glow)] flex items-center justify-center text-white font-bold">L</div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-main)]">LexDesk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] mb-4 sm:mb-6 bg-gradient-to-br from-[var(--color-text-main)] to-[var(--color-text-muted)] text-transparent bg-clip-text">
            Next-Gen Attendance Management
          </h1>
          <p className="text-base sm:text-xl text-[var(--color-text-muted)] mb-6 md:mb-10 leading-relaxed">
            A high-fidelity platform for employee attendance, leave, and team management with robust role-based access.
          </p>
          <ul className="flex flex-wrap gap-3 justify-center md:justify-start max-w-lg mx-auto md:mx-0 list-none p-0">
            <FeatureChip label="Real-time Sync" icon={<SyncIcon />} />
            <FeatureChip label="Advanced Analytics" icon={<ChartIcon />} />
            <FeatureChip label="Role-based Access" icon={<ShieldIcon />} />
            <FeatureChip label="Leave & Teams" icon={<UsersIcon />} />
          </ul>
        </div>

        <div className="w-full sm:max-w-[450px] p-6 sm:p-10 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-[var(--color-text-main)]">Sign In</h2>
            <p className="text-[var(--color-text-muted)] text-[0.95rem]">Access your workspace based on your role</p>
          </div>

          <form onSubmit={handleLogin}>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          {APP_DOWNLOAD_URL && (
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
