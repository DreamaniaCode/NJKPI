/**
 * Nidal Junior — Pilotage éditorial
 * Vue Tableau de bord (Indicateurs clés et graphiques SVG)
 */

const DashboardView = (() => {
  function render() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    const stats = NidalStore.getStats();

    view.innerHTML = `
      <!-- Bannière d'accueil avec la mascotte officielle -->
      <section class="dashboard-hero">
        <div class="dashboard-hero__content">
          <div class="dashboard-hero__badge">
            <span class="dashboard-hero__dot"></span>
            Édition Nidal Junior
          </div>
          <h1 class="dashboard-hero__title">Bonjour l'équipe éditoriale ! 👋</h1>
          <p class="dashboard-hero__subtitle">
            Bienvenue sur votre espace de pilotage. Actuellement, <strong>${stats.inProgress} contenu(s) sont en rédaction</strong> et <strong>${stats.published} publication(s) sont prêtes</strong> pour le prochain numéro.
          </p>
          <div class="dashboard-hero__actions">
            <button class="btn btn--primary" onclick="ContentsView.openCreateForm()">+ Nouveau contenu</button>
            <button class="btn btn--secondary" onclick="App.navigateTo('planning')">Consulter le planning 📅</button>
          </div>
        </div>
        <div class="dashboard-hero__mascot-wrapper">
          <img src="./assets/mascot.png" alt="Mascotte Nidal Junior" class="dashboard-hero__mascot">
        </div>
      </section>

      <section class="kpi-grid" aria-label="Statistiques clés">
        <div class="kpi-card" tabindex="0" aria-label="Contenus totaux: ${stats.total}">
          <div class="kpi-card__icon" aria-hidden="true">📝</div>
          <div class="kpi-card__value">${stats.total}</div>
          <div class="kpi-card__label">Contenus totaux</div>
        </div>
        <div class="kpi-card" tabindex="0" aria-label="En cours de rédaction: ${stats.inProgress}">
          <div class="kpi-card__icon" aria-hidden="true">⏳</div>
          <div class="kpi-card__value" style="color:var(--warning)">${stats.inProgress}</div>
          <div class="kpi-card__label">En cours de rédaction</div>
        </div>
        <div class="kpi-card" tabindex="0" aria-label="Contenus publiés: ${stats.published}">
          <div class="kpi-card__icon" aria-hidden="true">✅</div>
          <div class="kpi-card__value" style="color:var(--success)">${stats.published}</div>
          <div class="kpi-card__label">Contenus publiés</div>
        </div>
        <div class="kpi-card" tabindex="0" aria-label="Taux d'achèvement: ${stats.completion}%">
          <div class="kpi-card__icon" aria-hidden="true">🎯</div>
          <div class="kpi-card__value" style="color:var(--primary)">${stats.completion}%</div>
          <div class="kpi-card__label">Taux d'achèvement</div>
          <div class="kpi-card__bar">
            <div class="kpi-card__bar-fill" style="width:${stats.completion}%" role="progressbar" aria-valuenow="${stats.completion}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
      </section>

      <section class="charts-grid" aria-label="Graphiques analytiques">
        <div class="chart-container">
          <h2 class="chart-container__title">Répartition par type (7 contenus)</h2>
          <div id="chart-by-type" class="chart-wrapper"></div>
        </div>
        <div class="chart-container">
          <h2 class="chart-container__title">Répartition par statut</h2>
          <div id="chart-by-status" class="chart-wrapper"></div>
        </div>
        <div class="chart-container chart-container--wide">
          <h2 class="chart-container__title">Évolution des publications (6 derniers mois)</h2>
          <div id="chart-monthly" class="chart-wrapper"></div>
        </div>
      </section>
    `;

    NidalCharts.barChart('chart-by-type', CONTENT_TYPES.map(t => ({
      label: t.label,
      value: stats.byType[t.id] || 0,
      color: t.color
    })));

    NidalCharts.donutChart('chart-by-status', STATUSES.map(s => ({
      label: s.label,
      value: stats.byStatus[s.id] || 0,
      color: s.color
    })));

    NidalCharts.lineChart('chart-monthly', stats.monthly.map(m => ({
      label: m.label,
      value: m.count
    })));
  }

  return { render };
})();
