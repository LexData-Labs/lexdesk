'use client';

import MyDashboardView from '@/components/MyDashboardView';

// Superadmin / admin landing dashboard. Mirrors the employee / team-leader
// dashboard exactly — the "At a Glance / Today's Attendance / Punctuality /
// Attendance Overview" layout (MyDashboardView). Same component, so the two
// stay in sync; the admin vs. superadmin split can come later.
export default function DashboardPage() {
  return <MyDashboardView />;
}
