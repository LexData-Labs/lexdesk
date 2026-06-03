import fs from 'fs';
import * as xlsx from 'xlsx';
import path from 'path';
import os from 'os';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function excelSerialToDateStr(serial) {
  try {
    const parsed = xlsx.SSF.parse_date_code(serial);
    if (parsed && parsed.d && parsed.m) return `${parsed.d}-${MONTH_NAMES[parsed.m - 1]}`;
  } catch {}
  return String(serial);
}

function getFilePath() {
  const filePath = process.env.LOCAL_EXCEL_PATH;
  if (!filePath) throw new Error('LOCAL_EXCEL_PATH is not set in .env.local');
  return filePath;
}

function readWorkbook() {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) throw new Error(`File not found at ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  return xlsx.read(fileBuffer, { type: 'buffer' });
}

function safeWriteWorkbook(workbook, filePath) {
  const tmpPath = path.join(os.tmpdir(), `attendance_tmp_${Date.now()}.xlsx`);
  try {
    xlsx.writeFile(workbook, tmpPath);
    fs.copyFileSync(tmpPath, filePath);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

function sheetToObjects(worksheet) {
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, blankrows: false });
  if (!rawData || rawData.length === 0) return { headers: [], rows: [] };
  const headers = rawData[0].map(h => {
    const s = String(h ?? '').trim();
    const num = parseFloat(s);
    if (!isNaN(num) && Number.isInteger(num) && num > 40000 && num < 60000) return excelSerialToDateStr(num);
    return s;
  });
  const rows = rawData.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 1 };
    headers.forEach((h, ci) => { obj[h] = (row[ci] !== undefined && row[ci] !== null && row[ci] !== '') ? String(row[ci]) : ''; });
    return obj;
  });
  return { headers, rows };
}

export async function listSheets() {
  const workbook = readWorkbook();
  const filePath = getFilePath();
  return { title: path.basename(filePath), sheetNames: workbook.SheetNames };
}

export async function getSheetData(sheetName) {
  const workbook = readWorkbook();
  if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Sheet ${sheetName} not found in workbook`);
  return sheetToObjects(workbook.Sheets[sheetName]);
}

export async function getAllSheetsData() {
  const workbook = readWorkbook();
  const filePath = getFilePath();
  const out = {};
  workbook.SheetNames.forEach(sheetName => { out[sheetName] = sheetToObjects(workbook.Sheets[sheetName]); });
  return { fileName: path.basename(filePath), fetchedAt: new Date().toISOString(), sheets: out };
}

export async function addEmployee(sheetName, id, name) {
  const filePath = getFilePath();
  const workbook = readWorkbook();
  if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Sheet ${sheetName} not found`);
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, blankrows: false });
  rawData.push([id, name]);
  workbook.Sheets[sheetName] = xlsx.utils.aoa_to_sheet(rawData);
  safeWriteWorkbook(workbook, filePath);
}

export async function deleteEmployee(sheetName, id) {
  const filePath = getFilePath();
  const workbook = readWorkbook();
  if (!workbook.SheetNames.includes(sheetName)) throw new Error(`Sheet ${sheetName} not found`);
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, blankrows: false });
  const filtered = rawData.filter((row, i) => i === 0 || String(row[0] ?? '').trim() !== String(id).trim());
  workbook.Sheets[sheetName] = xlsx.utils.aoa_to_sheet(filtered);
  safeWriteWorkbook(workbook, filePath);
}