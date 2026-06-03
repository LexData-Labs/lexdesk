const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

// Undo the test - remove the last row we added
const filePath = 'C:\\Users\\HP\\OneDrive - lexdatalabs\\mk\\Test attendence system.xlsx';
const fileBuffer = fs.readFileSync(filePath);
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheetName = 'January';
const worksheet = workbook.Sheets[sheetName];
const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, blankrows: false });

// Remove the test row (last row with id=99)
const cleaned = rawData.filter(row => String(row[0]).trim() !== '99');
console.log('Rows after cleanup:', cleaned.length);

const newWs = xlsx.utils.aoa_to_sheet(cleaned);
workbook.Sheets[sheetName] = newWs;
xlsx.writeFile(workbook, filePath);
console.log('✅ Test row removed');
