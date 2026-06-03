const fs = require('fs');
const xlsx = require('xlsx');

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function excelSerialToDateStr(serial) {
  try {
    const parsed = xlsx.SSF.parse_date_code(serial);
    if (parsed && parsed.d && parsed.m) return `${parsed.d}-${MONTH_NAMES[parsed.m - 1]}`;
  } catch {}
  return String(serial);
}

const filePath = 'C:\\Users\\HP\\OneDrive - lexdatalabs\\mk\\Test attendence system.xlsx';
const fileBuffer = fs.readFileSync(filePath);
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

['January', 'February', 'March'].forEach(name => {
  if (!workbook.SheetNames.includes(name)) return;
  const ws = workbook.Sheets[name];
  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, blankrows: false });
  const headers = rawData[0].map(h => {
    const s = String(h ?? '').trim();
    const num = parseFloat(s);
    if (!isNaN(num) && Number.isInteger(num) && num > 40000 && num < 60000) return excelSerialToDateStr(num);
    return s;
  });
  console.log(`\n${name} converted headers:`, headers.join(', '));
});
