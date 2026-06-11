'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;

function NavLink({ href, children, exact, onNavigate }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} onClick={onNavigate} className={`nav-item ${active ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

export default function SidebarNav({ role, isTeamLeader, onNavigate }) {
  // LexDesk system admin: a locked-down console — only the System link.
  if (role === 'lexsysadmin') {
    return (
      <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
        <NavLink href="/dashboard/system" exact onNavigate={onNavigate}>System</NavLink>
      </nav>
    );
  }
  return (
    <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
      {role !== 'employee' && <NavLink href="/dashboard" exact onNavigate={onNavigate}>Dashboard</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/employees" onNavigate={onNavigate}>Employees</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/teams" onNavigate={onNavigate}>Teams</NavLink>}
      {role === 'employee' && <NavLink href="/dashboard/my-dashboard" onNavigate={onNavigate}>Dashboard</NavLink>}
      {role === 'employee' && <NavLink href="/dashboard/my-leave" onNavigate={onNavigate}>My Leave</NavLink>}
      {role === 'employee' && <NavLink href="/dashboard/my-assets" onNavigate={onNavigate}>Assets</NavLink>}
      {role === 'employee' && isTeamLeader && <NavLink href="/dashboard/team-approvals" onNavigate={onNavigate}>Team Approvals</NavLink>}
      {role === 'employee' && isTeamLeader && <NavLink href="/dashboard/team-attendance" onNavigate={onNavigate}>Team Attendance</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/attendance" onNavigate={onNavigate}>Attendance</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/calendar" onNavigate={onNavigate}>Calendar</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/analytics" onNavigate={onNavigate}>Analytics</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/leave-approvals" onNavigate={onNavigate}>Leave Approvals</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/asset-approvals" onNavigate={onNavigate}>Asset Approvals</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/holidays" onNavigate={onNavigate}>Holidays</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/attenddesk" onNavigate={onNavigate}>AttendDesk</NavLink>}
      {APP_DOWNLOAD_URL && (
        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" download onClick={onNavigate} className="nav-item mt-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Download App
        </a>
      )}
    </nav>
  );
}
