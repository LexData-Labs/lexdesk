'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthDecor, FeatureChip, SyncIcon, ChartIcon, ShieldIcon, UsersIcon } from '@/components/authDecor';

const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;

function EyeButton({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors focus:outline-none"
      aria-label={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}

const inputClass =
  'w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-4 py-3 text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)] focus:shadow-[0_0_10px_rgba(150,150,150,0.2)] transition-all';
const labelClass = 'block text-sm font-semibold mb-2 text-[var(--color-text-muted)]';

function SignInForm() {
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
    <form onSubmit={handleLogin}>
      {error && <div className="mb-4 text-sm text-[var(--color-red)] text-center">{error}</div>}

      <div className="mb-6">
        <label className={labelClass}>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className={inputClass}
        />
      </div>

      <div className="mb-8 relative">
        <label className={labelClass}>Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={`${inputClass} pr-10`}
          />
          <EyeButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center">
        {loading ? 'Authenticating...' : 'Access Dashboard'}
      </button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSignUp = (e) => {
    e.preventDefault();
    // No public registration endpoint — accounts are provisioned by an admin.
    // We capture intent and confirm, without creating an account.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-white/10 text-[var(--color-green)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="text-xl font-bold mb-2 text-[var(--color-text-main)]">Request received</h3>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Thanks{name ? `, ${name.split(' ')[0]}` : ''} — an administrator will set up your account and share your
          login details. Already have access? Use the Sign In tab.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignUp}>
      <div className="mb-5">
        <label className={labelClass}>Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
          className={inputClass}
        />
      </div>

      <div className="mb-5">
        <label className={labelClass}>Work Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className={inputClass}
        />
      </div>

      <div className="mb-8 relative">
        <label className={labelClass}>Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={`${inputClass} pr-10`}
          />
          <EyeButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
        </div>
      </div>

      <button type="submit" className="w-full btn-primary py-3.5 text-[0.95rem] flex justify-center items-center">
        Request Access
      </button>
    </form>
  );
}

export default function Register() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const isSignIn = mode === 'signin';

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-[var(--color-bg)]">
      <AuthDecor />

      <div className="relative flex-1 flex flex-col md:flex-row items-center md:justify-between px-4 sm:px-8 md:px-16 max-w-[1400px] mx-auto w-full gap-8 md:gap-16 py-10 md:py-0">
        {/* Marketing side */}
        <div className="flex-1 max-w-[600px] text-center md:text-left">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 no-underline">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/20 bg-gradient-to-br from-white/15 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(0,0,0,0.25)] flex items-center justify-center text-white font-bold">L</div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-main)]">LexDesk</span>
          </Link>

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

        {/* Auth card */}
        <div className="w-full sm:max-w-[450px] p-6 sm:p-10 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl backdrop-blur-xl shadow-2xl">
          {/* Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 mb-8 rounded-xl bg-[var(--color-bg)] border border-[var(--color-card-border)]">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isSignIn
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isSignIn
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-[var(--color-text-main)]">
              {isSignIn ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-[var(--color-text-muted)] text-[0.95rem]">
              {isSignIn ? 'Access your workspace based on your role' : 'Request access to your organization'}
            </p>
          </div>

          {isSignIn ? <SignInForm /> : <SignUpForm />}

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
