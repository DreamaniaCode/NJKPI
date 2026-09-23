/**
 * Nidal Junior — Pilotage éditorial
 * Exports CSV (UTF-8 BOM + point-virgule) et Excel (XLSX via SheetJS)
 */

const NidalExport = (() => {
  const HEADERS = ['Titre', 'Type', 'Statut', 'Auteur', 'Date de création', 'Date de publication', 'Description', 'Tags'];

  function _toRow(c) {
    return [
      c.titre || '',
      getContentType(c.type).label,
      getStatus(c.statut).label,
      c.auteur || '',
      formatDate(c.dateCreation, 'short'),
      formatDate(c.datePublication, 'short'),
      c.description || '',
      (c.tags || []).join(', ')
    ];
  }

  function exportCSV(contents, filename = 'nidal-junior-contenus') {
    if (!contents || !contents.length) {
      showToast('Aucun contenu à exporter', 'error');
      return;
    }
    const BOM = '\uFEFF';
    const sep = ';';
    const headerLine = HEADERS.join(sep);
    const rows = contents.map(c => _toRow(c).map(val => `"${String(val).replace(/"/g, '""')}"`).join(sep));
    const blob = new Blob([BOM + headerLine + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    _download(blob, `${filename}.csv`);
    showToast(`${contents.length} contenus exportés en CSV`, 'success');
  }

  function exportExcel(contents, filename = 'nidal-junior-contenus') {
    if (!contents || !contents.length) {
      showToast('Aucun contenu à exporter', 'error');
      return;
    }
    if (typeof XLSX === 'undefined') {
      showToast('Module Excel indisponible ou en cours de chargement', 'error');
      return;
    }

    try {
      const data = [HEADERS, ...contents.map(_toRow)];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 35 }, // Titre
        { wch: 15 }, // Type
        { wch: 15 }, // Statut
        { wch: 20 }, // Auteur
        { wch: 15 }, // Date de création
        { wch: 15 }, // Date de publication
        { wch: 40 }, // Description
        { wch: 25 }  // Tags
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contenus');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      showToast(`${contents.length} contenus exportés en Excel`, 'success');
    } catch (e) {
      console.error('Erreur export Excel:', e);
      showToast('Erreur lors de la génération du fichier Excel', 'error');
    }
  }

  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  return { exportCSV, exportExcel };
})();
