import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getEmployee, getEmployees, getTeams, getLineManager } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const isAdminRole = (r) => ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(String(r || '').toUpperCase());

// Leave-form metadata for the signed-in employee, resolved through the org
// hierarchy (employee → team leader → super admin):
//   - department:  the employee's department (or their team name).
//   - lineManager: an employee reports to their TEAM LEADER; a team leader
//                  reports to the SUPER ADMIN / org admin.
//   - approvers:   the names that may approve this person's leave — their line
//                  manager plus the super admin(s) — for the "Approved by" picker.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  try {
    const [{ employee: me }, { employees }, { teams }] = await Promise.all([
      getEmployee(String(user.id), user.orgId),
      getEmployees(user.orgId),
      getTeams(user.orgId),
    ]);

    const adminNames = (employees || [])
      .filter((e) => isAdminRole(e.role))
      .map((e) => e.name || e.email)
      .filter(Boolean);

    const isLeader = (teams || []).some((t) => String(t.leaderUid) === String(user.id));
    const department = me.department || me.teamName || null;

    let lineManager;
    let approvers;
    if (isLeader) {
      // A team leader's manager is the super admin / org admin.
      lineManager = adminNames[0] || null;
      approvers = [...adminNames];
    } else {
      // An employee's manager is their team leader; either the leader or an
      // admin can approve.
      lineManager = await getLineManager(user.orgId, me.teamId);
      approvers = [lineManager, ...adminNames].filter(Boolean);
    }
    approvers = [...new Set(approvers)]; // dedupe (leader may also be an admin)

    return NextResponse.json({ department, lineManager, approvers });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
