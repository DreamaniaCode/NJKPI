/** Vue d'ensemble : production, KPI et priorite. */
const DashboardView = (() => {
  function render() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    const stats = NidalStore.getStats();
    const contents = NidalStore.getAll();
    const focus = contents.find(item => item.statut === 'en-production') || contents.find(item => item.statut !== 'publie') || contents[0];

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div><span class="section-kicker">Semaine active</span><h1 class="view__title">Vue d’ensemble</h1><p class="view__subtitle">21–27 septembre 2026 · ${escapeHtml(getActiveBrandLabel())}</p></div>
        <div class="header-actions"><button class="btn btn--secondary" onclick="App.navigateTo('planning')">Ouvrir le planning</button><button class="btn btn--primary" onclick="ContentsView.openCreateForm()">+ Nouveau contenu</button></div>
      </header>

      <section class="kpi-strip" aria-label="Indicateurs cles">
        ${_kpi('Contenus planifies', stats.total, `${stats.ready} pret${stats.ready > 1 ? 's' : ''}`, '#1746d1')}
        ${_kpi('Contenus publies', stats.published, formatPercent(stats.completion), '#d91b5c')}
        ${_kpi('Portee totale', formatNumber(stats.totalReach), 'Resultats saisis', '#31b9cc')}
        ${_kpi('Taux d’engagement', formatPercent(stats.engagement), 'Interactions / portee', '#ffc928')}
        ${_kpi('A controler', stats.controls, 'Validation ou charte', '#172033')}
      </section>

      <section class="dashboard-main-grid">
        <div class="dashboard-analysis">
          <div class="section-heading"><div><span class="section-kicker">Production</span><h2>Avancement de la semaine</h2></div><button class="text-button" onclick="App.navigateTo('contents')">Voir tous les contenus</button></div>
          <div class="status-bars">
            ${STATUSES.filter(status => status.id !== 'suspendu').map(status => _statusRow(status, stats.byStatus[status.id], stats.total)).join('')}
          </div>
        </div>
        ${focus ? `
          <aside class="priority-panel">
            <div><span class="section-kicker">Priorite du jour</span><h2>${escapeHtml(focus.titre)}</h2><p>${escapeHtml(focus.message || focus.objectif)}</p></div>
            <div class="priority-meta"><span>${formatDate(focus.datePublication, 'compact')} · ${escapeHtml(focus.heure)}</span><span>${escapeHtml(getContentType(focus.format).label)}</span><span>${escapeHtml(getControlMeta(NidalStore.getControl(focus)).label)}</span></div>
            <button class="btn btn--primary btn--block" onclick="ContentsView.openEditForm('${focus.id}')">Mettre a jour</button>
          </aside>` : ''}
      </section>

      <section class="dashboard-lower-grid">
        <div class="analysis-panel"><div class="section-heading"><div><span class="section-kicker">Formats</span><h2>Mix de contenus</h2></div></div><div id="chart-by-format" class="chart-wrapper"></div></div>
        <div class="analysis-panel"><div class="section-heading"><div><span class="section-kicker">Controle</span><h2>Repartition des statuts</h2></div></div><div id="chart-by-status" class="chart-wrapper"></div></div>
      </section>

      <section class="week-overview">
        <div class="section-heading"><div><span class="section-kicker">Calendrier</span><h2>Contenus de la semaine</h2></div></div>
        <div class="week-lines">
          ${contents.map(item => `
            <button class="week-line" onclick="ContentsView.openEditForm('${item.id}')">
              <span class="week-line__date"><strong>${formatDate(item.datePublication, 'compact')}</strong><small>${escapeHtml(item.heure)}</small></span>
              <span class="week-line__main"><strong>${escapeHtml(item.titre)}</strong><small>${escapeHtml(item.album || item.classes)}</small></span>
              <span class="week-line__level">${escapeHtml(getLevel(item.niveau).label)}</span>
              <span>${escapeHtml(getContentType(item.format).label)}</span>
              <span class="badge badge--${item.statut}">${escapeHtml(getStatus(item.statut).label)}</span>
              <span class="week-line__arrow" aria-hidden="true">›</span>
            </button>`).join('')}
        </div>
      </section>`;

    NidalCharts.barChart('chart-by-format', CONTENT_TYPES.map(type => ({ label: type.label, value: stats.byFormat[type.id] || 0, color: type.color })));
    NidalCharts.donutChart('chart-by-status', STATUSES.filter(status => (stats.byStatus[status.id] || 0) > 0).map(status => ({ label: status.label, value: stats.byStatus[status.id], color: status.color })));
  }

  function _kpi(label, value, note, color) {
    return `<article class="kpi-item" style="--kpi-color:${color}" tabindex="0"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
  }

  function _statusRow(status, value, total) {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `<div class="status-bar-row"><span>${status.label}</span><div class="status-track"><i style="width:${pct}%;background:${status.color}"></i></div><strong>${value}</strong></div>`;
  }

  return { render };
})();
