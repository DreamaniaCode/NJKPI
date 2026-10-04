const ReportsDataView = (() => {
  let grid, brand, dataset = 'kpi', ads = [], error = '', loaded = false;
  function render() {
    if (brand !== getActiveBrand()) { brand = getActiveBrand(); grid = null; ads = []; error = ''; loaded = false; }
    document.getElementById('view-report-data').innerHTML = `<header class="view__header"><div><span class="section-kicker">Rapports & données</span><h1 class="view__title">Données réutilisables</h1><p class="view__subtitle">Filtrez, sélectionnez, triez et exportez les lignes utiles.</p></div></header><label class="form-group">Jeu de données<select id="report-dataset" class="form-control">${[['kpi','Indicateurs KPI'],['ads','Campagnes Meta Ads'],['contents','Contenus et résultats']].map(([value,label]) => `<option value="${value}" ${dataset === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}<div id="report-grid"></div>`;
    document.getElementById('report-dataset').onchange = event => { dataset = event.target.value; grid = null; render(); };
    let fields, rows, filters = [];
    if (dataset === 'kpi') {
      fields = [['name','Indicateur'],['current','Valeur actuelle'],['target','Objectif'],['eta','Échéance'],['note','Périmètre / source']];
      rows = Object.entries(NidalStore.getKpiTargets()).filter(([,v]) => v && typeof v === 'object' && 'current' in v).map(([id,v]) => ({id,name:v.label || id,current:v.current,target:v.target,eta:v.eta,note:v.note}));
    } else if (dataset === 'ads') {
      fields = [['name','Campagne'],['reach','Portée'],['impressions','Impressions'],['clicks','Clics'],['spend','Dépense'],['leads','Leads'],['updated','Actualisation'],['source','Source']];
      rows = ads.map(record => { const d = record.insights || record; return {id:record.external_id || d.campaign_id,name:record.name || d.campaign_name,reach:Number(d.reach || 0),impressions:Number(d.impressions || 0),clicks:Number(d.clicks || 0),spend:Number(d.spend || 0),leads:Number(d.actions?.find(a => a.action_type === 'lead')?.value || 0),updated:record.last_synced_at,source:record.is_demo || d.isDemo ? 'Démo' : 'Meta'}; });
      if (!loaded && NidalAPI.isOnline()) { loaded = true; const requested = brand; NidalAPI.listAds(brand).then(result => { if (brand !== requested) return; ads = result; if (location.hash === '#report-data') render(); }).catch(e => { if (brand === requested) { error = e.message; if (location.hash === '#report-data') render(); } }); }
    } else {
      fields = [['date','Date'],['name','Titre'],['status','Statut'],['platform','Plateforme'],['format','Format'],['reach','Portée'],['views','Vues'],['interactions','Interactions'],['message','Texte'],['url','Lien final']];
      filters = [{key:'status',label:'Statut'},{key:'platform',label:'Plateforme'}];
      rows = NidalStore.getAll().map(c => ({id:c.id,date:c.datePublication,name:c.titre,status:c.statut,platform:c.plateforme,format:c.format,reach:c.resultats?.portee,views:c.resultats?.vues,interactions:NidalStore.getInteractions(c),message:c.message,url:c.finalUrl}));
    }
    fields.push(['id','Identifiant']);
    if (!grid) grid = NidalDataGrid.create({id:'report-grid',title:`${getActiveBrandLabel()} ${dataset}`,columns:fields.map(([key,label]) => ({key,label})),filters});
    grid.setRows(rows);
  }
  return {render,setDataset(value) { if (['kpi','ads','contents'].includes(value)) { dataset = value; grid = null; } }};
})();
