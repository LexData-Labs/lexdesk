const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS_LONG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function isMonthSheet(name) {
  const low = String(name || '').toLowerCase().trim();
  if (!low) return false;
  if (low.includes('fingerprint') || low === 'leave list') return false;
  return true;
}

export function normalizeStatus(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === '') return '';
  if (s.startsWith('P') && s.length <= 3) return 'P';
  if (s === 'L' || s.startsWith('LATE')) return 'L';
  if (s === 'A' || s === 'ABSENT') return 'A';
  if (s === 'WFH' || s.includes('HOME')) return 'WFH';
  if (s === 'CL' || s === 'SL' || s === 'LEAVE') return 'L';
  return s;
}

export function isDateHeader(header) {
  if (!header) return false;
  const s = String(header).toLowerCase().trim();
  if (/^\d{1,2}[-\/]\d{1,2}$/.test(s)) return true;
  if (/^\d{1,2}[-\/](\w{3,9})$/.test(s)) {
    const m = s.match(/^\d{1,2}[-\/](\w{3,9})$/);
    if (m && (MONTHS_SHORT.includes(m[1]) || MONTHS_LONG.includes(m[1]))) return true;
  }
  return false;
}

export function getDateColumns(headers) {
  return headers.filter(isDateHeader);
}

export function getEmployeeIdColumn(headers) {
  return headers[0];
}

export function getEmployeeNameColumn(headers) {
  return headers.find(h => /name/i.test(h)) || headers[1];
}

export function computeEmployeeStats(rows, headers) {
  const dateCols = getDateColumns(headers);
  const nameCol = getEmployeeNameColumn(headers);
  const idCol = getEmployeeIdColumn(headers);

  return rows
    .filter(r => String(r[nameCol] ?? '').trim())
    .map(r => {
      let p = 0, l = 0, a = 0, wfh = 0, marked = 0;
      dateCols.forEach(c => {
        const status = normalizeStatus(r[c]);
        if (status === 'P') { p++; marked++; }
        else if (status === 'L') { l++; marked++; }
        else if (status === 'A') { a++; marked++; }
        else if (status === 'WFH') { wfh++; marked++; }
      });
      const present = p + l + wfh;
      const rate = marked > 0 ? Math.round((present / marked) * 100) : 0;
      return {
        id: String(r[idCol] ?? '').trim(),
        name: String(r[nameCol] ?? '').trim(),
        present: p,
        late: l,
        absent: a,
        wfh,
        marked,
        rate,
      };
    });
}

export function computeOverallStats(rows, headers) {
  const stats = computeEmployeeStats(rows, headers);
  const total = stats.length;
  const present = stats.reduce((s, e) => s + e.present, 0);
  const late = stats.reduce((s, e) => s + e.late, 0);
  const absent = stats.reduce((s, e) => s + e.absent, 0);
  const wfh = stats.reduce((s, e) => s + e.wfh, 0);
  const marked = stats.reduce((s, e) => s + e.marked, 0);
  const rate = marked > 0 ? Math.round(((present + late + wfh) / marked) * 100) : 0;
  return { total, present, late, absent, wfh, marked, rate };
}

export function pickActiveSheet(sheetNames, preferred) {
  if (preferred && sheetNames.includes(preferred)) return preferred;
  const monthSheets = sheetNames.filter(isMonthSheet);
  return monthSheets[monthSheets.length - 1] || sheetNames[0] || null;
}

export function parseSheetMonth(sheetName, fallbackYear) {
  if (!sheetName) return null;
  const low = String(sheetName).toLowerCase();
  let monthIndex = -1;
  for (let i = 0; i < MONTHS_LONG.length; i++) {
    if (low.includes(MONTHS_LONG[i])) { monthIndex = i; break; }
    if (low.includes(MONTHS_SHORT[i])) { monthIndex = i; break; }
  }
  if (monthIndex < 0) return null;
  const yearMatch = low.match(/(20\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : (fallbackYear ?? new Date().getFullYear());
  return { monthIndex, year };
}

export function getDayFromHeader(header) {
  if (!header) return null;
  const m = String(header).match(/\d{1,2}/);
  if (!m) return null;
  const day = parseInt(m[0], 10);
  if (day < 1 || day > 31) return null;
  return day;
}

export function buildEmployeeCalendar(row, headers, sheetName) {
  const monthInfo = parseSheetMonth(sheetName) || { monthIndex: new Date().getMonth(), year: new Date().getFullYear() };
  const { monthIndex, year } = monthInfo;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const dayToStatus = {};
  headers.forEach(h => {
    const day = getDayFromHeader(h);
    if (day && day <= daysInMonth) {
      dayToStatus[day] = normalizeStatus(row?.[h]);
    }
  });

  const firstDay = new Date(year, monthIndex, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, monthIndex, d), status: dayToStatus[d] || '' });
  }
  return { monthIndex, year, daysInMonth, cells, dayToStatus };
}
