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

      <!-- Section des Objectifs KPI Stratégiques & Échéances (ETA) -->
      <section class="kpi-goals-section" style="margin-top:24px;margin-bottom:0;" aria-label="Objectifs KPI prioritaires">
        <div class="section-heading" style="margin-bottom:12px;">
          <div>
            <span class="section-kicker">Cap & Objectifs Stratégiques</span>
            <h2 style="font-size:16px;">Objectifs KPI & Échéances (ETA) · ${escapeHtml(getActiveBrandLabel())}</h2>
          </div>
          <button class="btn btn--secondary btn--sm" id="dashboard-edit-targets-btn">🎯 Fixer les objectifs</button>
        </div>
        <div class="kpi-goals-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr));">
          ${_targetMiniCard('👥', 'Followers', NidalStore.getKpiTargets().followers, '#1746d1')}
          ${_targetMiniCard('👁️', 'Vues Vidéos', NidalStore.getKpiTargets().views, '#ffc928')}
          ${_targetMiniCard('💬', 'Commentaires', NidalStore.getKpiTargets().comments, '#31b9cc')}
          ${_targetMiniCard('🎯', 'Conversions', NidalStore.getKpiTargets().conversions, '#d91b5c')}
        </div>
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

    const btnEditTargets = document.getElementById('dashboard-edit-targets-btn');
    if (btnEditTargets) {
      btnEditTargets.onclick = () => {
        if (typeof PerformanceView !== 'undefined' && PerformanceView.openKpiTargetsModal) {
          PerformanceView.openKpiTargetsModal();
        } else {
          App.navigateTo('performance');
        }
      };
    }
  }

  function _targetMiniCard(icon, title, metric, color) {
    if (!metric) return '';
    const cur = metric.current ?? 0;
    const tgt = metric.target ?? 1;
    const pct = metric.pct ?? (tgt > 0 ? Math.round((cur / tgt) * 100) : 0);
    const cappedPct = Math.min(100, Math.max(0, pct));
    const etaInfo = metric.etaInfo || { label: 'Échéance à définir', badgeClass: 'eta-badge--muted' };

    return `
      <article class="kpi-goal-card" style="--goal-color:${color};padding:14px 16px;">
        <div class="kpi-goal-card__head" style="margin-bottom:8px;">
          <div class="kpi-goal-card__title" style="font-size:12px;">
            <span class="icon" style="font-size:16px;">${icon}</span>
            <span>${escapeHtml(title)}</span>
          </div>
          <span class="badge ${pct >= 100 ? 'badge--publie' : (pct >= 50 ? 'badge--en-production' : 'badge--brouillon')}">${pct}%</span>
        </div>
        <div class="kpi-goal-card__body" style="margin-bottom:6px;">
          <div class="kpi-goal-card__values">
            <strong style="font-size:19px;">${formatNumber(cur)}</strong>
            <span class="target" style="font-size:11px;">/ ${formatNumber(tgt)}</span>
          </div>
        </div>
        <div class="progress-track" style="height:6px;margin-bottom:8px;" title="${pct}% atteint">
          <i style="width:${cappedPct}%;background:${color};"></i>
        </div>
        <div class="kpi-goal-card__footer" style="font-size:9.5px;">
          <span class="eta-badge ${etaInfo.badgeClass}" style="font-size:9px;padding:2px 6px;">
            ⏱️ ${escapeHtml(etaInfo.label)}
          </span>
        </div>
      </article>
    `;
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
