// Pure helpers that derive admin views from AttendDesk check-in/out events.
// Event shape: { id, user:{id,email,name}, type:'CHECK_IN'|'CHECK_OUT', timestamp,
//   isLate, isEarly, allChecksPassed, clientMode, scheduledStart, scheduledEnd }
// "Status" here is on-time / late / none — there is no inferred "absent".

export function dayKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dayKey(new Date());
}

// Office timezone used for late/early classification — matches AttendDesk's bdHhmm().
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

// AttendDesk's rule, reimplemented here: a CHECK_IN is late when its time-of-day
// (in the office timezone) is STRICTLY AFTER the event's scheduled start — no
// grace period. Falls back to the server-stamped isLate flag when the event has
// no scheduledStart snapshot.
export function isLateCheckIn(event) {
  if (!event || event.type !== 'CHECK_IN') return false;
  if (event.scheduledStart && event.timestamp) {
    return hhmmInOfficeTz(event.timestamp) > event.scheduledStart;
  }
  return !!event.isLate;
}

// uid -> { checkIns, late, lastCheckIn(ms|null), lastEvent(ms|null) }
export function perEmployeeStats(events) {
  const out = {};
  for (const e of events || []) {
    const uid = e.user?.id;
    if (!uid) continue;
    const s = (out[uid] ||= { checkIns: 0, late: 0, lastCheckIn: null, lastEvent: null });
    const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
    if (ts && (!s.lastEvent || ts > s.lastEvent)) s.lastEvent = ts;
    if (e.type === 'CHECK_IN') {
      s.checkIns += 1;
      if (isLateCheckIn(e)) s.late += 1;
      if (ts && (!s.lastCheckIn || ts > s.lastCheckIn)) s.lastCheckIn = ts;
    }
  }
  return out;
}

// Distinct employees who checked in today, and how many were late.
export function todaySummary(events) {
  const tk = todayKey();
  const inToday = new Set();
  const lateToday = new Set();
  for (const e of events || []) {
    if (e.type !== 'CHECK_IN' || dayKey(e.timestamp) !== tk) continue;
    const uid = e.user?.id;
    if (!uid) continue;
    inToday.add(uid);
    if (isLateCheckIn(e)) lateToday.add(uid);
  }
  return { checkedIn: inToday.size, late: lateToday.size };
}

export function eventsForUser(events, uid) {
  return (events || []).filter((e) => e.user?.id === uid);
}

// Distinct employees on approved leave covering today.
export function onLeaveTodayCount(leave) {
  const tk = todayKey();
  const uids = new Set();
  for (const r of leave || []) {
    if (r.status === 'approved' && r.fromDay <= tk && tk <= r.toDay) uids.add(r.uid);
  }
  return uids.size;
}

// Build a month grid for one employee from their CHECK_IN events (first of the day wins).
// month is 0-11. Returns { year, month, daysInMonth, firstWeekday, days: { [day]: { status, ts } } }.
export function employeeMonthGrid(events, uid, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const days = {};
  for (const e of eventsForUser(events, uid)) {
    if (e.type !== 'CHECK_IN' || !e.timestamp) continue;
    const d = new Date(e.timestamp);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!days[day] || d.getTime() < days[day].ts) {
      days[day] = { status: isLateCheckIn(e) ? 'late' : 'present', ts: d.getTime() };
    }
  }
  return { year, month, daysInMonth, firstWeekday, days };
}

export function fmtTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

// Org users with the EMPLOYEE role only (excludes admins / super admins) —
// the staff roster shown in directory/calendar/count views.
export const onlyEmployees = (employees) =>
  (employees || []).filter((e) => String(e.role || '').toUpperCase() === 'EMPLOYEE');
