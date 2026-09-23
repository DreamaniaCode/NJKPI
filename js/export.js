/** Export CSV UTF-8 pour les tableurs francophones, sans dependance externe. */
const NidalExport = (() => {
  const HEADERS = ['Date', 'Heure', 'Titre', 'Niveau', 'Classes', 'Album / univers', 'Plateforme', 'Format', 'Pilier', 'Objectif', 'Statut', 'Validation', 'Portee cible', 'Portee reelle', 'Interactions', 'Engagement', 'Clics', 'Controle', 'Notes'];
  function _row(content) {
    return [content.datePublication, content.heure, content.titre, getLevel(content.niveau).label, content.classes, content.album, content.plateforme, getContentType(content.format).label, content.pilier, content.objectif, getStatus(content.statut).label, getValidation(content.validation).label, content.objectifs.portee, content.resultats.portee, NidalStore.getInteractions(content), NidalStore.getEngagement(content), content.resultats.clics, getControlMeta(NidalStore.getControl(content)).label, content.notes];
  }
  function exportCSV(contents, filename = 'nidal-junior-contenus') {
    if (!contents?.length) return showToast('Aucun contenu a exporter', 'error');
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [HEADERS, ...contents.map(_row)].map(row => row.map(escape).join(';')).join('\r\n');
    _download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
    showToast(`${contents.length} contenus exportes en CSV`, 'success');
  }
  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 100);
  }
  return { exportCSV };
})();
