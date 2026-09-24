/** Export multi-format : CSV, Excel, PDF, Markdown et JSON — sans dépendance externe. */
const NidalExport = (() => {
  const HEADERS = ['Date', 'Heure', 'Titre', 'Niveau', 'Classes', 'Album / univers', 'Plateforme', 'Format', 'Pilier', 'Objectif', 'Statut', 'Validation', 'Portée cible', 'Portée réelle', 'Interactions', 'Engagement', 'Clics', 'Vues', 'Contrôle', 'Notes'];

  function _row(content) {
    return [content.datePublication, content.heure, content.titre, getLevel(content.niveau).label, content.classes, content.album, content.plateforme, getContentType(content.format).label, content.pilier, content.objectif, getStatus(content.statut).label, getValidation(content.validation).label, content.objectifs?.portee, content.resultats?.portee, NidalStore.getInteractions(content), NidalStore.getEngagement(content), content.resultats?.clics, content.resultats?.vues, getControlMeta(NidalStore.getControl(content)).label, content.notes];
  }

  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 100);
  }

  function _timestamp() {
    return new Date().toISOString().split('T')[0];
  }

  /* ── CSV UTF-8 BOM (séparateur ;) ──────────────────────────────── */
  function exportCSV(contents, filename) {
    if (!contents?.length) return showToast('Aucun contenu à exporter', 'error');
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [HEADERS, ...contents.map(_row)].map(row => row.map(escape).join(';')).join('\r\n');
    _download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename || 'nidal-contenus'}-${_timestamp()}.csv`);
    showToast(`${contents.length} contenus exportés en CSV`, 'success');
  }

  /* ── Excel (HTML table format .xls) ────────────────────────────── */
  function exportExcel(contents, filename) {
    if (!contents?.length) return showToast('Aucun contenu à exporter', 'error');
    const brand = getActiveBrandLabel();
    const stats = NidalStore.getStats();
    const kpi = NidalStore.getKpiTargets();

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Résumé KPI</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Contenus</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;

    // Feuille 1 : Résumé KPI
    html += `<table><tr><td colspan="4" style="font-size:16pt;font-weight:bold;">Rapport KPI — ${escapeHtml(brand)}</td></tr>
<tr><td colspan="4">Généré le ${_timestamp()}</td></tr><tr></tr>
<tr style="font-weight:bold;background:#1746d1;color:white;"><td>Indicateur</td><td>Actuel</td><td>Objectif</td><td>Progression</td></tr>`;
    for (const [key, metric] of Object.entries(kpi)) {
      if (key === 'brand' || key === 'contentTotals') continue;
      const label = metric.label || key;
      html += `<tr><td>${escapeHtml(label)}</td><td>${metric.current ?? '—'}</td><td>${metric.target ?? '—'}</td><td>${metric.pct ?? 0}%</td></tr>`;
    }
    html += `<tr></tr><tr style="font-weight:bold;"><td>Statistiques</td><td></td><td></td><td></td></tr>
