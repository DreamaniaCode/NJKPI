/**
 * Service d'export côté serveur — PDF, Excel, CSV, Markdown.
 * Aucune dépendance externe : PDF généré via syntaxe brute, Excel via HTML table.
 */

/**
 * Remplace les caractères accentués par leurs équivalents ASCII pour le PDF
 * (WinAnsiEncoding ne gère pas l'UTF-8 directement dans les streams simples).
 */
function asciiSafe(str) {
  if (!str) return '';
  return String(str)
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÀÂÄÃ]/g, 'A').replace(/[ÉÈÊË]/g, 'E').replace(/[ÏÎ]/g, 'I')
    .replace(/[ÔÖ]/g, 'O').replace(/[ÙÛÜ]/g, 'U').replace(/[Ç]/g, 'C')
    .replace(/[—–]/g, '-').replace(/[«»""]/g, '"').replace(/['']/g, "'")
    .replace(/[^\x20-\x7E]/g, '?');
}

function dateStamp() {
  return new Date().toISOString().split('T')[0];
}

function extractField(content, field) {
  const data = content?.data || content;
  return data?.[field] ?? '';
}

function buildRows(data) {
  const contents = data.contents || [];
  return contents.map(c => {
    const d = c.data || c;
    return {
      date: d.datePublication || '',
      titre: d.titre || 'Sans titre',
      format: d.format || 'post',
      statut: d.statut || 'brouillon',
      plateforme: d.plateforme || '',
      portee: d.resultats?.portee ?? '',
      interactions: (d.resultats?.likes || 0) + (d.resultats?.comments || 0) + (d.resultats?.shares || 0),
      vues: d.resultats?.vues ?? '',
      engagement: d.resultats?.engagement ?? ''
    };
  });
}

/* ── Excel (.xls via HTML table) ──────────────────────────────────── */
export function generateExcelExport(data, brand) {
  const rows = buildRows(data);
  const kpi = data.kpiTargets || {};
  const dt = dateStamp();
  const brandLabel = brand === 'nidal' ? 'GS Nidal' : 'Nidal Junior';

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Resume KPI</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Contenus</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;

  // Sheet 1: KPI
  html += `<table><tr><td colspan="3" style="font-size:16pt;font-weight:bold;">Rapport KPI - ${brandLabel}</td></tr>
<tr><td colspan="3">Genere le ${dt}</td></tr><tr></tr>
<tr style="font-weight:bold;background:#1746d1;color:white;"><td>Indicateur</td><td>Actuel</td><td>Objectif</td></tr>`;
  if (kpi && typeof kpi === 'object') {
    for (const [key, val] of Object.entries(kpi)) {
      if (typeof val === 'object' && val !== null && 'target' in val) {
        html += `<tr><td>${key}</td><td>${val.current ?? ''}</td><td>${val.target ?? ''}</td></tr>`;
      }
    }
  }
  html += `</table>`;

  // Sheet 2: Contents
  html += `<table><tr style="font-weight:bold;background:#1746d1;color:white;">
<td>Date</td><td>Titre</td><td>Format</td><td>Statut</td><td>Plateforme</td><td>Portee</td><td>Interactions</td><td>Vues</td></tr>`;
  for (const r of rows) {
    html += `<tr><td>${r.date}</td><td>${r.titre}</td><td>${r.format}</td><td>${r.statut}</td><td>${r.plateforme}</td><td>${r.portee}</td><td>${r.interactions}</td><td>${r.vues}</td></tr>`;
  }
  html += `</table></body></html>`;

  return {
    buffer: Buffer.from('\uFEFF' + html, 'utf-8'),
    filename: `nidal-rapport-${dt}.xls`,
    contentType: 'application/vnd.ms-excel'
  };
}

