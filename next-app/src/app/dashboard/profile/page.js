'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import KpiCard from '@/components/KpiCard';
import MonthNav from '@/components/MonthNav';
import { canonicalStats, inBdMonth } from '@/lib/attend';

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fmtLastSeen(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Downscale an image to a small JPEG data URL so it fits in localStorage.
function fileToResizedDataUrl(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ICONS = {
  check: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
  clock: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  star: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
  percent: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>),
};

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState(null);
  const [attLoading, setAttLoading] = useState(true);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [adProfile, setAdProfile] = useState(null);

  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (!stored) { router.push('/'); return; }
      setUser(stored);
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const [attRes, profRes] = await Promise.all([
          fetch('/api/me/attendance?limit=500', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        ]);
        const attJson = await attRes.json().catch(() => ({}));
        const profJson = await profRes.json().catch(() => ({}));
        if (!active) return;
        setEvents(attRes.ok ? attJson.events || [] : []);
        if (profRes.ok) setAdProfile(profJson.profile || null);
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setAttLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const monthEvents = useMemo(() => (events || []).filter((e) => inBdMonth(e.timestamp, ym.y, ym.m)), [events, ym]);
  const stats = useMemo(() => {
    const s = canonicalStats(monthEvents);
    const rate = s.presentDays ? Math.round((s.onTimeDays / s.presentDays) * 100) : 0;
    return { ...s, rate };
  }, [monthEvents]);

  if (!user) return null;

  const displayName = adProfile?.name || user.name;
  const photo = adProfile?.photoUrl || user.avatarImage || null;

  const startEdit = () => { setFormName(displayName || ''); setFormImage(null); setError(''); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setError(''); };

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setFormImage(dataUrl);
      setError('');
    } catch {
      setError('Could not read that image. Try another one.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { setError('Name cannot be empty.'); return; }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // 1) Name — only if it changed.
      if (name !== displayName) {
        const res = await fetch('/api/me/profile', { method: 'POST', headers: authHeaders, body: JSON.stringify({ name }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save name');
      }

      // 2) Photo — only if a new one was picked (a data URL) → uploads to AttendDesk.
      let newPhotoUrl = null;
      if (formImage && formImage.startsWith('data:')) {
        const res = await fetch('/api/me/photo', { method: 'POST', headers: authHeaders, body: JSON.stringify({ dataUrl: formImage }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
        newPhotoUrl = data.photoUrl || null;
      }

      const updated = { ...user, name, avatar: initialsFromName(name) };
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch { /* ignore */ }
      setUser(updated);
      setAdProfile((p) => ({ ...(p || {}), name, photoUrl: newPhotoUrl || p?.photoUrl || null }));
      setEditing(false);
      window.dispatchEvent(new Event('user-updated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pw.current || !pw.next) { setPwError('Enter your current and new password.'); return; }
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('New password and confirmation do not match.'); return; }
    setPwBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPw({ current: '', next: '', confirm: '' });
      setPwSuccess('Password changed.');
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  };

  const cards = [
    { label: 'Present days', value: stats.presentDays, color: 'green', icon: ICONS.check },
    { label: 'Late', value: stats.lateDays, color: 'yellow', icon: ICONS.clock },
    { label: 'On-time', value: stats.onTimeDays, color: 'blue', icon: ICONS.star },
    { label: 'On-time rate', value: `${stats.rate}%`, color: 'purple', icon: ICONS.percent },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" subtitle="Your account and attendance summary" actions={<MonthNav value={ym} onChange={setYm} />} />

      <div className="relative rounded-2xl overflow-hidden mb-2 shadow-sm border border-[var(--color-card-border)]">
        <div className="h-32 bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(59,130,246,0.15)] dark:from-[rgba(139,92,246,0.2)] dark:to-[rgba(59,130,246,0.2)]"></div>

        <div className="bg-[var(--color-card-bg)] px-8 pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative -mt-12 z-10">
            <Avatar
              image={editing ? (formImage || photo) : photo}
              initials={editing ? initialsFromName(formName) : (user.avatar || initialsFromName(displayName))}
              alt={displayName}
              className="w-24 h-24 font-bold text-white text-3xl shadow-lg ring-4 ring-[var(--color-card-bg)]"
            />
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--color-purple)] text-white flex items-center justify-center shadow-md hover:opacity-90"
                  title="Change photo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
              </>
            )}
          </div>

          <div className="flex-1 w-full text-center sm:text-left mt-2 sm:mt-0">
            {editing ? (
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
                className="w-full max-w-sm bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-2xl font-bold text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
            ) : (
              <h2 className="text-2xl font-bold text-[var(--color-text-main)]">{displayName}</h2>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-[var(--color-text-muted)]">{user.email}</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] text-xs font-bold uppercase tracking-wider">
                {user.role}
              </span>
              {adProfile?.faceEnrolledAt && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[var(--color-green)] text-xs font-semibold">
                  Face enrolled
                </span>
              )}
            </div>
            {editing && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Name and photo are saved to AttendDesk and sync everywhere.
                {formImage && (
                  <button type="button" onClick={() => setFormImage(null)} className="ml-2 text-[var(--color-red)] hover:underline">Clear selection</button>
                )}
              </p>
            )}
            {error && <p className="mt-2 text-xs text-[var(--color-red)]">{error}</p>}
          </div>

          <div className="flex gap-2 sm:self-end shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={cancelEdit} disabled={saving} className="btn-outline py-2 px-4 text-sm">Cancel</button>
              </>
            ) : (
              <button onClick={startEdit} className="btn-outline py-2 px-4 text-sm">Edit Profile</button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-4">At a Glance</h3>
        {attLoading ? (
          <div className="card text-[var(--color-text-muted)] text-sm">Loading attendance…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {cards.map((c) => (
                <KpiCard key={c.label} label={c.label} value={c.value} color={c.color} icon={c.icon} />
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Last check-in: <span className="text-[var(--color-text-main)]">{fmtLastSeen(stats.lastCheckIn)}</span>
            </p>
          </>
        )}
      </div>

      {/* Change Password — updates the AttendDesk sign-in password */}
      <div className="card max-w-xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg text-[var(--color-text-main)]">Change Password</h3>
          <button type="button" onClick={() => setShowPw((v) => !v)} className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-5">Updates your AttendDesk sign-in password (web, mobile, and kiosk).</p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Current password</label>
            <input type={showPw ? 'text' : 'password'} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">New password</label>
              <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Confirm new password</label>
              <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]" />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Use at least 8 characters.</p>
          {pwError && <p className="text-sm text-[var(--color-red)]">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-[var(--color-green)]">{pwSuccess}</p>}
          <div>
            <button type="submit" disabled={pwBusy} className="btn-primary py-2 px-5 text-sm disabled:opacity-60">{pwBusy ? 'Saving…' : 'Update password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
