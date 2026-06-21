'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--color-card-border)] last:border-0">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[var(--color-text-main)] font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
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

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [adProfile, setAdProfile] = useState(null);
  const [office, setOffice] = useState(null);

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
      if (!stored) { router.push('/register'); return; }
      setUser(stored);
    } catch {
      router.push('/register');
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [profRes, offRes] = await Promise.all([
          fetch('/api/me/profile', { headers, cache: 'no-store' }),
          fetch('/api/me/office', { headers, cache: 'no-store' }),
        ]);
        const profJson = await profRes.json().catch(() => ({}));
        const offJson = await offRes.json().catch(() => ({}));
        if (!active) return;
        if (profRes.ok) setAdProfile(profJson.profile || null);
        if (offRes.ok) setOffice(offJson || null);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" subtitle="Manage your account and password" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: profile card */}
        <div className="card flex flex-col">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar
                image={editing ? (formImage || photo) : photo}
                initials={editing ? initialsFromName(formName) : (user.avatar || initialsFromName(displayName))}
                alt={displayName}
                className="w-16 h-16 text-lg font-bold"
              />
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center shadow-md hover:opacity-90"
                    title="Change photo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-1.5 text-xl font-bold text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
                />
              ) : (
                <h2 className="text-xl font-bold text-[var(--color-text-main)] truncate">{displayName}</h2>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-[var(--color-text-muted)] capitalize">{(user.role || '').toLowerCase() || '—'}</span>
                {adProfile?.faceEnrolledAt && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[var(--color-green)] text-[0.65rem] font-semibold">
                    Face enrolled
                  </span>
                )}
              </div>
            </div>

            {!editing && (
              <button onClick={startEdit} className="btn-outline py-1.5 px-3 text-xs shrink-0">Edit</button>
            )}
          </div>

          <div className="mt-5 flex flex-col text-sm">
            <Row label="Employee ID" value={adProfile?.employeeId || '—'} />
            <Row label="Department" value={adProfile?.teamName || '—'} />
            <Row label="Branch" value={office?.name || '—'} />
            <Row label="Joining date" value={fmtDate(adProfile?.joiningDate)} />
            <Row label="Email" value={user.email || adProfile?.email || '—'} />
          </div>

          {error && <p className="mt-3 text-xs text-[var(--color-red)]">{error}</p>}

          {editing && (
            <>
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                Name and photo are saved to AttendDesk and sync everywhere.
                {formImage && (
                  <button type="button" onClick={() => setFormImage(null)} className="ml-2 text-[var(--color-red)] hover:underline">Clear selection</button>
                )}
              </p>
              <div className="mt-4 flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={cancelEdit} disabled={saving} className="btn-outline py-2 px-4 text-sm">Cancel</button>
              </div>
            </>
          )}
        </div>

        {/* Right: Change Password — updates the AttendDesk sign-in password */}
        <div className="card">
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
    </div>
  );
}
