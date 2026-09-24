/**
 * Performance des publications et suivi des objectifs stratégiques (Followers, Vues, Commentaires, Conversions & ETA).
 */
const PerformanceView = (() => {
  function render() {
    const view = document.getElementById('view-performance');
    if (!view) return;
    const brand = getActiveBrand();
    const brandLabel = getActiveBrandLabel();
    const stats = NidalStore.getStats();
    const contents = NidalStore.getAll(brand);
    const targets = NidalStore.getKpiTargets(brand);

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Mesure & Objectifs</span>
          <h1 class="view__title">Performance & Objectifs KPI</h1>
          <p class="view__subtitle">Suivi des objectifs stratégiques et des échéances cibles (ETA) pour ${escapeHtml(brandLabel)}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn--secondary btn--sm" id="btn-perf-export-csv">Exporter CSV</button>
          <button class="btn btn--primary btn--sm" id="btn-open-targets-modal">🎯 Fixer les objectifs & ETA</button>
        </div>
      </header>

      <!-- Section 1 : Cartes des Objectifs Stratégiques KPI & Échéances (ETA) -->
      <section class="kpi-goals-section" aria-label="Objectifs KPI prioritaires">
        <div class="section-heading" style="margin-bottom:12px;">
          <div>
            <span class="section-kicker">Cap stratégique · ${escapeHtml(brandLabel)}</span>
            <h2 style="font-size:16px;">Objectifs Cibles & Compte à Rebours (ETA)</h2>
          </div>
          <button class="text-button" id="btn-open-targets-text">Modifier les cibles</button>
        </div>

        <div class="kpi-goals-grid">
          ${_renderGoalCard('📸', 'Followers Instagram', targets.followers, '#1746d1', 'abonnés')}
          ${_renderGoalCard('👁️', 'Vues Vidéos & Reels', targets.views, '#ffc928', 'vues')}
          ${_renderGoalCard('💬', 'Commentaires & Échanges', targets.comments, '#31b9cc', 'commentaires')}
          ${_renderGoalCard('🎯', 'Conversions / Inscriptions', targets.conversions, '#d91b5c', 'inscriptions')}
          ${_renderGoalCard('📢', 'Portée globale (Reach)', targets.reach, '#0f8871', 'comptes')}
          ${_renderGoalCard('❤️', 'Interactions totales', targets.interactions, '#6938ef', 'interactions')}
        </div>
      </section>

      <!-- Section 2 : Synthèse cumulée de la marque -->
      <section class="summary-strip" style="grid-template-columns: repeat(6, minmax(0, 1fr));">
        ${_summary('Portée cumulée', formatNumber(stats.totalReach))}
        ${_summary('Vues vidéos', formatNumber(stats.totalViews))}
        ${_summary('Commentaires', formatNumber(stats.totalComments))}
        ${_summary('Conversions', formatNumber(stats.totalConversions))}
        ${_summary('Interactions', formatNumber(stats.totalInteractions))}
        ${_summary('Engagement global', formatPercent(stats.engagement))}
      </section>

      <!-- Section 3 : Suivi par publication avec Objectifs & Échéance (ETA) -->
      <div class="section-heading" style="margin-top:28px;margin-bottom:12px;">
        <div>
          <span class="section-kicker">Publications</span>
          <h2 style="font-size:16px;">Performance et cibles par contenu</h2>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Publication</th>
              <th>Portée (Réel / Obj.)</th>
              <th>Vues (Réel / Obj.)</th>
              <th>Commentaires (Réel / Obj.)</th>
              <th>Conversions</th>
              <th>Échéance (ETA)</th>
              <th>Progression</th>
              <th class="actions-column">Action</th>
            </tr>
          </thead>
          <tbody>
            ${contents.length ? contents.map(c => _row(c)).join('') : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--muted);">Aucun contenu enregistré pour cette marque.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    _bindEvents();
  }

  function _renderGoalCard(icon, title, metric, color, unit) {
    const cur = metric.current ?? 0;
    const tgt = metric.target ?? 1;
    const pct = metric.pct ?? (tgt > 0 ? Math.round((cur / tgt) * 100) : 0);
    const cappedPct = Math.min(100, Math.max(0, pct));
    const etaInfo = metric.etaInfo || { label: 'Échéance à définir', badgeClass: 'eta-badge--muted' };

    let pctColorClass = 'kpi-goal-card__pct--blue';
    if (pct >= 100) pctColorClass = 'kpi-goal-card__pct--green';
    else if (pct >= 50) pctColorClass = 'kpi-goal-card__pct--blue';
    else if (pct >= 25) pctColorClass = 'kpi-goal-card__pct--yellow';
    else pctColorClass = 'kpi-goal-card__pct--red';

    return `
      <article class="kpi-goal-card" style="--goal-color:${color}">
        <div class="kpi-goal-card__head">
          <div class="kpi-goal-card__title">
            <span class="icon">${icon}</span>
            <span>${escapeHtml(title)}</span>
          </div>
          <button class="btn btn--icon btn--sm" data-edit-kpi="${metric.key}" title="Modifier cet objectif" style="font-size:11px;">✏️</button>
        </div>

        <div class="kpi-goal-card__body">
          <div class="kpi-goal-card__values">
            <strong>${formatNumber(cur)}</strong>
            <span class="target">/ ${formatNumber(tgt)} ${unit}</span>
          </div>
          <span class="kpi-goal-card__pct ${pctColorClass}">${pct}%</span>
        </div>

        <div class="progress-track--lg" title="${pct}% de l'objectif atteint">
          <i style="width:${cappedPct}%;"></i>
        </div>

        <div class="kpi-goal-card__footer">
          <span class="kpi-goal-card__remaining">
            ${metric.remaining > 0 ? `Reste : <b>${formatNumber(metric.remaining)}</b>` : '<b>Objectif atteint ! 🎉</b>'}
          </span>
          <span class="eta-badge ${etaInfo.badgeClass}" title="Date cible ETA">
            ⏱️ ${escapeHtml(etaInfo.label)}
          </span>
        </div>
      </article>
    `;
  }

  function _summary(label, value) {
    return `<article><span>${label}</span><strong>${value}</strong></article>`;
  }

  function _row(content) {
    const reach = content.resultats.portee;
    const reachTarget = content.objectifs.portee;
    const views = content.resultats.vues;
    const viewsTarget = content.objectifs.vues;
    const comments = content.resultats.commentaires;
    const commentsTarget = content.objectifs.commentaires;
    const conversions = content.resultats.conversions;
    const conversionsTarget = content.objectifs.conversions;

    // Progress calculation based on primary available metric
    let ratio = null;
    if (reach !== null && reachTarget) ratio = reach / reachTarget;
    else if (views !== null && viewsTarget) ratio = views / viewsTarget;
    else if (comments !== null && commentsTarget) ratio = comments / commentsTarget;

    const etaDate = content.objectifs.eta || content.datePublication;
    const etaInfo = NidalStore.getEtaInfo(etaDate, ratio || 0);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(content.titre)}</strong>
          <small>${formatDate(content.datePublication, 'compact')} · ${escapeHtml(content.plateforme)}</small>
        </td>
        <td>
          <b>${formatNumber(reach)}</b>
          <small>/ ${formatNumber(reachTarget)}</small>
        </td>
        <td>
          <b>${formatNumber(views)}</b>
          <small>/ ${formatNumber(viewsTarget)}</small>
        </td>
        <td>
          <b>${formatNumber(comments)}</b>
          <small>/ ${formatNumber(commentsTarget)}</small>
        </td>
        <td>
          <b style="color:var(--magenta);">${formatNumber(conversions)}</b>
          <small>/ ${formatNumber(conversionsTarget)}</small>
        </td>
        <td>
          <span class="eta-badge ${etaInfo.badgeClass}">
            ${escapeHtml(etaInfo.label)}
          </span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="progress-track" style="min-width:70px;" title="${formatPercent(ratio)}">
              <i style="width:${ratio === null ? 0 : Math.min(ratio, 1) * 100}%"></i>
            </div>
            <small style="font-weight:700;">${formatPercent(ratio)}</small>
          </div>
        </td>
        <td class="actions-column">
          <button class="btn btn--secondary btn--sm" onclick="ContentsView.openEditForm('${content.id}')">
            Saisir KPI
          </button>
        </td>
      </tr>
    `;
  }

  function _bindEvents() {
    const btnTargets = document.getElementById('btn-open-targets-modal');
    const btnTargetsText = document.getElementById('btn-open-targets-text');
    if (btnTargets) btnTargets.onclick = openKpiTargetsModal;
    if (btnTargetsText) btnTargetsText.onclick = openKpiTargetsModal;

    const btnExport = document.getElementById('btn-perf-export-csv');
    if (btnExport) {
      btnExport.onclick = () => {
        const brand = getActiveBrand();
        NidalExport.exportCSV(NidalStore.getAll(brand), `${brand}-kpi-performance`);
      };
    }

    document.querySelectorAll('[data-edit-kpi]').forEach(btn => {
      btn.onclick = () => openKpiTargetsModal(btn.dataset.editKpi);
    });
  }

  function openKpiTargetsModal(focusKey = '') {
    const brand = getActiveBrand();
    const brandLabel = getActiveBrandLabel();
    const targets = NidalStore.getKpiTargets(brand);
    const totals = targets.contentTotals;

    const fields = [
      { key: 'followers', icon: '📸', label: 'Followers Instagram', unit: 'abonnés IG', color: '#1746d1', hint: 'Abonnés Instagram uniquement — ne pas additionner Facebook' },
      { key: 'views', icon: '👁️', label: 'Vues Vidéos & Reels', unit: 'vues', color: '#ffc928', hint: 'Cumul des lectures de vidéos et stories' },
      { key: 'comments', icon: '💬', label: 'Commentaires & Échanges', unit: 'commentaires', color: '#31b9cc', hint: 'Réponses, retours et messages générés' },
      { key: 'conversions', icon: '🎯', label: 'Conversions / Inscriptions', unit: 'inscriptions', color: '#d91b5c', hint: 'Prises de contact, visites, inscriptions' },
      { key: 'reach', icon: '📢', label: 'Portée Globale (Reach)', unit: 'comptes', color: '#0f8871', hint: 'Personnes uniques atteintes' },
      { key: 'interactions', icon: '❤️', label: 'Interactions totales', unit: 'interactions', color: '#6938ef', hint: 'Réactions, partages, enregistrements' }
    ];

    const contentHtml = `
      <div style="margin-bottom:14px;">
        <p style="font-size:11.5px;color:var(--muted);margin:0 0 10px;">
          Définissez vos objectifs cibles, vos valeurs de départ et les <strong>dates d'échéance (ETA)</strong> pour <strong>${escapeHtml(brandLabel)}</strong>.
          L'application calculera automatiquement l'avancement, le nombre de jours restants et le rythme requis.
        </p>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="btn btn--secondary btn--sm" id="btn-prefill-totals" title="Importer les totaux actuels des publications enregistrées">
            🔄 Pré-remplir avec les résultats des publications
          </button>
        </div>
      </div>

      <div class="kpi-targets-form">
        <div style="display:grid;grid-template-columns:32px 140px 1fr 1fr 130px;gap:10px;padding:6px 0;font-size:10px;font-weight:800;color:var(--muted);border-bottom:1px solid var(--line);">
          <span></span>
          <span>INDICATEUR</span>
          <span>VALEUR ACTUELLE</span>
          <span>OBJECTIF CIBLE</span>
          <span>ÉCHÉANCE (ETA)</span>
        </div>

        ${fields.map(f => {
          const item = targets[f.key] || {};
          return `
            <div class="kpi-target-edit-row" id="row-${f.key}" style="${focusKey === f.key ? 'background:var(--soft-blue);border-radius:4px;padding-inline:4px;' : ''}">
              <span style="font-size:18px;">${f.icon}</span>
              <div>
                <strong>${escapeHtml(f.label)}</strong>
                <small style="display:block;color:var(--muted);font-size:9.5px;">${f.hint}</small>
              </div>
              <div>
                <input type="number" min="0" id="target-cur-${f.key}" class="form-control"
                  value="${item.current ?? 0}" placeholder="Actuel">
              </div>
              <div>
                <input type="number" min="0" id="target-val-${f.key}" class="form-control"
                  value="${item.target ?? 1}" placeholder="Objectif">
              </div>
              <div>
                <input type="date" id="target-eta-${f.key}" class="form-control"
                  value="${toISODate(item.eta || '')}">
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    openModal(`🎯 Fixer les Objectifs KPI & Échéances (ETA) · ${brandLabel}`, contentHtml, {
      footer: `
        <button type="button" class="btn btn--secondary" data-close-modal>Annuler</button>
        <button type="button" class="btn btn--primary" id="btn-save-targets">Enregistrer les objectifs</button>
      `,
      onOpen: (modal) => {
        // Pre-fill button
        const btnPrefill = modal.querySelector('#btn-prefill-totals');
        if (btnPrefill) {
          btnPrefill.onclick = () => {
            const viewsEl = modal.querySelector('#target-cur-views');
            const commentsEl = modal.querySelector('#target-cur-comments');
            const conversionsEl = modal.querySelector('#target-cur-conversions');
            const reachEl = modal.querySelector('#target-cur-reach');
            const interactionsEl = modal.querySelector('#target-cur-interactions');
            if (viewsEl && totals.views) viewsEl.value = totals.views;
            if (commentsEl && totals.comments) commentsEl.value = totals.comments;
            if (conversionsEl && totals.conversions) conversionsEl.value = totals.conversions;
            if (reachEl && totals.reach) reachEl.value = totals.reach;
            if (interactionsEl && totals.interactions) interactionsEl.value = totals.interactions;
            showToast('Valeurs actuelles synchronisées avec le cumul des publications', 'info');
          };
        }

        // Save button
        const btnSave = modal.querySelector('#btn-save-targets');
        if (btnSave) {
          btnSave.onclick = () => {
            const newTargets = {};
            fields.forEach(f => {
              const curVal = modal.querySelector(`#target-cur-${f.key}`)?.value;
              const tgtVal = modal.querySelector(`#target-val-${f.key}`)?.value;
              const etaVal = modal.querySelector(`#target-eta-${f.key}`)?.value;

              newTargets[f.key] = {
                ...(targets[f.key] || {}),
                current: curVal === '' ? 0 : Number(curVal),
                target: tgtVal === '' ? 1 : Number(tgtVal),
                eta: etaVal || ''
              };
            });

            NidalStore.updateKpiTargets(newTargets, brand);
            closeModal();
            render();
            showToast('Objectifs KPI et échéances (ETA) mis à jour avec succès !', 'success');
          };
        }
      }
    });
  }

  return { render, openKpiTargetsModal };
})();
