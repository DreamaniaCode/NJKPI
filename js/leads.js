/** Leads restent côté serveur : aucune copie dans localStorage. */
const LeadsView = (() => {
  let _brand = null, _rows = [], _status = null, _error = '', _loading = false;
  let _loaded = false;
  let _grid = null;
  const field = (row, name) => row.field_data?.find(item => item.name === name)?.values?.join(', ') || '';

  function render() {
    const brand = getActiveBrand();
    if (_brand !== brand) {
      _brand = brand; _rows = []; _status = null; _error = ''; _loading = false; _loaded = false; _grid = null;
    }
    if (!_loaded && NidalAPI.isOnline()) { _loaded = true; refresh(); }
    const panel = document.getElementById('view-leads');
    panel.innerHTML = `<header class="view__header workspace-header"><div><span class="section-kicker">Formulaires instantanés Meta</span><h1 class="view__title">Leads Ads</h1><p class="view__subtitle">Contacts des campagnes de ${escapeHtml(getActiveBrandLabel())}</p></div><button class="btn btn--secondary" id="leads-sync" ${_loading || !NidalAPI.isOnline() ? 'disabled' : ''}>${_loading ? 'Chargement…' : 'Synchroniser maintenant'}</button></header>
      <p>${!NidalAPI.isOnline() ? 'Backend hors ligne.' : _status?.demo ? 'Mode démonstration : aucun contact réel récupéré.' : _status?.automatic ? `Synchronisation automatique toutes les ${_status.intervalMinutes} minutes.` : 'Synchronisation automatique désactivée.'}
      ${_status?.leads?.lastSyncedAt ? `Dernière récupération des leads : ${escapeHtml(new Date(_status.leads.lastSyncedAt).toLocaleString('fr-FR'))}.` : ''}</p>
      ${_error ? `<p role="alert" class="status-muted">${escapeHtml(_error)}</p>` : ''}
      ${_status?.leads?.error ? `<p role="alert"><strong>Récupération des leads bloquée :</strong> ${escapeHtml(_status.leads.error)}<br>Vérifiez l’accès à la Page et l’autorisation leads_retrieval dans Meta Business.</p>` : ''}
      ${_status?.errors?.filter(error => !error.startsWith('Leads :')).length ? `<details><summary>Erreurs des autres synchronisations Meta</summary><p>${_status.errors.filter(error => !error.startsWith('Leads :')).map(escapeHtml).join('<br>')}</p></details>` : ''}
      <section class="sync-panel"><div id="leads-table"></div></section>`;
    document.getElementById('leads-sync').onclick = () => refresh(true);
    table();
  }

  function table() {
    const answerNames = [...new Set(_rows.flatMap(row => (row.field_data || []).map(item => item.name)))];
    const columns = [['created_time','Date'],['name','Nom'],['phone','Téléphone'],['email','Email'],['campaign','Campagne'],['ad','Annonce'],['form','Formulaire'],['id','Identifiant Meta']].map(([key,label]) => ({key,label}));
    answerNames.forEach((name,index) => columns.push({key:'answer_' + index,label:'Réponse : ' + name}));
    if (!_grid) _grid = NidalDataGrid.create({id:'leads-table',title:getActiveBrandLabel() + ' leads',columns,filters:[{key:'campaign',label:'Campagne'},{key:'form',label:'Formulaire'}]});
    const rows = _rows.map(row => ({id:String(row.id),created_time:row.created_time,name:field(row,'full_name') || [field(row,'first_name'),field(row,'last_name')].filter(Boolean).join(' '),phone:field(row,'phone_number'),email:field(row,'email'),campaign:row.campaign_name || row.campaign_id || '',ad:row.ad_name || row.ad_id || '',form:row.form_name || row.form_id || '',...Object.fromEntries(answerNames.map((name,index) => ['answer_' + index,field(row,name)]))}));
    _grid.setRows(rows,columns);
  }

  async function refresh(sync = false) {
    if (_loading || !NidalAPI.isOnline()) return;
    const brand = getActiveBrand(); _loading = true;
    if (sync) render();
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
