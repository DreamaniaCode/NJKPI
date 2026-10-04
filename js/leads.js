/** Leads restent côté serveur : aucune copie dans localStorage. */
const LeadsView = (() => {
  let _brand = null, _rows = [], _status = null, _error = '', _loading = false;
  let _search = '', _campaign = '';
  let _loaded = false;
  const field = (row, name) => row.field_data?.find(item => item.name === name)?.values?.join(', ') || '';

  function render() {
    const brand = getActiveBrand();
    if (_brand !== brand) {
      _brand = brand; _rows = []; _status = null; _error = ''; _search = ''; _campaign = ''; _loading = false; _loaded = false;
    }
    if (!_loaded && NidalAPI.isOnline()) { _loaded = true; refresh(); }
    const panel = document.getElementById('view-leads');
    const campaigns = [...new Set(_rows.map(row => row.campaign_name).filter(Boolean))];
    panel.innerHTML = `<header class="view__header workspace-header"><div><span class="section-kicker">Formulaires instantanés Meta</span><h1 class="view__title">Leads Ads</h1><p class="view__subtitle">Contacts des campagnes de ${escapeHtml(getActiveBrandLabel())}</p></div><button class="btn btn--secondary" id="leads-sync" ${_loading || !NidalAPI.isOnline() ? 'disabled' : ''}>${_loading ? 'Chargement…' : 'Synchroniser maintenant'}</button></header>
      <p>${!NidalAPI.isOnline() ? 'Backend hors ligne.' : _status?.demo ? 'Mode démonstration : aucun contact réel récupéré.' : _status?.automatic ? `Synchronisation automatique toutes les ${_status.intervalMinutes} minutes.` : 'Synchronisation automatique désactivée.'}
      ${_status?.lastSyncedAt ? `Dernière synchronisation complète : ${escapeHtml(new Date(_status.lastSyncedAt).toLocaleString('fr-FR'))}.` : ''}</p>
      ${_error ? `<p role="alert" class="status-muted">${escapeHtml(_error)}</p>` : ''}
      ${_status?.errors?.length ? `<p role="alert">${_status.errors.map(escapeHtml).join('<br>')}</p>` : ''}
      <section class="sync-panel"><div class="form-group"><label for="leads-search">Rechercher un contact</label><input class="form-control" id="leads-search" value="${escapeHtml(_search)}" placeholder="Nom, téléphone, email…"></div><div class="form-group"><label for="leads-campaign">Campagne</label><select class="form-control" id="leads-campaign"><option value="">Toutes les campagnes</option>${campaigns.map(name => `<option ${name === _campaign ? 'selected' : ''} value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select></div><div id="leads-table"></div></section>`;
    document.getElementById('leads-search').oninput = event => { _search = event.target.value; table(); };
    document.getElementById('leads-campaign').onchange = event => { _campaign = event.target.value; table(); };
    document.getElementById('leads-sync').onclick = () => refresh(true);
    table();
  }

  function table() {
    const rows = _rows.filter(row => (!_campaign || row.campaign_name === _campaign) && JSON.stringify(row).toLocaleLowerCase('fr').includes(_search.toLocaleLowerCase('fr')));
    const target = document.getElementById('leads-table');
    target.innerHTML = `<p>${rows.length} contact(s)</p>${rows.length ? `<div class="table-responsive"><table class="data-table"><thead><tr><th>Date</th><th>Nom</th><th>Téléphone</th><th>Email</th><th>Campagne / annonce</th><th>Formulaire et réponses</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(new Date(row.created_time).toLocaleString('fr-FR'))}</td><td>${escapeHtml(field(row, 'full_name') || [field(row, 'first_name'), field(row, 'last_name')].filter(Boolean).join(' ') || '—')}</td><td>${escapeHtml(field(row, 'phone_number') || '—')}</td><td>${escapeHtml(field(row, 'email') || '—')}</td><td>${escapeHtml(row.campaign_name || row.campaign_id || 'Campagne non fournie')}<br><small>${escapeHtml(row.ad_name || row.ad_id || '')}</small></td><td>${escapeHtml(row.form_name || row.form_id)}<details><summary>Toutes les réponses</summary>${(row.field_data || []).map(item => `<p><strong>${escapeHtml(item.name)}</strong> : ${escapeHtml((item.values || []).join(', '))}</p>`).join('')}</details></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-inline">${_loading ? 'Chargement des contacts…' : _rows.length ? 'Aucun contact ne correspond aux filtres.' : 'Aucun lead chargé. Configurez la Page Meta et un jeton autorisé à récupérer les leads, puis synchronisez.'}</div>`}`;
  }

  async function refresh(sync = false) {
    if (_loading || !NidalAPI.isOnline()) return;
    const brand = getActiveBrand(); _loading = true;
    try {
      if (sync) await NidalAPI.request('/api/meta/sync', { method: 'POST', body: JSON.stringify({ brand }) });
      const [rows, status] = await Promise.all([NidalAPI.request(`/api/leads?brand=${brand}`), NidalAPI.request(`/api/meta/status?brand=${brand}`)]);
      if (brand !== getActiveBrand()) return;
      _rows = rows; _status = status; _error = '';
      if (sync) await NidalStore.syncRemote();
    } catch (error) { if (brand === getActiveBrand()) _error = error.message; }
    finally { if (brand === getActiveBrand()) { _loading = false; if (location.hash === '#leads') render(); } }
  }
  return { render, refresh };
})();
