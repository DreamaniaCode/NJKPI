/** Leads restent côté serveur : aucune copie dans localStorage. */
const LeadsView = (() => {
  let _brand = null, _rows = [], _status = null, _error = '', _loading = false;
  let _loaded = false;
  let _grid = null;
  const _expanded = new Set();
  const STATUSES = ['RDV', 'Refus', 'Reporté', 'En attente'];
  const statusClass = status => ({ RDV:'rdv', Refus:'refus', 'Reporté':'reporte', 'En attente':'attente' }[status] || 'attente');
  const field = (row, name) => row.field_data?.find(item => item.name === name)?.values?.join(', ') || '';

  function render() {
    const brand = getActiveBrand();
    if (_brand !== brand) {
      _brand = brand; _rows = []; _status = null; _error = ''; _loading = false; _loaded = false; _grid = null; _expanded.clear();
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
    const columns = [['name','Nom'],['phone','Téléphone'],['email','Email'],['status','État']].map(([key,label]) => ({key,label}));
    columns.push({key:'details',label:'Autres informations',export:false});
    [['created_time','Date'],['campaign','Campagne'],['ad','Annonce'],['form','Formulaire'],['id','Identifiant Meta']].forEach(([key,label]) => columns.push({key,label,display:false}));
    answerNames.forEach((name,index) => columns.push({key:'answer_' + index,label:'Réponse : ' + name,display:false}));
    if (!_grid) _grid = NidalDataGrid.create({id:'leads-table',title:getActiveBrandLabel() + ' leads',columns,filters:[{key:'status',label:'État',options:STATUSES},{key:'campaign',label:'Campagne'},{key:'form',label:'Formulaire'}],renderCell,onRowsRendered:bindStatuses});
    const rows = _rows.map(row => ({id:String(row.id),status:row.workflow_status || 'En attente',created_time:row.created_time,name:field(row,'full_name') || [field(row,'first_name'),field(row,'last_name')].filter(Boolean).join(' '),phone:field(row,'phone_number'),email:field(row,'email'),campaign:row.campaign_name || row.campaign_id || '',ad:row.ad_name || row.ad_id || '',form:row.form_name || row.form_id || '',...Object.fromEntries(answerNames.map((name,index) => ['answer_' + index,field(row,name)]))}));
    _grid.setRows(rows,columns);
  }

  function renderCell(row,column) {
    const value = row[column.key];
    if (column.key === 'name') return `<strong class="lead-name">${escapeHtml(value || 'Nom non renseigné')}</strong>`;
    if (column.key === 'phone') return value ? `<a class="lead-contact" href="tel:${escapeHtml(value.replace(/[^\d+]/g,''))}">${escapeHtml(value)}</a>` : '<span class="lead-missing">Non renseigné</span>';
    if (column.key === 'email') return value ? `<a class="lead-contact" href="mailto:${encodeURIComponent(value)}">${escapeHtml(value)}</a>` : '<span class="lead-missing">Non renseigné</span>';
    if (column.key === 'status') {
      const editable = typeof NidalAuth === 'undefined' || !NidalAuth.isAuthEnabled() || NidalAuth.canEdit();
      return editable ? `<select class="lead-status lead-status--${statusClass(value)}" data-lead-status="${escapeHtml(row.id)}" aria-label="État de ${escapeHtml(row.name || 'ce contact')}">${STATUSES.map(status => `<option value="${status}" ${status === value ? 'selected' : ''}>${status}</option>`).join('')}</select>` : `<span class="lead-status lead-status--${statusClass(value)}">${escapeHtml(value)}</span>`;
    }
    if (column.key === 'details') {
      const original = _rows.find(item => String(item.id) === row.id);
      const extras = (original?.field_data || []).filter(item => !['full_name','first_name','last_name','phone_number','email'].includes(item.name));
      const details = [['Date',row.created_time ? new Date(row.created_time).toLocaleString('fr-FR') : '—'],['Campagne',row.campaign],['Annonce',row.ad],['Formulaire',row.form],['Identifiant Meta',row.id],...extras.map(item => [item.name,(item.values || []).join(', ')])];
      return `<details class="lead-details" data-lead-details="${escapeHtml(row.id)}" ${_expanded.has(row.id) ? 'open' : ''}><summary>Voir les autres informations</summary><dl>${details.map(([label,text]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text || '—')}</dd></div>`).join('')}</dl></details>`;
    }
    return escapeHtml(String(value ?? ''));
  }

  function bindStatuses(host) {
    host.querySelectorAll('[data-lead-details]').forEach(details => details.ontoggle = () => { details.open ? _expanded.add(details.dataset.leadDetails) : _expanded.delete(details.dataset.leadDetails); });
    host.querySelectorAll('[data-lead-status]').forEach(select => select.onchange = async () => {
      const brand = getActiveBrand(), id = select.dataset.leadStatus;
      const previous = _rows.find(row => String(row.id) === id)?.workflow_status || 'En attente';
      select.disabled = true;
      try {
        const updated = await NidalAPI.request(`/api/leads/${encodeURIComponent(id)}/status`, {method:'PUT',body:JSON.stringify({brand,status:select.value})});
        if (brand !== getActiveBrand()) return;
        _rows = _rows.map(row => String(row.id) === id ? updated : row);
        table(); showToast('État du contact enregistré', 'success');
      } catch (error) { select.value = previous; showToast(error.message,'error'); }
      finally { select.disabled = false; }
    });
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
