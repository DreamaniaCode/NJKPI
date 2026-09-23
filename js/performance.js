/** Performance des publications comparee aux objectifs. */
const PerformanceView = (() => {
  function render() {
    const view = document.getElementById('view-performance');
    if (!view) return;
    const stats = NidalStore.getStats();
    const contents = NidalStore.getAll();
    view.innerHTML = `
      <header class="view__header workspace-header"><div><span class="section-kicker">Mesure</span><h1 class="view__title">Performance</h1><p class="view__subtitle">Les tirets signalent une donnee reelle non renseignee</p></div><button class="btn btn--secondary" onclick="NidalExport.exportCSV(NidalStore.getAll(),'nidal-junior-resultats')">Exporter CSV</button></header>
      <section class="summary-strip">${_summary('Portee cumulee',formatNumber(stats.totalReach))}${_summary('Interactions',formatNumber(stats.totalInteractions))}${_summary('Engagement global',formatPercent(stats.engagement))}${_summary('Clics CTA',formatNumber(stats.totalClicks))}</section>
      <div class="table-responsive"><table class="data-table"><thead><tr><th>Contenu</th><th>Portee</th><th>Objectif</th><th>Progression</th><th>Interactions</th><th>Engagement</th><th>Clics</th><th></th></tr></thead><tbody>${contents.map(content => _row(content)).join('')}</tbody></table></div>`;
  }
  function _summary(label,value){ return `<article><span>${label}</span><strong>${value}</strong></article>`; }
  function _row(content) {
    const reach = content.resultats.portee;
    const target = content.objectifs.portee;
    const ratio = reach !== null && target ? reach / target : null;
    return `<tr><td><strong>${escapeHtml(content.titre)}</strong><small>${escapeHtml(content.plateforme)}</small></td><td>${formatNumber(reach)}</td><td>${formatNumber(target)}</td><td><div class="progress-track" title="${formatPercent(ratio)}"><i style="width:${ratio === null ? 0 : Math.min(ratio,1)*100}%"></i></div></td><td>${formatNumber(NidalStore.getInteractions(content))}</td><td>${formatPercent(NidalStore.getEngagement(content))}</td><td>${formatNumber(content.resultats.clics)}</td><td><button class="btn btn--icon btn--sm" onclick="ContentsView.openEditForm('${content.id}')">Saisir</button></td></tr>`;
  }
  return { render };
})();
