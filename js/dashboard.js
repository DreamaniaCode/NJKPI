/** Vue d'ensemble : production, KPI et priorite. */
const DashboardView = (() => {
  function render() {
    const view = document.getElementById('view-dashboard');
    if (!view) return;
    const activeBrand = getActiveBrand();
    const isNidalJunior = activeBrand === 'nidal-junior';
    const stats = NidalStore.getStats();
    const contents = NidalStore.getAll(activeBrand);
    const isMock = typeof NidalStore.hasMockData === 'function' ? NidalStore.hasMockData() : false;
    const isEmpty = contents.length === 0;
    const focus = contents.find(item => item.statut === 'en-production') || contents.find(item => item.statut !== 'publie') || contents[0];
    const liveMeta = typeof NidalStore.getSocialLive === 'function' ? NidalStore.getSocialLive() : null;
    const liveInstagram = liveMeta?.instagram || null;
    const liveFacebook = liveMeta?.facebook || null;
    const liveInsights = liveInstagram?.insights || {};
    const liveFacebookInsights = liveFacebook?.insights || {};
    const kpiTargets = NidalStore.getKpiTargets(activeBrand);

    const facebookCardHtml = isNidalJunior ? '' : `
            <article class="social-platform-card social-platform-card--facebook">
              <div class="social-platform-card__head">
                <div class="social-platform-card__identity">
                  <div class="social-platform-card__avatar-wrap">
                    ${liveFacebook?.profilePictureUrl
                      ? `<img class="social-platform-card__avatar" src="${escapeHtml(liveFacebook.profilePictureUrl)}" alt="">`
                      : '<div class="social-platform-card__avatar social-platform-card__avatar--placeholder"></div>'}
                    <span class="social-platform-card__brand social-platform-card__brand--facebook">
                      <img src="./assets/social-facebook.svg" alt="Facebook">
                    </span>
                  </div>
                  <div>
                    <span class="social-platform-card__eyebrow">Facebook</span>
                    <h3>${escapeHtml(liveFacebook?.name || 'Page non connectée')}</h3>
                    <p>${escapeHtml(liveFacebook?.category || 'Page Facebook')}</p>
                  </div>
                </div>
                ${liveFacebook?.profileUrl ? `<a class="social-platform-card__link" href="${escapeHtml(liveFacebook.profileUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir ↗</a>` : ''}
              </div>

              <div class="social-metric-grid">
                ${_socialMetric('Abonnés', liveFacebook ? formatNumber(liveFacebook.followers ?? 0) : '—', 'Communauté Facebook')}
                ${_socialMetric('Page', liveFacebook ? 'Connectée' : '—', 'Meta Graph API')}
                ${_socialMetric('Nom utilisateur', liveFacebook?.username ? '@' + escapeHtml(liveFacebook.username) : '—', 'Identifiant public')}
                ${_socialMetric('Insights', liveFacebook?.insightsAvailable ? 'Actifs' : 'À vérifier', liveFacebook?.insightsAvailable ? 'Insights contenus Facebook' : (liveFacebookInsights.error || 'Aucun contenu analysé'))}
                ${_socialMetric('Reach récent', liveFacebookInsights.reach == null ? '—' : formatNumber(liveFacebookInsights.reach), `${liveFacebookInsights.analyzedPosts || 0} posts analysés`)}
                ${_socialMetric('Vues récentes', liveFacebookInsights.views == null ? '—' : formatNumber(liveFacebookInsights.views), 'Vues cumulées des posts analysés')}
                ${_socialMetric('Interactions', liveFacebookInsights.interactions == null ? '—' : formatNumber(liveFacebookInsights.interactions), 'Réactions + commentaires + partages')}
                ${_socialMetric('Site web', liveFacebook?.website ? 'Configuré' : '—', liveFacebook?.website || 'Aucun site renvoyé')}
                ${_socialMetric('Page ID', liveFacebook?.externalId || '—', 'Identifiant Meta')}
              </div>

              <div class="social-platform-card__footer">
                <span>${liveFacebook?.biography ? escapeHtml(liveFacebook.biography.slice(0, 100)) : 'Profil Facebook synchronisé'}</span>
              </div>
            </article>
    `;

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Semaine active</span>
          <h1 class="view__title">Vue d’ensemble</h1>
          <p class="view__subtitle">21–27 septembre 2026 · ${escapeHtml(getActiveBrandLabel())} <span style="opacity:.55;">· Frontend 20260926-44</span></p>
        </div>
        <div class="header-actions">
          ${isMock ? `
            <button class="btn btn--danger" id="dashboard-reset-btn" title="Supprimer toutes les données d'exemple pour commencer avec vos vraies données">
              🗑️ Supprimer données démo
            </button>
          ` : `
            <button class="btn btn--secondary btn--sm" id="dashboard-reset-btn" title="Réinitialiser les contenus et compteurs">
              🗑️ Réinitialiser
            </button>
          `}
          <button class="btn btn--secondary" onclick="NidalExport.openExportModal()">📤 Exporter</button>
          <button class="btn btn--secondary" onclick="App.navigateTo('planning')">Ouvrir le planning</button>
          <button class="btn btn--primary" onclick="ContentsView.openCreateForm()">+ Nouveau contenu</button>
        </div>
      </header>

      ${isMock ? `
        <div class="mock-data-banner" style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;padding:12px 18px;border-radius:8px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">💡</span>
            <div>
              <strong style="color:#92400e;font-size:13px;">Données d'exemple actives</strong>
              <p style="margin:2px 0 0;font-size:12px;color:#b45309;">L'application affiche actuellement 14 publications et objectifs de test. Cliquez sur « Supprimer les données de démo » pour commencer la saisie de vos vraies données.</p>
            </div>
          </div>
          <button class="btn btn--danger btn--sm" id="banner-reset-mock-btn" style="white-space:nowrap;font-weight:600;">
            🗑️ Supprimer les données de démo
          </button>
        </div>
      ` : ''}

      <section class="kpi-strip" aria-label="Indicateurs cles">
        ${_kpi('Contenus planifies', stats.total, `${stats.ready} pret${stats.ready > 1 ? 's' : ''}`, '#1746d1')}
        ${_kpi('Contenus publies', stats.published, formatPercent(stats.completion), '#d91b5c')}
        ${_kpi('Portee totale', stats.totalReach ? formatNumber(stats.totalReach) : '—', 'Resultats saisis', '#31b9cc')}
        ${_kpi('Taux d’engagement', stats.engagement ? formatPercent(stats.engagement) : '—', 'Interactions / portee', '#ffc928')}
        ${_kpi('A controler', stats.controls, 'Validation ou charte', '#172033')}
      </section>

      ${(isNidalJunior || liveInstagram || liveFacebook) ? `
        <section class="meta-live-panel" aria-label="KPI Meta Live">
          <div class="meta-live-panel__header">
            <div>
              <span class="section-kicker">KPI réseaux sociaux · Meta Live</span>
              <h2>${isNidalJunior ? 'Instagram Nidal Junior' : 'Instagram & Facebook'}</h2>
              <p>${isNidalJunior
                ? 'Données du compte Instagram professionnel Nidal Junior uniquement.'
                : 'Vue séparée des performances de chaque plateforme, sans additionner leurs audiences.'}</p>
            </div>
            <div class="meta-live-panel__sync">
              <span class="meta-live-status"><i></i>${liveInstagram ? 'Instagram connecté' : (isNidalJunior ? 'Instagram non synchronisé' : 'API Meta connectée')}</span>
              <small>${liveMeta?.syncedAt ? `Dernière synchro · ${new Date(liveMeta.syncedAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}` : 'Synchronisation Meta'}</small>
              <button class="btn btn--secondary btn--sm" id="dashboard-meta-refresh-btn">↻ Actualiser</button>
            </div>
          </div>

          <div class="social-platform-grid">
            <article class="social-platform-card social-platform-card--instagram">
              <div class="social-platform-card__head">
                <div class="social-platform-card__identity">
                  <div class="social-platform-card__avatar-wrap">
                    ${liveInstagram?.profilePictureUrl
                      ? `<img class="social-platform-card__avatar" src="${escapeHtml(liveInstagram.profilePictureUrl)}" alt="">`
                      : '<div class="social-platform-card__avatar social-platform-card__avatar--placeholder"></div>'}
                    <span class="social-platform-card__brand social-platform-card__brand--instagram">
                      <img src="./assets/social-instagram.svg" alt="Instagram">
                    </span>
                  </div>
                  <div>
                    <span class="social-platform-card__eyebrow">Instagram</span>
                    <h3>@${escapeHtml(liveInstagram?.username || 'non-connecté')}</h3>
                    <p>${escapeHtml(liveInstagram?.name || 'Compte professionnel')}</p>
                  </div>
                </div>
                ${liveInstagram?.profileUrl ? `<a class="social-platform-card__link" href="${escapeHtml(liveInstagram.profileUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir ↗</a>` : ''}
              </div>

              <div class="social-metric-grid">
                ${_socialMetric('Abonnés', liveInstagram?.followersAvailable === false ? '—' : (liveInstagram ? formatNumber(liveInstagram.followers ?? 0) : '—'), 'Communauté Instagram')}
                ${_socialMetric('Reach compte', liveInsights.reach == null ? '—' : formatNumber(liveInsights.reach), 'Insight du compte')}
                ${_socialMetric('Reach médias', liveInsights.mediaReach == null ? '—' : formatNumber(liveInsights.mediaReach), `${liveInsights.analyzedMedia || 0} médias analysés`)}
                ${_socialMetric('Vues médias', liveInsights.mediaViews == null ? '—' : formatNumber(liveInsights.mediaViews), 'Posts, Reels et vidéos')}
                ${_socialMetric('Interactions', liveInsights.mediaInteractions == null ? '—' : formatNumber(liveInsights.mediaInteractions), 'Likes + commentaires + partages + enregistrements')}
                ${_socialMetric('Commentaires', liveInsights.mediaComments == null ? '—' : formatNumber(liveInsights.mediaComments), 'Commentaires des médias analysés')}
                ${_socialMetric('Partages', liveInsights.mediaShares == null ? '—' : formatNumber(liveInsights.mediaShares), 'Partages des médias analysés')}
                ${_socialMetric('Enregistrements', liveInsights.mediaSaves == null ? '—' : formatNumber(liveInsights.mediaSaves), 'Sauvegardes des médias analysés')}
                ${_socialMetric('Visites profil', liveInsights.profileViews == null ? '—' : formatNumber(liveInsights.profileViews), 'Insight Instagram')}
                ${_socialMetric('Médias du compte', liveInstagram?.mediaCountAvailable === false ? '—' : (liveInstagram?.mediaCount == null ? '—' : formatNumber(liveInstagram.mediaCount)), 'Posts, Reels et vidéos')}
              </div>

              ${(!liveInstagram?.insightsAvailable || liveInsights.mediaError || (Array.isArray(liveInsights.errors) && liveInsights.errors.length)) ? `
                <div style="margin-top:10px;padding:9px 11px;border-radius:8px;background:#fff8e6;border:1px solid #f2d58a;font-size:10.5px;color:#7a5a00;">
                  <strong>Accès KPI Instagram :</strong>
                  ${escapeHtml(
                    liveInsights.mediaError
                    || (Array.isArray(liveInsights.errors) && liveInsights.errors.length
                      ? liveInsights.errors.map(item => item.message || item.metric).join(' · ')
                      : 'Certaines métriques ne sont pas accessibles avec les permissions actuelles du token Instagram.')
                  )}
                </div>
              ` : ''}

              <div class="social-platform-card__footer">
                <span>${liveInstagram?.insightsAvailable ? 'KPI Instagram synchronisés' : 'Insights Instagram à vérifier'}</span>
                <span>ID · ${escapeHtml(liveInstagram?.externalId || '—')}</span>
              </div>
            </article>

${facebookCardHtml}
          </div>
        </section>
      ` : ''}

      <!-- Section des Objectifs KPI Stratégiques & Échéances (ETA) -->
      <section class="kpi-goals-section" style="margin-top:24px;margin-bottom:0;" aria-label="Objectifs KPI prioritaires">
        <div class="section-heading" style="margin-bottom:12px;">
          <div>
            <span class="section-kicker">Cap & Objectifs Stratégiques</span>
            <h2 style="font-size:16px;">Objectifs KPI & Échéances (ETA) · ${escapeHtml(getActiveBrandLabel())}</h2>
          </div>
          <button class="btn btn--secondary btn--sm" id="dashboard-edit-targets-btn">🎯 Fixer les objectifs</button>
        </div>
        <div class="kpi-goals-grid kpi-goals-grid--dashboard">
          ${_targetMiniCard('📸', 'Followers Instagram', kpiTargets.followers, '#1746d1')}
          ${_targetMiniCard('📢', 'Reach Instagram', kpiTargets.reach, '#0f8871')}
          ${_targetMiniCard('👁️', 'Vues Instagram', kpiTargets.views, '#ffc928')}
          ${_targetMiniCard('❤️', 'Interactions', kpiTargets.interactions, '#6938ef')}
          ${_targetMiniCard('💬', 'Commentaires', kpiTargets.comments, '#31b9cc')}
          ${!isNidalJunior ? _targetMiniCard('🎯', 'Conversions', kpiTargets.conversions, '#d91b5c') : ''}
        </div>
      </section>

      ${isEmpty ? `
        <div class="empty-state-welcome" style="background:var(--panel);border:2px dashed var(--line);border-radius:12px;padding:40px 24px;text-align:center;margin:24px 0;">
          <div style="font-size:42px;margin-bottom:12px;">🚀</div>
          <h2 style="font-size:20px;color:var(--ink);margin:0 0 8px;">Prêt à créer vos vraies données !</h2>
          <p style="color:var(--muted);max-width:540px;margin:0 auto 20px;font-size:13px;line-height:1.6;">
            Toutes les données de démonstration ont été supprimées. Vos indicateurs sont à zéro. Commencez dès maintenant à planifier, importer ou générer vos premières publications.
          </p>
          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <button class="btn btn--primary" onclick="ContentsView.openCreateForm()">+ Créer un premier contenu</button>
            <button class="btn btn--secondary" onclick="NidalImport.openImportModal()">🔗 Importer un lien (Reel / Post)</button>
            ${typeof NidalAuth !== 'undefined' && NidalAuth.canViewAgents() ? '<button class="btn btn--secondary" onclick="App.navigateTo(\'agent\')">🤖 Créer avec l\'Agent IA</button>' : ''}
            <button class="btn btn--outline btn--sm" id="btn-restore-demo" style="margin-left:8px;" title="Recharger les exemples si besoin">🧪 Recharger les exemples</button>
          </div>
        </div>
      ` : `
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
          <div class="analysis-panel">
            <div class="section-heading">
              <div>
                <span class="section-kicker">Formats</span>
                <h2>Mix de contenus</h2>
              </div>
              <span class="badge badge--planifie" style="font-weight:700;">${stats.total} publication${stats.total > 1 ? 's' : ''}</span>
            </div>
            <div id="chart-by-format" class="chart-wrapper chart-wrapper--mix"></div>
          </div>
          <div class="analysis-panel">
            <div class="section-heading">
              <div>
                <span class="section-kicker">Controle</span>
                <h2>Repartition des statuts</h2>
              </div>
            </div>
            <div id="chart-by-status" class="chart-wrapper"></div>
          </div>
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
        </section>
      `}
    `;

    if (!isEmpty) {
      NidalCharts.barChart('chart-by-format', CONTENT_TYPES.map(type => ({
        id: type.id,
        label: type.label,
        value: stats.byFormat[type.id] || 0,
        color: type.color,
        icon: type.icon
      })));
      NidalCharts.donutChart('chart-by-status', STATUSES.filter(status => (stats.byStatus[status.id] || 0) > 0).map(status => ({ label: status.label, value: stats.byStatus[status.id], color: status.color })));
    }

    const btnMetaRefresh = document.getElementById('dashboard-meta-refresh-btn');
    if (btnMetaRefresh) {
      btnMetaRefresh.onclick = async () => {
        btnMetaRefresh.disabled = true;
        btnMetaRefresh.textContent = 'Synchronisation…';
        const live = await NidalStore.syncMetaLive(getActiveBrand(), true);
        if (getActiveBrand() === 'nidal-junior' && !live?.instagram) {
          const diagnostic = await NidalAPI.request('/api/meta/diagnostics?brand=nidal-junior').catch(() => null);
          const detail = diagnostic?.errors?.[0]
            || diagnostic?.configurationWarnings?.[0]
            || 'Le compte Instagram Nidal Junior n’a pas renvoyé de profil/KPI.';
          showToast('KPI Instagram indisponibles : ' + detail, 'error', 9000);
        } else {
          showToast('KPI Instagram actualisés depuis Meta.', 'success');
        }
        DashboardView.render();
      };
    }

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

    const _triggerResetModal = () => {
      openModal('Supprimer les données de démonstration', `
        <div style="text-align:center;padding:10px 0;">
          <div style="font-size:38px;margin-bottom:12px;">🗑️</div>
          <h3 style="margin:0 0 8px;font-size:16px;color:var(--ink);">Effacer toutes les données d'exemple ?</h3>
          <p style="color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 16px;">
            Cette action va effacer les <strong>14 contenus de démonstration</strong> et <strong>remettre tous les compteurs KPI à zéro</strong> pour vous permettre de créer vos vraies données.
          </p>
          <div style="background:var(--surface);padding:12px;border-radius:6px;font-size:12px;text-align:left;color:var(--ink);margin-bottom:12px;line-height:1.6;">
            <div>✓ Suppression de toutes les publications de test (Nounou, albums...)</div>
            <div>✓ Remise à zéro des compteurs réels (Followers, Vues, Commentaires, etc.)</div>
            <div>✓ Conservation des cibles d'objectifs pour votre suivi</div>
            <div>✓ Synchronisation serveur immédiate</div>
          </div>
        </div>
      `, {
        footer: `
          <button type="button" class="btn btn--secondary" data-close-modal>Annuler</button>
          <button type="button" class="btn btn--danger" id="confirm-delete-mock-btn">Oui, supprimer et démarrer à zéro</button>
        `,
        onOpen: modal => {
          modal.querySelector('#confirm-delete-mock-btn').onclick = async () => {
            closeModal();
            NidalStore.clearMockData();
            showToast('Données de démonstration supprimées ! Vous démarrez à zéro.', 'success');
            DashboardView.render();
          };
        }
      });
    };

    const btnReset = document.getElementById('dashboard-reset-btn');
    if (btnReset) btnReset.onclick = _triggerResetModal;

    const btnBannerReset = document.getElementById('banner-reset-mock-btn');
    if (btnBannerReset) btnBannerReset.onclick = _triggerResetModal;

    const btnRestoreDemo = document.getElementById('btn-restore-demo');
    if (btnRestoreDemo) {
      btnRestoreDemo.onclick = () => {
        NidalStore.loadDemoData();
        showToast('Données de démonstration rechargées !', 'info');
        DashboardView.render();
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

  function _socialMetric(label, value, note) {
    return `<div class="social-metric"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(note || '')}</small></div>`;
  }

  function _kpi(label, value, note, color) {
    return `<article class="kpi-item" style="--kpi-color:${color}" tabindex="0"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
  }

  function _statusRow(status, value, total) {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `<div class="status-bar-row"><span>${status.label}</span><div class="status-track"><i style="width:${pct}%;background:${status.color}"></i></div><strong>${value}</strong></div>`;
  }

  return { render, build: '20260926-44' };
})();
