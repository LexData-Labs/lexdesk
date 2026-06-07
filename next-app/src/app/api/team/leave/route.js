import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getTeams, getEmployees, getLeaveRequests } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// GET: leave requests for members of the team(s) the caller LEADS. The caller is
// an employee; leadership is resolved + enforced here (the API key is org-wide).
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const sp = new URL(request.url).searchParams;
  const status = sp.get('status') || undefined;

  try {
    const teamsData = await getTeams();
    const myTeamIds = new Set(
      (teamsData.teams || [])
        .filter((t) => String(t.leaderUid) === String(user.id))
        .map((t) => t.id),
    );
    if (myTeamIds.size === 0) {
      return NextResponse.json({ isLeader: false, requests: [] });
    }
    const empData = await getEmployees();
    const memberUids = new Set(
      (empData.employees || [])
        .filter((e) => e.teamId && myTeamIds.has(e.teamId))
        .map((e) => String(e.id)),
    );
    const leaveData = await getLeaveRequests(status ? { status } : {});
    const requests = (leaveData.requests || []).filter((r) => memberUids.has(String(r.uid)));
    return NextResponse.json({ isLeader: true, requests });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
