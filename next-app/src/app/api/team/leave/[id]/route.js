import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getTeams, getEmployees, getLeaveRequests, decideLeave } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// POST: a team leader decides a leave request for one of THEIR team members.
// Authorization is enforced here: the caller must lead the team of the employee
// who owns the request.
export async function POST(request, ctx) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  const { id } = await ctx.params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const decision = body?.decision;
  const note = body?.note || '';
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });
  }

  try {
    const leaveData = await getLeaveRequests();
    const req = (leaveData.requests || []).find((r) => String(r.id) === String(id));
    if (!req) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const empData = await getEmployees();
    const emp = (empData.employees || []).find((e) => String(e.id) === String(req.uid));
    const teamId = emp?.teamId || null;

    const teamsData = await getTeams();
    const team = (teamsData.teams || []).find((t) => String(t.id) === String(teamId));
    if (!team || String(team.leaderUid) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden — not this employee’s team leader' }, { status: 403 });
    }

    const result = await decideLeave(id, decision, note);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
