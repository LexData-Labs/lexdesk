'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSheets } from '@/lib/SheetsContext';
import { computeEmployeeStats } from '@/lib/attendance';
import PageHeader from '@/components/PageHeader';
import Avatar from '@/components/Avatar';
import Link from 'next/link';

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Read an image file and downscale it to a small JPEG data URL so it fits
// comfortably in localStorage (avatars don't need to be large).
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
  const { activeSheetData, loading } = useSheets();

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

  if (!user) return null;

  const employees = activeSheetData
    ? computeEmployeeStats(activeSheetData.rows, activeSheetData.headers)
    : [];
  const match = employees.find(e =>
    user.employeeId ? e.id === String(user.employeeId) : e.name.toLowerCase() === user.name.toLowerCase()
  );

  const startEdit = () => {
    setFormName(user.name || '');
    setFormImage(user.avatarImage || null);
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

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
    const updated = {
      ...user,
      name,
      avatar: initialsFromName(name),
      avatarImage: formImage || null,
    };
    try {
      localStorage.setItem('user', JSON.stringify(updated));
    } catch {
      setError('Could not save — the image may be too large. Try a smaller one.');
      return;
    }
    setUser(updated);
    setEditing(false);
    // Tell the dashboard layout to refresh the sidebar avatar/name.
    window.dispatchEvent(new Event('user-updated'));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" subtitle="Your account and attendance summary" />

      <div className="relative rounded-2xl overflow-hidden mb-2 shadow-sm border border-[var(--color-card-border)]">
        {/* Background Header Block */}
        <div className="h-32 bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(59,130,246,0.15)] dark:from-[rgba(139,92,246,0.2)] dark:to-[rgba(59,130,246,0.2)]"></div>

        {/* Profile Info Overlay */}
        <div className="bg-[var(--color-card-bg)] px-8 pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          {/* Avatar (with photo upload control in edit mode) */}
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

          {/* Edit / Save / Cancel actions */}
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

      {loading && !match && <div className="card text-[var(--color-text-muted)] text-sm">Loading attendance…</div>}

      {match && (
        <>
          <div className="mb-2 mt-4">
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-4">At a Glance</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Present</p>
                <p className="text-3xl font-bold text-[var(--color-green)]">{match.present}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{((match.present / Math.max(match.marked, 1)) * 100).toFixed(1)}% rate</p>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Late</p>
                <p className="text-3xl font-bold text-[var(--color-yellow)]">{match.late}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{((match.late / Math.max(match.marked, 1)) * 100).toFixed(1)}% rate</p>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Absent</p>
                <p className="text-3xl font-bold text-[var(--color-red)]">{match.absent}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{((match.absent / Math.max(match.marked, 1)) * 100).toFixed(1)}% rate</p>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total WFH</p>
                <p className="text-3xl font-bold text-[var(--color-blue)]">{match.wfh}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{((match.wfh / Math.max(match.marked, 1)) * 100).toFixed(1)}% rate</p>
              </div>
            </div>

            <Link href={`/dashboard/employees/${encodeURIComponent(match.id)}`} className="btn-primary py-2 px-4 text-sm self-start inline-block">
              View detailed calendar
            </Link>
          </div>
        </>
      )}

      {!loading && !match && activeSheetData && (
        <div className="card text-sm text-[var(--color-text-muted)]">
          We couldn't find your name in the active attendance sheet. Ask your admin to add you.
        </div>
      )}
    </div>
  );
}
