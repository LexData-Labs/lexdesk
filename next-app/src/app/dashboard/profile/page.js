'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import { fmtTime } from '@/lib/attend';

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Downscale an image to a small JPEG data URL so it fits in localStorage.
function fileToResizedDataUrl(file, maxSize = 256) {
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
  const [events, setEvents] = useState(null);
  const [attLoading, setAttLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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
        const res = await fetch('/api/me/attendance?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (active) setEvents(res.ok ? json.events || [] : []);
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setAttLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const checkIns = (events || []).filter((e) => e.type === 'CHECK_IN');
    const late = checkIns.filter((e) => e.isLate).length;
    const onTime = checkIns.length - late;
    const lastCheckIn = checkIns.reduce(
      (m, e) => Math.max(m, e.timestamp ? new Date(e.timestamp).getTime() : 0),
      0,
    );
    const rate = checkIns.length ? Math.round((onTime / checkIns.length) * 100) : 0;
    return { checkIns: checkIns.length, late, onTime, lastCheckIn, rate };
  }, [events]);

  if (!user) return null;

  const startEdit = () => { setFormName(user.name || ''); setFormImage(user.avatarImage || null); setError(''); setEditing(true); };
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

  const handleSave = () => {
    const name = formName.trim();
    if (!name) { setError('Name cannot be empty.'); return; }
    const updated = { ...user, name, avatar: initialsFromName(name), avatarImage: formImage || null };
    try {
      localStorage.setItem('user', JSON.stringify(updated));
    } catch {
      setError('Could not save — the image may be too large. Try a smaller one.');
      return;
    }
    setUser(updated);
    setEditing(false);
    window.dispatchEvent(new Event('user-updated'));
  };

  const cards = [
    { label: 'Check-ins', value: stats.checkIns, color: 'text-[var(--color-green)]' },
    { label: 'Late', value: stats.late, color: 'text-[var(--color-yellow)]' },
    { label: 'On-time', value: stats.onTime, color: 'text-[var(--color-blue)]' },
    { label: 'On-time rate', value: `${stats.rate}%`, color: 'text-[var(--color-text-main)]' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" subtitle="Your account and attendance summary" />

      <div className="relative rounded-2xl overflow-hidden mb-2 shadow-sm border border-[var(--color-card-border)]">
        <div className="h-32 bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(59,130,246,0.15)] dark:from-[rgba(139,92,246,0.2)] dark:to-[rgba(59,130,246,0.2)]"></div>

        <div className="bg-[var(--color-card-bg)] px-8 pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative -mt-12 z-10">
            <Avatar
              image={editing ? formImage : user.avatarImage}
              initials={editing ? initialsFromName(formName) : user.avatar}
              alt={user.name}
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
                className="w-full max-w-sm bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-lg px-3 py-2 text-2xl font-bold text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-purple)]"
              />
            ) : (
              <h2 className="text-2xl font-bold text-[var(--color-text-main)]">{user.name}</h2>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5">
              <span className="text-sm text-[var(--color-text-muted)]">{user.email}</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[var(--color-purple)] text-xs font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            {editing && formImage && (
              <button type="button" onClick={() => setFormImage(null)} className="mt-2 text-xs text-[var(--color-red)] hover:underline">
                Remove photo
              </button>
            )}
            {error && <p className="mt-2 text-xs text-[var(--color-red)]">{error}</p>}
          </div>

          <div className="flex gap-2 sm:self-end shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} className="btn-primary py-2 px-4 text-sm">Save</button>
                <button onClick={cancelEdit} className="btn-outline py-2 px-4 text-sm">Cancel</button>
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
                <div key={c.label} className="card">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{c.label}</p>
                  <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Last check-in: <span className="text-[var(--color-text-main)]">{stats.lastCheckIn ? fmtTime(stats.lastCheckIn) : '—'}</span>
            </p>
            <Link href="/dashboard/my-attendance" className="btn-primary py-2 px-4 text-sm self-start inline-block">
              View my attendance
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
