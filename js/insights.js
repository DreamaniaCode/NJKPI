/** Synchronisation des liens publies et lecture des campagnes Meta Ads. */
const InsightsView = (() => {
  let _ads = [];

  function render() {
    const view = document.getElementById('view-insights');
    if (!view) return;
    const online = NidalAPI.isOnline();
    const health = NidalAPI.getHealth();
    const brand = getActiveBrand();
    const contents = NidalStore.getAll();
    const metaReady = brand === 'nidal' ? health?.integrations?.metaNidal : health?.integrations?.metaNidalJunior;
    view.innerHTML = `
      <header class="view__header workspace-header"><div><span class="section-kicker">Donnees vivantes</span><h1 class="view__title">Insights Meta</h1><p class="view__subtitle">Relier les publications finales et suivre les campagnes de ${escapeHtml(getActiveBrandLabel())}</p></div><span class="connection-pill ${online ? (metaReady ? 'connection-pill--ok' : 'connection-pill--pending') : 'connection-pill--off'}">${online ? (metaReady ? 'Meta connecte' : 'Meta en attente d’API') : 'Backend hors ligne'}</span></header>
      <section class="insight-grid">
        <form class="sync-panel" id="sync-form"><div><span class="section-kicker">Publication organique</span><h2>Synchroniser un lien final</h2><p>Choisissez le contenu publie puis collez son lien Facebook ou Instagram.</p></div><div class="form-group"><label for="sync-content">Contenu</label><select id="sync-content" class="form-control">${contents.map(content => `<option value="${content.id}">${escapeHtml(content.titre)}</option>`).join('')}</select></div><div class="form-group"><label for="sync-url">Lien final</label><input type="url" id="sync-url" class="form-control" placeholder="https://www.instagram.com/p/..."></div><button class="btn btn--primary" type="submit" ${online ? '' : 'disabled'}>Recuperer les insights</button><small>${metaReady ? 'Les donnees proviendront de Meta.' : 'Le mode demo generera des donnees de test clairement signalees.'}</small></form>
        <section class="integration-panel"><div><span class="section-kicker">Connexion Coolify</span><h2>Backend et securite</h2></div><div class="integration-status">${_statusLine('API', online)}${_statusLine('PostgreSQL', health?.database?.connected)}${_statusLine(health?.integrations?.aiProvider === 'openrouter' ? 'OpenRouter' : 'IA', Boolean(health?.integrations?.ai || health?.integrations?.openai))}${_statusLine('Meta', metaReady)}</div><button class="btn btn--secondary" id="configure-api">Configurer l’adresse API</button></section>
      </section>
      <section class="ads-section"><div class="section-heading"><div><span class="section-kicker">Campagnes payantes</span><h2>Meta Ads · 30 derniers jours</h2></div><button class="btn btn--secondary" id="sync-ads" ${online ? '' : 'disabled'}>Actualiser les campagnes</button></div><div id="ads-content">${_renderAds()}</div></section>`;
    document.getElementById('sync-form').onsubmit = _syncContent;
    document.getElementById('sync-ads').onclick = _syncAds;
    document.getElementById('configure-api').onclick = _configure;
    if (online && !_ads.length) _loadAds();
  }

  function _statusLine(label, ok) {
    if (label === 'Meta' && !ok) {
      return `<div><span>${label}</span><strong class="status-pending">En attente</strong></div>`;
    }
    return `<div><span>${label}</span><strong class="${ok ? 'status-ok' : 'status-muted'}">${ok ? 'Actif' : 'Non configure'}</strong></div>`;
  }

  async function _syncContent(event) {
    event.preventDefault();
    const id = document.getElementById('sync-content').value;
    const content = NidalStore.getById(id);
    const finalUrl = document.getElementById('sync-url').value.trim() || content.finalUrl;
    if (!finalUrl) return showToast('Ajoutez le lien final', 'error');
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Synchronisation...';
    try {
      await NidalAPI.upsertContent({ ...content, data: content, brand: content.brand });
      const response = await NidalAPI.syncContent(id, { brand: content.brand, finalUrl, platform: content.plateforme, content });
      NidalStore.update(id, { finalUrl, externalMediaId: response.sync.externalMediaId, syncStatus: response.sync.isDemo ? 'demo' : 'connected', lastSyncedAt: new Date().toISOString(), resultats: { ...content.resultats, ...response.sync.metrics } });
      showToast(response.sync.isDemo ? 'Insights de demonstration ajoutes' : 'Insights Meta synchronises', 'success');
      App.navigateTo('performance');
    } catch (error) { showToast(error.message, 'error'); button.disabled = false; button.textContent = 'Recuperer les insights'; }
  }

  async function _loadAds() { try { _ads = await NidalAPI.listAds(getActiveBrand()); if (_ads.length) render(); } catch (error) { console.warn(error); } }
  async function _syncAds() { const button = document.getElementById('sync-ads'); button.disabled = true; button.textContent = 'Actualisation...'; try { _ads = await NidalAPI.syncAds(getActiveBrand()); render(); showToast(_ads.some(item => item.is_demo || item.isDemo) ? 'Campagnes de demonstration chargees' : 'Campagnes Meta actualisees', 'success'); } catch (error) { showToast(error.message, 'error'); button.disabled = false; button.textContent = 'Actualiser les campagnes'; } }

  function _renderAds() {
    if (!_ads.length) return '<div class="empty-inline">Aucune campagne chargee. Utilisez « Actualiser les campagnes ».</div>';
    return `<div class="table-responsive"><table class="data-table"><thead><tr><th>Campagne</th><th>Portee</th><th>Impressions</th><th>Clics</th><th>Depense</th><th>Resultats</th><th>Source</th></tr></thead><tbody>${_ads.map(record => { const data = record.insights || record; const actions = data.actions || []; const result = actions[0]?.value ?? '—'; return `<tr><td><strong>${escapeHtml(record.name || data.campaign_name)}</strong></td><td>${formatNumber(data.reach)}</td><td>${formatNumber(data.impressions)}</td><td>${formatNumber(data.clicks)}</td><td>${data.spend ? `${formatNumber(data.spend)} MAD` : '—'}</td><td>${formatNumber(result)}</td><td><span class="control-badge ${(record.is_demo || data.isDemo) ? 'control--pret' : 'control--conforme'}">${(record.is_demo || data.isDemo) ? 'Demo' : 'Meta'}</span></td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function _configure() {
    const config = NidalAPI.getConfig();
    openModal('Connexion au backend', `<div class="form-group"><label for="api-url">Adresse API Coolify</label><input id="api-url" class="form-control" value="${escapeHtml(config.baseUrl)}" placeholder="Laisser vide si l’API utilise le meme domaine"></div><div class="form-group"><label for="api-token">Jeton d’acces de l’application</label><input type="password" id="api-token" class="form-control" value="${escapeHtml(config.accessToken)}" autocomplete="off"></div><p class="form-help">Ce jeton protege l’application. Les jetons Meta et OpenAI restent uniquement dans les variables d’environnement Coolify.</p>`, { footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="save-api">Enregistrer et recharger</button>`, onOpen: modal => modal.querySelector('#save-api').onclick = () => { NidalAPI.saveConfig({ baseUrl: modal.querySelector('#api-url').value.trim(), accessToken: modal.querySelector('#api-token').value }); location.reload(); } });
  }
  return { render };
})();
