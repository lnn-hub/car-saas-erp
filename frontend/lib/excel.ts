import * as XLSX from 'xlsx';

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Тайлан') {
  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths auto-fit
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
