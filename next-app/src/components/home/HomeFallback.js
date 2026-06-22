'use client';

// The classic, dependency-free landing page. Rendered on the server (SEO),
// on mobile / reduced-motion / no-WebGL devices, and whenever the visitor
// chooses "classic view" from the 3D hub. All real content lives here.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';
import { AuthDecor, FeatureChip, SyncIcon, ChartIcon, ShieldIcon, UsersIcon } from '@/components/authDecor';
import { FEATURES, STEPS, APP_DOWNLOAD_URL } from './content';

// Reads the persisted session (localStorage) so the landing page can greet a
// logged-in visitor with their profile menu instead of a "Sign in" button.
// The session lives in localStorage, so it survives tab/window close and is
// only cleared when the user signs out.
function useSession() {
  const [user, setUser] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    let token, stored;
    try {
      token = localStorage.getItem('token');
      stored = localStorage.getItem('user');
    } catch { return; }
    if (!token || !stored) return;
    let parsed;
    try { parsed = JSON.parse(stored); } catch { return; }
    setUser(parsed);
    if (parsed.role !== 'lexsysadmin') {
      fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.profile) setPhotoUrl(d.profile.photoUrl || null); })
        .catch(() => {});
    }
  }, []);

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    setUser(null);
    setPhotoUrl(null);
  };

  return { user, photoUrl, logout };
}

function Logo() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-black border border-white/20 bg-gradient-to-br from-white/15 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(0,0,0,0.25)] flex items-center justify-center text-white font-bold">T</div>
      <span className="text-xl font-bold tracking-tight text-[var(--color-text-main)]">TeamOS</span>
    </div>
  );
}

export default function HomeFallback({ onEnterHub }) {
  const { user, photoUrl, logout } = useSession();
  // Where a logged-in visitor's primary CTA should point.
  const dashHref = user?.role === 'employee' ? '/dashboard/my-dashboard' : '/dashboard';

  return (
    <div className="relative overflow-hidden min-h-screen bg-[var(--color-bg)]">
      <AuthDecor />

      <div className="relative max-w-[1400px] mx-auto w-full px-4 sm:px-8 md:px-16">
        {/* Top nav */}
        <header className="flex items-center justify-between py-6">
          <Logo />
          <div className="flex items-center gap-3">
            {onEnterHub && (
              <button
                type="button"
                onClick={onEnterHub}
                className="btn-outline px-4 py-2.5 text-[0.85rem] hidden sm:inline-flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-main)] animate-pulse" />
                Immersive mode
              </button>
            )}
            {user ? (
              <ProfileMenu user={user} photoUrl={photoUrl} onLogout={logout} />
            ) : (
              <Link href="/register" className="btn-primary px-5 py-2.5 text-[0.9rem] no-underline">
                Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center text-center py-12 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-card-border)] bg-[var(--color-card-bg)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-muted)] backdrop-blur mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
            TeamOS · powered by LexData Labs
          </span>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] mb-6 max-w-[900px] bg-gradient-to-br from-[var(--color-text-main)] to-[var(--color-text-muted)] text-transparent bg-clip-text">
            Where Teams Work Better Together.
          </h1>
          <p className="text-base sm:text-xl text-[var(--color-text-muted)] mb-8 leading-relaxed max-w-[680px]">
            A high-fidelity platform for employee attendance, leave, and team management with robust
            role-based access — built for modern teams.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href={user ? dashHref : '/register'} className="btn-primary px-7 py-3.5 text-[0.95rem] no-underline">
              {user ? 'Go to dashboard' : 'Get started'}
            </Link>
            <a href="#features" className="btn-outline px-7 py-3.5 text-[0.95rem] no-underline">
              Explore features
            </a>
          </div>

          <ul className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto list-none p-0 mt-12">
            <FeatureChip label="Real-time Sync" icon={<SyncIcon />} />
            <FeatureChip label="Advanced Analytics" icon={<ChartIcon />} />
            <FeatureChip label="Role-based Access" icon={<ShieldIcon />} />
            <FeatureChip label="Leave & Teams" icon={<UsersIcon />} />
          </ul>
        </section>

        {/* Features */}
        <section id="features" className="py-12 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-[var(--color-text-main)]">
              Everything your workforce needs
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-[620px] mx-auto">
              From verified check-ins to approvals and analytics — one platform for the whole employee lifecycle.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:-translate-y-1 transition-transform duration-300">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[var(--color-purple)] mb-4">
                  {f.icon}
                </span>
                <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-main)]">{f.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-[var(--color-text-main)]">
              Up and running in three steps
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card">
                <div className="text-3xl font-extrabold text-[var(--color-text-muted)] mb-3">{s.n}</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-main)]">{s.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="py-12 md:py-20">
          <div className="card text-center px-6 py-12 md:py-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-main)]">
              Ready to streamline attendance?
            </h2>
            <p className="text-[var(--color-text-muted)] mb-8 max-w-[560px] mx-auto">
              Sign in to your workspace, or download the mobile app to start checking in.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={user ? dashHref : '/register'} className="btn-primary px-7 py-3.5 text-[0.95rem] no-underline">
                {user ? 'Go to dashboard' : 'Sign in'}
              </Link>
              {APP_DOWNLOAD_URL && (
                <a
                  href={APP_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="btn-outline px-7 py-3.5 text-[0.95rem] no-underline"
                >
                  Download the app
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 py-10 border-t border-[var(--color-card-border)]">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Logo />
            <span className="text-xs text-[var(--color-text-muted)]">powered by LexData Labs</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">&copy; 2026 TeamOS. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
