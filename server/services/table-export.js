import ExcelJS from 'exceljs';

export async function tableWorkbook({ title = 'Données Nidal', columns, rows }) {
  if (!Array.isArray(columns) || !columns.length || columns.length > 100 || !Array.isArray(rows) || rows.length > 10000) throw new Error('Colonnes ou lignes invalides (maximum 10 000 lignes et 100 colonnes).');
  if (columns.some(c => typeof c.key !== 'string' || typeof c.label !== 'string') || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('Structure du tableau invalide.');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Groupe Scolaire Nidal'; workbook.created = new Date();
  const sheet = workbook.addWorksheet('Données', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(c => ({ header: c.label, key: c.key, width: Math.min(45, Math.max(18, c.label.length + 3)) }));
  for (const row of rows) sheet.addRow(Object.fromEntries(columns.map(c => [c.key, typeof row[c.key] === 'number' && Number.isFinite(row[c.key]) ? row[c.key] : String(row[c.key] ?? '')])));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1746D1' } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  sheet.eachRow((row, number) => { row.alignment = { vertical: 'top', wrapText: true }; if (number > 1 && number % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } }; });
  workbook.title = String(title);
  return workbook.xlsx.writeBuffer();
}
