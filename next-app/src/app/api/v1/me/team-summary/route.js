import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { listLedTeamMemberUids } from '@/lib/services/teams';
import { listAttendance } from '@/lib/services/attendance';

export const dynamic = 'force-dynamic';

// YYYY-MM-DD in Asia/Dhaka (no DST, fixed offset).
function dhakaDay(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
function dhakaHhmm(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function memberSummary(events, last7, today) {
  // canon per day: earliest passing CHECK_IN, latest passing CHECK_OUT
  const byDay = {};
  for (const e of events) {
    if (!e.allChecksPassed || !e.timestamp) continue;
    const day = dhakaDay(e.timestamp);
    const slot = (byDay[day] ||= { in: null, out: null, late: false });
    if (e.type === 'CHECK_IN') {
      if (!slot.in || e.timestamp < slot.in.timestamp) { slot.in = e; slot.late = !!e.isLate; }
    } else if (e.type === 'CHECK_OUT') {
      if (!slot.out || e.timestamp > slot.out.timestamp) slot.out = e;
    }
  }
  let onTime = 0, late = 0, absent = 0;
  for (const day of last7) {
    const slot = byDay[day];
    if (!slot || !slot.in) absent++;
    else if (slot.late) late++;
    else onTime++;
  }
  const todaySlot = byDay[today];
  return {
    onTime,
    late,
    absent,
    todayIn: todaySlot?.in ? dhakaHhmm(todaySlot.in.timestamp) : null,
    todayOut: todaySlot?.out ? dhakaHhmm(todaySlot.out.timestamp) : null,
  };
}

// GET /api/v1/me/team-summary — for a team leader, each member's last-7-day
// attendance summary + today's in/out. Non-leaders get { isLeader:false }.
export async function GET(request) {
  let user;
  try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
  try {
    const { isLeader, members } = await listLedTeamMemberUids(user.orgId, user.uid);
    if (!isLeader) return NextResponse.json({ isLeader: false, members: [] });

    const { events } = await listAttendance(user.orgId, { limit: 1000 });
    const today = dhakaDay(new Date().toISOString());
    const last7 = [];
    const nowMs = Date.now();
    for (let i = 0; i < 7; i++) last7.push(dhakaDay(new Date(nowMs - i * 86_400_000).toISOString()));

    const byUid = {};
    for (const e of events) {
      const id = String(e.user?.id ?? '');
      (byUid[id] ||= []).push(e);
    }
    const summary = members.map((m) => ({
      uid: m.id,
      name: m.name || m.email || '',
      email: m.email || '',
      ...memberSummary(byUid[String(m.id)] || [], last7, today),
    }));
    return NextResponse.json({ isLeader: true, members: summary });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
}
