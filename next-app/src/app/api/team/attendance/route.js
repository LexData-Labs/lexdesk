import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getTeams, getEmployees, getAttendance } from '@/lib/backend';

export const dynamic = 'force-dynamic';

// GET: attendance events for members of the team(s) the caller LEADS, plus
// the member roster so the page needs no second call. Leadership is resolved
// server-side from the verified token (same pattern as /api/team/leave).
//
// Known limits, both shared with the rest of the app: the upstream fetch is an
// org-wide window capped at 1000 events (a very busy org could clip a heavy
// month), and membership is current-state (someone who left the team
// mid-month disappears along with their early-month events).
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const sp = new URL(request.url).searchParams;
  const from = sp.get('from') || undefined;
  const to = sp.get('to') || undefined;
  if (from && Number.isNaN(Date.parse(from))) {
    return NextResponse.json({ error: 'invalid_from' }, { status: 400 });
  }
  if (to && Number.isNaN(Date.parse(to))) {
    return NextResponse.json({ error: 'invalid_to' }, { status: 400 });
  }
  const limit = Math.min(Math.max(parseInt(sp.get('limit'), 10) || 1000, 1), 1000);

  try {
    const teamsData = await getTeams(user.orgId);
    const myTeams = (teamsData.teams || []).filter((t) => String(t.leaderUid) === String(user.id));
    if (myTeams.length === 0) {
      return NextResponse.json({ isLeader: false, events: [], members: [] });
    }
    const myTeamIds = new Set(myTeams.map((t) => t.id));
    const teamNameById = new Map(myTeams.map((t) => [t.id, t.name || '']));

    const empData = await getEmployees(user.orgId);
    const members = (empData.employees || [])
      .filter((e) => e.teamId && myTeamIds.has(e.teamId))
      .map((e) => ({
        id: String(e.id),
        name: e.name || '',
        email: e.email || '',
        teamId: e.teamId,
        teamName: teamNameById.get(e.teamId) || '',
      }));
    const memberUids = new Set(members.map((m) => m.id));

    const data = await getAttendance({ limit, from, to }, user.orgId);
    const events = (data.events || []).filter((e) => memberUids.has(String(e.user?.id)));
    return NextResponse.json({ isLeader: true, events, members });
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