/* ── PDF (syntaxe PDF 1.4 brute) ──────────────────────────────────── */
export function generatePdfExport(data, brand) {
  const rows = buildRows(data);
  const dt = dateStamp();
  const brandLabel = asciiSafe(brand === 'nidal' ? 'GS Nidal' : 'Nidal Junior');
  const total = rows.length;
  const published = rows.filter(r => r.statut === 'publie').length;
  const totalReach = rows.reduce((s, r) => s + (Number(r.portee) || 0), 0);
  const totalInter = rows.reduce((s, r) => s + (Number(r.interactions) || 0), 0);

  // Build PDF text lines
  const lines = [];
  lines.push(`Rapport KPI - ${brandLabel}`);
  lines.push(`Genere le ${dt}`);
  lines.push('');
  lines.push(`Total contenus : ${total}`);
  lines.push(`Publies : ${published}`);
  lines.push(`Portee totale : ${totalReach}`);
  lines.push(`Interactions totales : ${totalInter}`);
  lines.push('');
  lines.push('--- Contenus ---');
  lines.push('');
  for (const r of rows.slice(0, 50)) {
    lines.push(`${r.date || '--'}  |  ${asciiSafe(r.titre).substring(0, 40)}  |  ${r.format}  |  ${r.statut}  |  ${r.portee || '--'}`);
  }
  if (rows.length > 50) lines.push(`... et ${rows.length - 50} autres contenus`);

  // Build minimal PDF 1.4
  const textBlock = lines.map((l, i) => `BT /F1 ${i === 0 ? 16 : 10} Tf ${50} ${750 - i * 14} Td (${l.replace(/[()\\]/g, '\\$&')}) Tj ET`).join('\n');
  const stream = `q\n${textBlock}\nQ`;
  const streamLen = Buffer.byteLength(stream, 'ascii');

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLen} >> stream
${stream}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
${String(283 + streamLen).padStart(10, '0')} 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${String(283 + streamLen + 66)}
%%EOF`;

  return {
    buffer: Buffer.from(pdf, 'ascii'),
    filename: `nidal-rapport-${dt}.pdf`,
    contentType: 'application/pdf'
  };
}

/* ── Markdown ─────────────────────────────────────────────────────── */
export function generateMarkdownExport(data, brand) {
  const rows = buildRows(data);
  const dt = dateStamp();
  const brandLabel = brand === 'nidal' ? 'GS Nidal' : 'Nidal Junior';
  const kpi = data.kpiTargets || {};

  let md = `# Rapport KPI — ${brandLabel}\n\n> Généré le ${dt}\n\n`;
  md += `## 📊 KPI\n\n| Indicateur | Actuel | Objectif |\n|---|---:|---:|\n`;
  if (kpi && typeof kpi === 'object') {
    for (const [key, val] of Object.entries(kpi)) {
      if (typeof val === 'object' && val !== null && 'target' in val) {
        md += `| ${key} | ${val.current ?? '—'} | ${val.target ?? '—'} |\n`;
      }
    }
  }
  md += `\n## 📋 Contenus (${rows.length})\n\n| Date | Titre | Format | Statut | Portée | Interactions |\n|---|---|---|---|---:|---:|\n`;
  for (const r of rows) {
    md += `| ${r.date || '—'} | ${r.titre} | ${r.format} | ${r.statut} | ${r.portee || '—'} | ${r.interactions || '—'} |\n`;
  }

  return {
    text: md,
    filename: `nidal-rapport-${dt}.md`,
    contentType: 'text/markdown; charset=utf-8'
  };
}

/* ── CSV (UTF-8 BOM, séparateur ;) ────────────────────────────────── */
export function generateCsvExport(data, brand) {
  const rows = buildRows(data);
  const dt = dateStamp();
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Date', 'Titre', 'Format', 'Statut', 'Plateforme', 'Portée', 'Interactions', 'Vues'];
  const csv = '\uFEFF' + [headers, ...rows.map(r => [r.date, r.titre, r.format, r.statut, r.plateforme, r.portee, r.interactions, r.vues])].map(row => row.map(esc).join(';')).join('\r\n');

  return {
    text: csv,
    filename: `nidal-rapport-${dt}.csv`,
    contentType: 'text/csv; charset=utf-8'
  };
}
