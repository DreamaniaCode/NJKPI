/** Audience, conversions et meilleurs contenus Meta. */
const AudienceView = (() => {
  let _data = null;
  let _history = [];
  let _loading = false;
  let _error = '';

  function _num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function _sumActions(actions = {}) {
    return Object.values(actions || {}).reduce((sum, value) => sum + _num(value), 0);
  }

  function _topActions(actions = {}) {
    return Object.entries(actions || {})
      .map(([name, value]) => ({ name, value: _num(value) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  function _shortText(value, max = 86) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  async function _load(refresh = false) {
    if (_loading || !NidalAPI.isOnline()) return;
    _loading = true;
    _error = '';
    render();
    try {
      const [current, history] = await Promise.all([
        NidalAPI.getAudienceConversions(getActiveBrand(), refresh),
        NidalAPI.getAudienceHistory(getActiveBrand(), 168).catch(() => [])
      ]);
      _data = current;
      _history = Array.isArray(history) ? history : [];
    } catch (error) {
      _error = error.message || 'Impossible de charger les données Meta.';
    } finally {
      _loading = false;
      render();
    }
  }

  function _historySeries(selector) {
    return [..._history]
      .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))
      .map(row => {
        const value = selector(row.payload || {});
        return {
          label: new Date(row.captured_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' }),
          value: _num(value)
        };
      })
      .filter(row => Number.isFinite(row.value));
  }

  function _summaryCard(label, value, note) {
    return '<article class="kpi-item" tabindex="0"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong><small>' + escapeHtml(note || '') + '</small></article>';
  }

  function _audienceTable(rows = []) {
    if (!rows.length) return '<p style="color:var(--muted);font-size:12px;margin:0;">Aucune donnée disponible.</p>';
    return '<div class="table-responsive"><table class="data-table"><thead><tr><th>Âge</th><th>Genre</th><th>Portée</th><th>Impressions</th><th>Clics</th><th>Dépenses</th></tr></thead><tbody>' +
      rows.slice(0, 30).map(row => '<tr>' +
        '<td>' + escapeHtml(row.age || '—') + '</td>' +
        '<td>' + escapeHtml(row.gender || '—') + '</td>' +
        '<td>' + formatNumber(_num(row.reach)) + '</td>' +
        '<td>' + formatNumber(_num(row.impressions)) + '</td>' +
        '<td>' + formatNumber(_num(row.clicks)) + '</td>' +
        '<td>' + _num(row.spend).toFixed(2) + '</td>' +
      '</tr>').join('') + '</tbody></table></div>';
  }

  function _regionTable(rows = []) {
    if (!rows.length) return '<p style="color:var(--muted);font-size:12px;margin:0;">Aucune donnée disponible.</p>';
    const grouped = {};
    rows.forEach(row => {
      const region = row.region || 'Non précisé';
      if (!grouped[region]) grouped[region] = { reach: 0, impressions: 0, clicks: 0, spend: 0 };
      grouped[region].reach += _num(row.reach);
      grouped[region].impressions += _num(row.impressions);
      grouped[region].clicks += _num(row.clicks);
      grouped[region].spend += _num(row.spend);
    });
    const sorted = Object.entries(grouped).sort((a, b) => b[1].reach - a[1].reach).slice(0, 20);
    return '<div class="table-responsive"><table class="data-table"><thead><tr><th>Région</th><th>Portée</th><th>Impressions</th><th>Clics</th><th>Dépenses</th></tr></thead><tbody>' +
      sorted.map(([region, row]) => '<tr><td><strong>' + escapeHtml(region) + '</strong></td><td>' + formatNumber(row.reach) + '</td><td>' + formatNumber(row.impressions) + '</td><td>' + formatNumber(row.clicks) + '</td><td>' + row.spend.toFixed(2) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function _campaignTable(rows = []) {
    if (!rows.length) return '<p style="color:var(--muted);font-size:12px;margin:0;">Aucune campagne disponible.</p>';
    return '<div class="table-responsive"><table class="data-table"><thead><tr><th>Campagne</th><th>Reach</th><th>Impressions</th><th>Clics</th><th>CTR</th><th>CPC</th><th>CPM</th><th>Dépenses</th></tr></thead><tbody>' +
      rows.slice(0, 20).map(row => '<tr>' +
        '<td><strong>' + escapeHtml(row.campaign_name || row.campaign_id || 'Campagne') + '</strong></td>' +
        '<td>' + formatNumber(_num(row.reach)) + '</td>' +
        '<td>' + formatNumber(_num(row.impressions)) + '</td>' +
        '<td>' + formatNumber(_num(row.clicks)) + '</td>' +
        '<td>' + (_num(row.ctr)).toFixed(2) + '%</td>' +
        '<td>' + (_num(row.cpc)).toFixed(2) + '</td>' +
        '<td>' + (_num(row.cpm)).toFixed(2) + '</td>' +
        '<td><b>' + (_num(row.spend)).toFixed(2) + '</b></td>' +
      '</tr>').join('') + '</tbody></table></div>';
  }

  function _contentTotals(items = []) {
    return items.reduce((acc, item) => {
      const m = item.metrics || {};
      acc.reach += _num(m.reach);
      acc.views += _num(m.views);
      acc.interactions += _num(m.interactions);
      acc.comments += _num(m.comments);
      acc.shares += _num(m.shares);
      acc.saves += _num(m.saves);
      return acc;
    }, { reach: 0, views: 0, interactions: 0, comments: 0, shares: 0, saves: 0 });
  }

  function _contentTable(items = [], platform = 'instagram') {
    if (!items.length) return '<p style="color:var(--muted);font-size:12px;margin:0;">Aucun contenu historique disponible pour cette plateforme.</p>';
    return '<div class="table-responsive"><table class="data-table"><thead><tr><th>Date</th><th>Contenu</th><th>Type</th><th>Reach</th><th>Vues</th><th>Interactions</th><th>Partages</th><th>Enreg.</th><th></th></tr></thead><tbody>' +
      items.slice(0, 25).map(item => {
        const m = item.metrics || {};
        const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString('fr-FR') : '—';
        const saveValue = platform === 'instagram' ? formatNumber(_num(m.saves)) : '—';
        return '<tr>' +
          '<td>' + escapeHtml(date) + '</td>' +
          '<td style="min-width:240px;"><strong>' + escapeHtml(_shortText(item.caption || 'Publication sans texte')) + '</strong></td>' +
          '<td>' + escapeHtml(item.mediaType || '—') + '</td>' +
          '<td><b>' + formatNumber(_num(m.reach)) + '</b></td>' +
          '<td>' + formatNumber(_num(m.views)) + '</td>' +
          '<td>' + formatNumber(_num(m.interactions)) + '</td>' +
          '<td>' + formatNumber(_num(m.shares)) + '</td>' +
          '<td>' + saveValue + '</td>' +
          '<td>' + (item.permalink ? '<a class="text-button" href="' + escapeHtml(item.permalink) + '" target="_blank" rel="noopener noreferrer">Voir</a>' : '') + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function render() {
    const view = document.getElementById('view-audience');
    if (!view) return;

    const brandLabel = getActiveBrandLabel();
    const ads = _data?.ads || {};
    const adSummary = ads.summary || {};
    const actionsTotal = _sumActions(adSummary.actions || {});
    const actionRows = _topActions(adSummary.actions || {});
    const ig = _data?.instagram || {};
    const fb = _data?.facebook || {};
    const igTotals = _contentTotals(ig.topContent || []);
    const fbTotals = _contentTotals(fb.topContent || []);

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Audience & Conversions</span>
          <h1 class="view__title">Audience, Ads & contenus gagnants</h1>
          <p class="view__subtitle">Lecture séparée de l'audience publicitaire, des conversions et des anciens contenus performants · ${escapeHtml(brandLabel)}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn--secondary btn--sm" id="audience-refresh-btn" ${_loading ? 'disabled' : ''}>${_loading ? 'Synchronisation…' : '↻ Actualiser Meta'}</button>
        </div>
      </header>

      ${_error ? '<div style="padding:12px 16px;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;color:#991b1b;margin-bottom:16px;">' + escapeHtml(_error) + '</div>' : ''}

      ${!_data && !_loading ? '<div class="empty-state" style="padding:36px;text-align:center;"><strong>Chargement des données Audience & Conversions</strong><p style="color:var(--muted);">Cette page analyse Meta Ads et les anciens contenus Instagram/Facebook.</p></div>' : ''}

      ${_data ? `
        <section style="margin-bottom:24px;">
          <div class="section-heading">
            <div><span class="section-kicker">Couverture des données</span><h2>Ce que NJKPI reçoit réellement de Meta</h2></div>
          </div>
          <div class="kpi-strip" style="margin-bottom:16px;">
            ${_summaryCard('Instagram analysé', formatNumber(ig.analyzedMedia || 0), ig.error ? 'Accès partiel / erreur' : 'Médias historiques')}
            ${_summaryCard('Facebook analysé', formatNumber(fb.analyzedMedia || 0), fb.error ? 'Accès partiel / erreur' : 'Publications historiques')}
            ${_summaryCard('Meta Ads', ads.configured ? 'Connecté' : 'Non configuré', ads.configured ? 'Compte publicitaire détecté' : 'META_AD_ACCOUNT_ID requis')}
            ${_summaryCard('Audience démographique', (ads.ageGender || []).length ? 'Disponible' : 'Indisponible', (ads.ageGender || []).length ? 'Âge + genre' : 'Dépend du compte Ads / permissions')}
            ${_summaryCard('Régions Ads', (ads.regions || []).length ? 'Disponible' : 'Indisponible', (ads.regions || []).length ? 'Répartition géographique' : 'Dépend du compte Ads / permissions')}
          </div>
          ${ads.errors?.length ? '<div style="padding:12px 14px;background:#fff8e6;border:1px solid #f2d58a;border-radius:9px;font-size:11px;color:#7a5a00;margin-bottom:16px;"><strong>Pourquoi certaines infos manquent :</strong> ' + ads.errors.map(escapeHtml).join(' · ') + '</div>' : ''}
          ${ig.error ? '<div style="padding:10px 12px;background:var(--surface);border:1px solid var(--line);border-radius:8px;font-size:11px;color:var(--muted);margin-bottom:8px;"><strong>Instagram :</strong> ' + escapeHtml(ig.error) + '</div>' : ''}
          ${fb.error ? '<div style="padding:10px 12px;background:var(--surface);border:1px solid var(--line);border-radius:8px;font-size:11px;color:var(--muted);margin-bottom:8px;"><strong>Facebook :</strong> ' + escapeHtml(fb.error) + '</div>' : ''}
        </section>

        <section style="margin-bottom:24px;">
          <div class="section-heading">
            <div><span class="section-kicker">Meta Ads · 90 derniers jours</span><h2>Acquisition & conversions publicitaires</h2></div>
            <small style="color:var(--muted);">${ads.configured ? 'Compte Ads configuré' : 'Compte Ads non configuré'}</small>
          </div>
          <div class="kpi-strip" style="margin-bottom:14px;">
            ${_summaryCard('Dépenses Ads', _num(adSummary.spend).toFixed(2), 'Meta Ads')}
            ${_summaryCard('Reach Ads', formatNumber(_num(adSummary.reach)), 'Audience payante')}
            ${_summaryCard('Impressions Ads', formatNumber(_num(adSummary.impressions)), 'Affichages')}
            ${_summaryCard('Clics Ads', formatNumber(_num(adSummary.clicks)), 'Trafic généré')}
            ${_summaryCard('Actions / conversions', formatNumber(actionsTotal), 'Actions Meta enregistrées')}
          </div>
          ${actionRows.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' + actionRows.map(item => '<span class="badge badge--planifie">' + escapeHtml(item.name) + ': ' + formatNumber(item.value) + '</span>').join('') + '</div>' : ''}
          <div class="analysis-panel" style="margin-bottom:16px;">
            <div class="section-heading"><div><span class="section-kicker">Campagnes</span><h2>Détail des campagnes publicitaires</h2></div><span class="badge badge--planifie">${formatNumber((ads.campaigns || []).length)} campagnes</span></div>
            ${_campaignTable(ads.campaigns || [])}
          </div>
        </section>

        <section class="dashboard-lower-grid" style="margin-bottom:24px;">
          <div class="analysis-panel">
            <div class="section-heading"><div><span class="section-kicker">Audience Ads</span><h2>Âge & genre</h2></div></div>
            ${_audienceTable(ads.ageGender || [])}
          </div>
          <div class="analysis-panel">
            <div class="section-heading"><div><span class="section-kicker">Géographie Ads</span><h2>Régions les plus touchées</h2></div></div>
            ${_regionTable(ads.regions || [])}
          </div>
        </section>

        <section style="margin-bottom:26px;">
          <div class="section-heading">
            <div>
              <span class="section-kicker">Évolution enregistrée</span>
              <h2>Courbes horaires des performances</h2>
            </div>
            <span class="badge badge--planifie">${_history.length} snapshots</span>
          </div>
          <div class="dashboard-lower-grid">
            <div class="analysis-panel">
              <div class="section-heading"><div><span class="section-kicker">Ads</span><h2>Reach Ads</h2></div></div>
              <div id="audience-chart-reach" class="chart-wrapper"></div>
            </div>
            <div class="analysis-panel">
              <div class="section-heading"><div><span class="section-kicker">Ads</span><h2>Clics Ads</h2></div></div>
              <div id="audience-chart-clicks" class="chart-wrapper"></div>
            </div>
          </div>
          <div class="dashboard-lower-grid" style="margin-top:16px;">
            <div class="analysis-panel">
              <div class="section-heading"><div><span class="section-kicker">Instagram organique</span><h2>Reach des contenus analysés</h2></div></div>
              <div id="audience-chart-ig" class="chart-wrapper"></div>
            </div>
            <div class="analysis-panel">
              <div class="section-heading"><div><span class="section-kicker">Facebook organique</span><h2>Reach des contenus analysés</h2></div></div>
              <div id="audience-chart-fb" class="chart-wrapper"></div>
            </div>
          </div>
        </section>

        <section style="margin-bottom:26px;">
          <div class="section-heading">
            <div><span class="section-kicker">Instagram · historique</span><h2>Anciens posts et vidéos qui ont le mieux marché</h2></div>
            <span class="badge badge--planifie">${formatNumber(ig.analyzedMedia || 0)} médias analysés</span>
          </div>
          <div class="kpi-strip" style="margin-bottom:14px;">
            ${_summaryCard('Reach analysé IG', formatNumber(igTotals.reach), 'Sur les médias récupérés')}
            ${_summaryCard('Vues analysées IG', formatNumber(igTotals.views), 'Sur les médias récupérés')}
            ${_summaryCard('Interactions IG', formatNumber(igTotals.interactions), 'Likes + commentaires + partages + enregistrements')}
            ${_summaryCard('Partages IG', formatNumber(igTotals.shares), 'Contenus partagés')}
            ${_summaryCard('Enregistrements IG', formatNumber(igTotals.saves), 'Contenus sauvegardés')}
          </div>
          ${ig.error ? '<p style="color:var(--muted);font-size:11px;">' + escapeHtml(ig.error) + '</p>' : ''}
          ${_contentTable(ig.topContent || [], 'instagram')}
        </section>

        <section style="margin-bottom:26px;">
          <div class="section-heading">
            <div><span class="section-kicker">Facebook · historique</span><h2>Anciens posts et vidéos qui ont le mieux marché</h2></div>
            <span class="badge badge--brouillon">${formatNumber(fb.analyzedMedia || 0)} publications analysées</span>
          </div>
          <div class="kpi-strip" style="margin-bottom:14px;">
            ${_summaryCard('Reach analysé FB', formatNumber(fbTotals.reach), 'Sur les publications récupérées')}
            ${_summaryCard('Vues analysées FB', formatNumber(fbTotals.views), 'Sur les publications récupérées')}
            ${_summaryCard('Interactions FB', formatNumber(fbTotals.interactions), 'Réactions + commentaires + partages')}
            ${_summaryCard('Commentaires FB', formatNumber(fbTotals.comments), 'Conversations générées')}
            ${_summaryCard('Partages FB', formatNumber(fbTotals.shares), 'Diffusion organique')}
          </div>
          ${fb.error ? '<p style="color:var(--muted);font-size:11px;">' + escapeHtml(fb.error) + '</p>' : ''}
          ${_contentTable(fb.topContent || [], 'facebook')}
        </section>

        <div style="padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:11px;color:var(--muted);">
          Les métriques restent séparées par plateforme. Les conversions Ads correspondent aux actions renvoyées par Meta. Pour mesurer précisément les formulaires du site, prises de rendez-vous ou inscriptions, il faudra relier le Pixel Meta et/ou la Conversions API avec les événements retenus.
        </div>
      ` : ''}
    `;

    if (_data && _history.length && typeof NidalCharts !== 'undefined') {
      NidalCharts.lineChart('audience-chart-reach', _historySeries(p => p.ads?.summary?.reach));
      NidalCharts.lineChart('audience-chart-clicks', _historySeries(p => p.ads?.summary?.clicks));
      NidalCharts.lineChart('audience-chart-ig', _historySeries(p => (p.instagram?.topContent || []).reduce((s, i) => s + _num(i.metrics?.reach), 0)));
      NidalCharts.lineChart('audience-chart-fb', _historySeries(p => (p.facebook?.topContent || []).reduce((s, i) => s + _num(i.metrics?.reach), 0)));
    }

    const refresh = document.getElementById('audience-refresh-btn');
    if (refresh) refresh.onclick = () => _load(true);

    if (!_data && !_loading && NidalAPI.isOnline()) {
      setTimeout(() => _load(false), 0);
    }
  }

  return { render };
})();