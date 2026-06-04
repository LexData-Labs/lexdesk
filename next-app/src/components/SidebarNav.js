'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavLink({ href, children, exact }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={`nav-item ${active ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

export default function SidebarNav({ role }) {
  return (
    <nav className="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
      {role !== 'employee' && <NavLink href="/dashboard" exact>Dashboard</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/employees">Employees</NavLink>}
      <NavLink href="/dashboard/my-attendance">My Attendance</NavLink>
      {role === 'employee' && <NavLink href="/dashboard/my-leave">My Leave</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/attendance">Attendance</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/calendar">Calendar</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/analytics">Analytics</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/leave-approvals">Leave Approvals</NavLink>}
      {role !== 'employee' && <NavLink href="/dashboard/attenddesk">AttendDesk</NavLink>}
      <NavLink href="/dashboard/settings">Settings</NavLink>
    </nav>
  );
}
