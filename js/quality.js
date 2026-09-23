/** Controle de conformite et sauvegarde des donnees. */
const QualityView = (() => {
  function render() {
    const view = document.getElementById('view-quality');
    if (!view) return;
    const contents = NidalStore.getAll();
    const counts = { conforme: 0, pret: 0, 'a-controler': 0 };
    contents.forEach(content => counts[NidalStore.getControl(content)]++);
    view.innerHTML = `
      <header class="view__header workspace-header"><div><span class="section-kicker">Avant publication</span><h1 class="view__title">Controle</h1><p class="view__subtitle">Logo, valeurs, pied de page, autorisations et validation</p></div></header>
      <section class="summary-strip">${_summary('Conformes',counts.conforme)}${_summary('Prets',counts.pret)}${_summary('A controler',counts['a-controler'])}</section>
      <section class="quality-list"><div class="quality-head"><span>Contenu</span><span>Logo</span><span>Valeurs</span><span>Pied de page</span><span>Autorisations</span><span>Validation</span><span>Resultat</span><span></span></div>${contents.map(content => _row(content)).join('')}</section>
      <section class="data-tools"><div><span class="section-kicker">Donnees</span><h2>Sauvegarde locale</h2><p>Exportez une sauvegarde JSON avant un changement important ou restaurez un fichier existant.</p></div><div class="data-tools__actions"><button class="btn btn--secondary" id="export-json-btn">Exporter JSON</button><label class="btn btn--secondary">Restaurer JSON<input type="file" id="import-json-input" accept=".json" hidden></label><button class="btn btn--danger" id="reset-all-btn">Restaurer la semaine initiale</button></div></section>`;
    document.getElementById('export-json-btn').onclick = _exportJson;
    document.getElementById('import-json-input').onchange = _importJson;
    document.getElementById('reset-all-btn').onclick = () => confirmAction('Remplacer les donnees actuelles par le planning initial Nidal Junior ?', () => { NidalStore.reset(); showToast('Planning initial restaure', 'success'); });
  }
  function _summary(label,value){ return `<article><span>${label}</span><strong>${value}</strong></article>`; }
  function _mark(value,label){ return `<span class="quality-mark ${value ? 'quality-mark--yes' : 'quality-mark--no'}">${value ? '✓' : '×'} <small>${label}</small></span>`; }
  function _row(content) { const control = getControlMeta(NidalStore.getControl(content)); return `<div class="quality-row"><span><strong>${escapeHtml(content.titre)}</strong><small>${escapeHtml(getStatus(content.statut).label)}</small></span>${_mark(content.checks.logo,'Logo')}${_mark(content.checks.valeurs,'Valeurs')}${_mark(content.checks.footer,'Pied')}${_mark(content.checks.autorisation,'Autorisation')}<span>${escapeHtml(getValidation(content.validation).label)}</span><span class="control-badge ${control.className}">${control.label}</span><button class="btn btn--icon btn--sm" onclick="ContentsView.openEditForm('${content.id}')">Modifier</button></div>`; }
  function _exportJson() { const blob = new Blob([NidalStore.exportData()], { type: 'application/json;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `nidal-junior-sauvegarde-${new Date().toISOString().split('T')[0]}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href),100); }
  function _importJson(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => { try { NidalStore.importData(e.target.result); showToast('Sauvegarde restauree','success'); } catch { showToast('Fichier JSON invalide','error'); } }; reader.readAsText(file); }
  return { render };
})();
