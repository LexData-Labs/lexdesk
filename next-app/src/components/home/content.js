// Shared marketing content for the homepage — used by both the 3D hub HUD and
// the no-WebGL fallback so copy stays in one place.
import { SyncIcon, ChartIcon, ShieldIcon, UsersIcon } from '@/components/authDecor';

export const FEATURES = [
  {
    icon: <ShieldIcon />,
    title: 'Verified Attendance',
    body: 'Multi-factor check-in — WiFi, GPS geofence, rotating QR, and face verification — to stop buddy-punching.',
  },
  {
    icon: <UsersIcon />,
    title: 'Leave & Teams',
    body: 'Submit and approve leave, assets, and remote requests with org and team-lead approval workflows.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Role-based Access',
    body: 'Super admin, admin, team lead, and employee — every screen and action scoped to the right role.',
  },
  {
    icon: <ChartIcon />,
    title: 'Advanced Analytics',
    body: 'Late/early trends, monthly summaries, per-employee calendars, and exportable attendance data.',
  },
  {
    icon: <SyncIcon />,
    title: 'Real-time Sync',
    body: 'Web dashboard, Android app, and kiosk share one backend so attendance stays consistent everywhere.',
  },
  {
    icon: <UsersIcon />,
    title: 'Holidays & Notices',
    body: 'Org-wide holiday calendar, policy controls, and a notice board to keep everyone aligned.',
  },
];

export const STEPS = [
  { n: '01', title: 'Set up your org', body: 'Add offices, policy, holidays, and invite your team.' },
  { n: '02', title: 'Employees check in', body: 'Staff check in from the app with verified attendance.' },
  { n: '03', title: 'Manage & report', body: 'Approve requests and track attendance from the dashboard.' },
];

export const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL;