<tr><td>Total contenus</td><td>${stats.total}</td><td></td><td></td></tr>
<tr><td>Publiés</td><td>${stats.published}</td><td></td><td></td></tr>
<tr><td>Portée totale</td><td>${formatNumber(stats.totalReach)}</td><td></td><td></td></tr>
<tr><td>Interactions totales</td><td>${formatNumber(stats.totalInteractions)}</td><td></td><td></td></tr>
<tr><td>Engagement</td><td>${formatPercent(stats.engagement)}</td><td></td><td></td></tr>
</table>`;

    // Feuille 2 : Contenus
    html += `<table><tr style="font-weight:bold;background:#1746d1;color:white;">${HEADERS.map(h => `<td>${h}</td>`).join('')}</tr>`;
    contents.forEach(c => {
      const row = _row(c);
      html += `<tr>${row.map(v => `<td>${v !== null && v !== undefined ? escapeHtml(String(v)) : ''}</td>`).join('')}</tr>`;
    });
    html += '</table></body></html>';

    _download(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${filename || 'nidal-contenus'}-${_timestamp()}.xls`);
    showToast(`${contents.length} contenus exportés en Excel`, 'success');
  }

  /* ── PDF (via serveur ou impression navigateur) ─────────────────── */
  async function exportPDF(contents, filename) {
    if (!contents?.length) return showToast('Aucun contenu à exporter', 'error');
    const brand = getActiveBrand();

    // Essayer le serveur d'abord
    if (NidalAPI.isOnline()) {
      try {
        const config = NidalAPI.getConfig();
        const headers = { 'Content-Type': 'application/json' };
        if (config.accessToken) headers.Authorization = `Bearer ${config.accessToken}`;
        const response = await fetch(`${config.baseUrl}/api/export/pdf?brand=${encodeURIComponent(brand)}`, { headers });
        if (response.ok) {
          const blob = await response.blob();
          _download(blob, `${filename || 'nidal-rapport'}-${_timestamp()}.pdf`);
          showToast('Rapport PDF téléchargé', 'success');
          return;
        }
      } catch (e) { console.warn('Export PDF serveur indisponible:', e); }
    }

    // Fallback : impression navigateur
    showToast('Export PDF via le serveur indisponible. Utilisez Ctrl+P pour imprimer en PDF.', 'info');
    window.print();
  }

  /* ── Markdown ──────────────────────────────────────────────────── */
  function exportMarkdown(contents, filename) {
    if (!contents?.length) return showToast('Aucun contenu à exporter', 'error');
    const brand = getActiveBrandLabel();
    const stats = NidalStore.getStats();
    const kpi = NidalStore.getKpiTargets();

    let md = `# Rapport KPI — ${brand}\n\n> Généré le ${_timestamp()}\n\n`;

    // KPI Targets
    md += `## 📊 Indicateurs KPI\n\n| Indicateur | Actuel | Objectif | Progression |\n|---|---:|---:|---:|\n`;
    for (const [key, metric] of Object.entries(kpi)) {
      if (key === 'brand' || key === 'contentTotals') continue;
      md += `| ${metric.label || key} | ${metric.current ?? '—'} | ${metric.target ?? '—'} | ${metric.pct ?? 0}% |\n`;
    }

    // Stats
    md += `\n## 📈 Statistiques\n\n- **Total contenus :** ${stats.total}\n- **Publiés :** ${stats.published}\n- **Portée totale :** ${formatNumber(stats.totalReach)}\n- **Interactions :** ${formatNumber(stats.totalInteractions)}\n- **Engagement :** ${formatPercent(stats.engagement)}\n\n`;

    // Content table
    md += `## 📋 Contenus\n\n| Date | Titre | Format | Statut | Plateforme | Portée | Interactions |\n|---|---|---|---|---|---:|---:|\n`;
    contents.forEach(c => {
      md += `| ${c.datePublication || '—'} | ${c.titre} | ${getContentType(c.format).label} | ${getStatus(c.statut).label} | ${c.plateforme} | ${c.resultats?.portee ?? '—'} | ${NidalStore.getInteractions(c) ?? '—'} |\n`;
    });

    _download(new Blob([md], { type: 'text/markdown;charset=utf-8;' }), `${filename || 'nidal-rapport'}-${_timestamp()}.md`);
    showToast(`Rapport Markdown exporté`, 'success');
  }

  /* ── JSON ───────────────────────────────────────────────────────── */
  function exportJSON(contents, filename) {
    const data = {
      brand: getActiveBrandLabel(),
      exportedAt: new Date().toISOString(),
      kpiTargets: NidalStore.getKpiTargets(),
      stats: NidalStore.getStats(),
      contents: contents || NidalStore.getAll()
    };
    _download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' }), `${filename || 'nidal-donnees'}-${_timestamp()}.json`);
    showToast('Données JSON exportées', 'success');
  }

  /* ── Modal d'export ─────────────────────────────────────────────── */
  function openExportModal() {
    const contents = NidalStore.getAll();
    const count = contents.length;

    openModal('Exporter les données', `
      <p style="margin-bottom:16px;color:var(--text-muted);">
        ${count} contenu(s) de <strong>${escapeHtml(getActiveBrandLabel())}</strong> prêts à l'export.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="btn btn--primary" id="export-csv-btn">📊 CSV (Excel FR)</button>
        <button class="btn btn--primary" id="export-excel-btn">📗 Excel (.xls)</button>
        <button class="btn btn--primary" id="export-pdf-btn">📕 PDF</button>
        <button class="btn btn--primary" id="export-md-btn">📝 Markdown</button>
        <button class="btn btn--secondary" id="export-json-btn" style="grid-column:span 2;">📦 JSON (sauvegarde complète)</button>
      </div>
    `, {
      onOpen: modal => {
        modal.querySelector('#export-csv-btn').onclick = () => { closeModal(); exportCSV(contents); };
        modal.querySelector('#export-excel-btn').onclick = () => { closeModal(); exportExcel(contents); };
        modal.querySelector('#export-pdf-btn').onclick = () => { closeModal(); exportPDF(contents); };
        modal.querySelector('#export-md-btn').onclick = () => { closeModal(); exportMarkdown(contents); };
        modal.querySelector('#export-json-btn').onclick = () => { closeModal(); exportJSON(contents); };
      }
    });
  }

  return { exportCSV, exportExcel, exportPDF, exportMarkdown, exportJSON, openExportModal };
})();
