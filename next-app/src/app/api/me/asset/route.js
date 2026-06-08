import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAssetRequests, createAssetRequest, getEmployee, getTeams } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// An employee's OWN asset requests. uid always from the verified token.
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });
  try {
    const data = await getAssetRequests();
    const mine = (data.requests || []).filter((r) => String(r.uid) === String(user.id));
    return NextResponse.json({ requests: mine });
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.id) return NextResponse.json({ error: 'no_linked_attenddesk_user' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const assetName = (body?.assetName || '').trim();
  const assetType = (body?.assetType || '').trim();
  const description = (body?.description || '').trim();
  const fromDay = body?.fromDay;
  const toDay = body?.toDay;
  if (!assetName || !fromDay || !toDay) {
    return NextResponse.json({ error: 'assetName, fromDay and toDay are required' }, { status: 400 });
  }
  if (fromDay > toDay) {
    return NextResponse.json({ error: '“From” date must be on or before “To” date' }, { status: 400 });
  }

  // Does this employee have a team lead (other than themselves)? Then the lead
  // must also approve. Resolved here so the dual-approval gate is self-contained.
  let requiresLead = false;
  try {
    const emp = await getEmployee(String(user.id));
    const teamId = emp?.employee?.teamId || null;
    if (teamId) {
      const teamsData = await getTeams();
      const team = (teamsData.teams || []).find((t) => String(t.id) === String(teamId));
      if (team && team.leaderUid && String(team.leaderUid) !== String(user.id)) requiresLead = true;
    }
  } catch {
    // If team resolution fails, fall back to admin-only approval.
  }

  try {
    const result = await createAssetRequest({
      userId: String(user.id),
      assetName,
      assetType,
      description,
      fromDay,
      toDay,
      requiresLead,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}
