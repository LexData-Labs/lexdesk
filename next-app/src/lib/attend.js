// Pure helpers that derive admin views from AttendDesk check-in/out events.
//
// "Late" follows the AttendDesk Android app's CANONICAL model
// (android/.../ui/dashboard/DashboardTab.kt): events are grouped by Asia/Dhaka
// date, only `allChecksPassed` events count, each day collapses to its FIRST
// check-in, and a day is "late" iff that first check-in is late. So counts are
// day-based (late days / present days), not per check-in event.

const OFFICE_TZ = 'Asia/Dhaka';

// "HH:mm" (24h) time-of-day of a timestamp in the office timezone.
export function hhmmInOfficeTz(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: OFFICE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

// AttendDesk's rule: a CHECK_IN is late when its time-of-day (office timezone)
// is STRICTLY AFTER the event's scheduled start — no grace. Falls back to the
// server-stamped isLate flag when there's no scheduledStart snapshot.
export function isLateCheckIn(event) {
  if (!event || event.type !== 'CHECK_IN') return false;
  if (event.scheduledStart && event.timestamp) {
    return hhmmInOfficeTz(event.timestamp) > event.scheduledStart;
  }
  return !!event.isLate;
}

// Calendar date (YYYY-MM-DD) of a timestamp in the office timezone — the unit
// the Android app groups attendance by.
export function bdDateKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// True if the timestamp falls in the given office-tz month (month is 0-11).
export function inBdMonth(ts, year, month) {
  const k = bdDateKey(ts);
  if (!k) return false;
  const [y, m] = k.split('-').map(Number);
  return y === year && m === month + 1;
}

export function eventsForUser(events, uid) {
  return (events || []).filter((e) => e.user?.id === uid);
}

// Canonical per-day collapse for ONE user's events (Android buildCanon):
// skip allChecksPassed === false; per office-tz day keep the EARLIEST CHECK_IN
// and the LATEST CHECK_OUT. Returns { [YYYY-MM-DD]: { firstCheckIn, lastCheckOut } }.
export function canonicalDays(events) {
  const byDay = {};
  for (const e of events || []) {
    if (e.allChecksPassed === false || !e.timestamp) continue;
    const day = bdDateKey(e.timestamp);
    if (!day) continue;
    const ts = new Date(e.timestamp).getTime();
    const slot = (byDay[day] ||= { firstCheckIn: null, lastCheckOut: null });
    if (e.type === 'CHECK_IN') {
      if (!slot.firstCheckIn || ts < slot.firstCheckIn.ts) {
        slot.firstCheckIn = { ts, isLate: isLateCheckIn(e) };
      }
    } else if (e.type === 'CHECK_OUT') {
      if (!slot.lastCheckOut || ts > slot.lastCheckOut.ts) {
        slot.lastCheckOut = { ts, isEarly: !!e.isEarly };
      }
    }
  }
  return byDay;
}

// Day-based stats for one user (Android computeStats).
export function canonicalStats(events) {
  const days = canonicalDays(events);
  let presentDays = 0;
  let lateDays = 0;
  let lastCheckIn = 0;
  for (const k of Object.keys(days)) {
    const ci = days[k].firstCheckIn;
    if (!ci) continue;
    presentDays += 1;
    if (ci.isLate) lateDays += 1;
    if (ci.ts > lastCheckIn) lastCheckIn = ci.ts;
  }
  return { presentDays, lateDays, onTimeDays: presentDays - lateDays, lastCheckIn };
}

// uid -> canonicalStats, across an org-wide event list.
export function perEmployeeStats(events) {
  const byUser = {};
  for (const e of events || []) {
    const uid = e.user?.id;
    if (!uid) continue;
    (byUser[uid] ||= []).push(e);
  }
  const out = {};
  for (const uid of Object.keys(byUser)) out[uid] = canonicalStats(byUser[uid]);
  return out;
}

// Today (office-tz date), canonical: distinct employees whose FIRST passed
// check-in today exists / is late.
export function todaySummary(events) {
  const today = bdDateKey(new Date());
  const first = {};
  for (const e of events || []) {
    if (e.type !== 'CHECK_IN' || e.allChecksPassed === false || !e.timestamp) continue;
    if (bdDateKey(e.timestamp) !== today) continue;
    const uid = e.user?.id;
    if (!uid) continue;
    const ts = new Date(e.timestamp).getTime();
    if (!first[uid] || ts < first[uid].ts) first[uid] = { ts, isLate: isLateCheckIn(e) };
  }
  const uids = Object.keys(first);
  return { checkedIn: uids.length, late: uids.filter((u) => first[u].isLate).length };
}

// Distinct employees on approved leave covering today (office-tz date).
export function onLeaveTodayCount(leave) {
  const tk = bdDateKey(new Date());
  const uids = new Set();
  for (const r of leave || []) {
    if (r.status === 'approved' && r.fromDay <= tk && tk <= r.toDay) uids.add(r.uid);
  }
  return uids.size;
}

// Month grid for one employee, from canonical days (office-tz date, first
// check-in, allChecksPassed). month is 0-11.
export function employeeMonthGrid(events, uid, year, month) {
  const days = canonicalDays(eventsForUser(events, uid));
  const out = {};
  for (const k of Object.keys(days)) {
    const [y, m, d] = k.split('-').map(Number);
    if (y !== year || m !== month + 1) continue;
    const ci = days[k].firstCheckIn;
    if (ci) out[d] = { status: ci.isLate ? 'late' : 'present', ts: ci.ts };
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  return { year, month, daysInMonth, firstWeekday, days: out };
}

export function fmtTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

// Org users with the EMPLOYEE role only (excludes admins / super admins).
export const onlyEmployees = (employees) =>
  (employees || []).filter((e) => String(e.role || '').toUpperCase() === 'EMPLOYEE');
