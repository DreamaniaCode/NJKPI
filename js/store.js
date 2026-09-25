/**
 * Nidal Junior - donnees sociales, persistance locale et calcul des KPI.
 */

const NidalStore = (() => {
  const STORAGE_KEY = 'nidal-content-hub-v3';
  const CURRENT_VERSION = 3;
  let _subscribers = [];
  let _data = null;

  const DEFAULT_BRAND_KPI_TARGETS = {
    'nidal-junior': {
      followers: { current: 2450, target: 5000, eta: '2026-12-31', label: 'Followers (Abonnés)', unit: 'abonnés', note: 'Abonnés Instagram Nidal Junior uniquement' },
      views: { current: 18500, target: 50000, eta: '2026-11-30', label: 'Vues (Reels & Vidéos)', unit: 'vues', note: 'Cumul des vues Reels, Stories et vidéos Nounou' },
      comments: { current: 320, target: 1000, eta: '2026-11-30', label: 'Commentaires & Échanges', unit: 'commentaires', note: 'Réponses aux quiz, histoires et publications' },
      conversions: { current: 42, target: 120, eta: '2026-10-31', label: 'Conversions & Inscriptions', unit: 'inscriptions', note: 'Demandes de visite, appels et inscriptions maternelle' },
      reach: { current: 12400, target: 35000, eta: '2026-11-30', label: 'Portée globale (Reach)', unit: 'comptes', note: 'Familles touchées sur la période' },
      interactions: { current: 1450, target: 4000, eta: '2026-11-30', label: 'Interactions totales', unit: 'interactions', note: 'Likes, commentaires, partages et enregistrements' },
      facebookFollowers: { current: 0, target: 0, eta: '', label: 'Followers Facebook', unit: 'abonnés', note: 'Valeur actuelle synchronisée automatiquement depuis la Page Facebook' },
      facebookReach: { current: 0, target: 0, eta: '', label: 'Reach Facebook', unit: 'comptes', note: 'Portée des publications Facebook analysées par Meta' },
      facebookViews: { current: 0, target: 0, eta: '', label: 'Vues Facebook', unit: 'vues', note: 'Vues des publications Facebook analysées par Meta' },
      facebookInteractions: { current: 0, target: 0, eta: '', label: 'Interactions Facebook', unit: 'interactions', note: 'Réactions + commentaires + partages Facebook' },
      facebookComments: { current: 0, target: 0, eta: '', label: 'Commentaires Facebook', unit: 'commentaires', note: 'Commentaires sur les publications Facebook analysées' }
    },
    'nidal': {
      followers: { current: 6800, target: 12000, eta: '2026-12-31', label: 'Followers (Abonnés)', unit: 'abonnés', note: 'Abonnés Instagram Groupe Scolaire Nidal uniquement' },
      views: { current: 45000, target: 100000, eta: '2026-12-15', label: 'Vues (Reels & Vidéos)', unit: 'vues', note: 'Vues cumulées capsules pédagogiques et Reels' },
      comments: { current: 640, target: 2000, eta: '2026-12-15', label: 'Commentaires & Échanges', unit: 'commentaires', note: 'Interactions parents et élèves' },
      conversions: { current: 85, target: 250, eta: '2026-11-15', label: 'Conversions & Inscriptions', unit: 'inscriptions', note: 'Prises de RDV, formulaires gsnidal.ma et inscriptions' },
      reach: { current: 28000, target: 75000, eta: '2026-12-15', label: 'Portée globale (Reach)', unit: 'comptes', note: 'Audience globale touchée' },
      interactions: { current: 3200, target: 8000, eta: '2026-12-15', note: 'Total réactions, commentaires, partages et favoris' },
      facebookFollowers: { current: 0, target: 0, eta: '', label: 'Followers Facebook', unit: 'abonnés', note: 'Valeur actuelle synchronisée automatiquement depuis la Page Facebook' },
      facebookReach: { current: 0, target: 0, eta: '', label: 'Reach Facebook', unit: 'comptes', note: 'Portée des publications Facebook analysées par Meta' },
      facebookViews: { current: 0, target: 0, eta: '', label: 'Vues Facebook', unit: 'vues', note: 'Vues des publications Facebook analysées par Meta' },
      facebookInteractions: { current: 0, target: 0, eta: '', label: 'Interactions Facebook', unit: 'interactions', note: 'Réactions + commentaires + partages Facebook' },
      facebookComments: { current: 0, target: 0, eta: '', label: 'Commentaires Facebook', unit: 'commentaires', note: 'Commentaires sur les publications Facebook analysées' }
    }
  };

  function _defaultData() {
    return {
      version: CURRENT_VERSION,
      contents: [],
      kpiTargets: JSON.parse(JSON.stringify(DEFAULT_BRAND_KPI_TARGETS)),
      socialProfiles: {},
      settings: { theme: 'light' },
      lastModified: new Date().toISOString()
    };
  }

  function _number(value) {
    return value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? null : Number(value);
  }

  function _emptyResults() {
    return { portee: null, reactions: null, commentaires: null, partages: null, enregistrements: null, clics: null, vues: null, conversions: null };
  }

  function _normalize(content = {}) {
    const legacyTypeMap = { article: 'post', interview: 'video', dossier: 'carrousel', breve: 'story', chronique: 'post', infographie: 'carrousel', quiz: 'story' };
    const legacyStatusMap = { 'en-cours': 'en-production', relecture: 'pret' };
    return {
      id: content.id || generateId(),
      brand: BRANDS.some(item => item.id === content.brand) ? content.brand : getActiveBrand(),
      titre: content.titre || 'Sans titre',
      format: CONTENT_TYPES.some(t => t.id === content.format) ? content.format : (CONTENT_TYPES.some(t => t.id === content.type) ? content.type : 'article'),
      statut: STATUSES.some(s => s.id === content.statut) ? content.statut : (STATUSES.some(s => s.id === content.status) ? content.status : 'brouillon'),
      niveau: LEVELS.some(level => level.id === content.niveau) ? content.niveau : 'tous',
      classes: content.classes || 'Toutes les classes',
      album: content.album || '',
      plateforme: content.plateforme || 'Instagram + Facebook',
      pilier: content.pilier || 'Pedagogie',
      objectif: content.objectif || '',
      accroche: content.accroche || content.titre || '',
      message: content.message || content.description || '',
      cta: content.cta || '',
      livrable: content.livrable || '',
      responsable: content.responsable || content.auteur || 'Equipe contenu',
      validation: VALIDATIONS.some(v => v.id === content.validation) ? content.validation : 'a-valider',
      dateCreation: content.dateCreation || new Date().toISOString(),
      datePublication: toISODate(content.datePublication),
      heure: content.heure || '18:30',
      finalUrl: content.finalUrl || '',
      externalMediaId: content.externalMediaId || '',
      syncStatus: content.syncStatus || 'not_connected',
      lastSyncedAt: content.lastSyncedAt || null,
      tags: Array.isArray(content.tags) ? content.tags : [],
      checks: {
        logo: content.checks?.logo ?? true,
        valeurs: content.checks?.valeurs ?? true,
        footer: content.checks?.footer ?? true,
        autorisation: content.checks?.autorisation ?? true
      },
      objectifs: {
        portee: _number(content.objectifs?.portee) ?? 1000,
        vues: _number(content.objectifs?.vues) ?? 1500,
        interactions: _number(content.objectifs?.interactions) ?? 50,
        commentaires: _number(content.objectifs?.commentaires) ?? 15,
        clics: _number(content.objectifs?.clics) ?? 10,
        conversions: _number(content.objectifs?.conversions) ?? 5,
        eta: content.objectifs?.eta || content.datePublication || ''
      },
      resultats: { ..._emptyResults(), ...(content.resultats || {}) },
      notes: content.notes || ''
    };
  }

  function _save() {
    _data.lastModified = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_data)); }
    catch (error) { console.error('Erreur localStorage:', error); showToast('Erreur d’enregistrement des donnees', 'error'); }
    _subscribers.forEach(fn => { try { fn(_data); } catch (error) { console.error('Store subscriber error:', error); } });
  }

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _data = raw ? JSON.parse(raw) : _defaultData();
      _data.settings = _data.settings || { theme: 'light' };
      _data.socialProfiles = _data.socialProfiles || {};
      _data.contents = Array.isArray(_data.contents) ? _data.contents.map(_normalize) : [];
      _data.version = CURRENT_VERSION;
    } catch (error) {
      console.error('Erreur de lecture localStorage:', error);
      _data = _defaultData();
    }
    if (_data.contents.length === 0 && localStorage.getItem('nidal-no-seed') !== 'true') _data.contents = _seedContents().map(_normalize);
    _save();
    return _data;
  }

  function getAll(brand = getActiveBrand()) { return [...(_data?.contents || [])].filter(item => !brand || item.brand === brand).sort((a, b) => (a.datePublication || '9999').localeCompare(b.datePublication || '9999') || a.heure.localeCompare(b.heure)); }
  function getById(id) { return _data?.contents.find(item => item.id === id) || null; }
  function create(content) { const item = _normalize({ brand: getActiveBrand(), ...content }); _data.contents.push(item); _save(); _pushItem(item); return item; }
  function update(id, updates) {
    const index = _data.contents.findIndex(item => item.id === id);
    if (index === -1) return null;
    _data.contents[index] = _normalize({ ..._data.contents[index], ...updates, id });
    _save();
    _pushItem(_data.contents[index]);
    return _data.contents[index];
  }
  function remove(id) { const index = _data.contents.findIndex(item => item.id === id); if (index === -1) return false; _data.contents.splice(index, 1); _save(); if (NidalAPI.isOnline()) NidalAPI.deleteContent(id).catch(error => console.warn('Suppression distante differee:', error.message)); return true; }
  function getSettings() { return { ...(_data?.settings || { theme: 'light' }) }; }
  function updateSettings(updates) { _data.settings = { ..._data.settings, ...updates }; _save(); }
  function exportData() { return JSON.stringify(_data, null, 2); }
  function importData(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.contents)) throw new Error('Format de fichier invalide');
    _data.contents = parsed.contents.map(_normalize);
    _data.settings = { ..._data.settings, ...(parsed.settings || {}) };
    _data.version = CURRENT_VERSION;
    _save();
  }

  function clearMockData() {
    localStorage.setItem('nidal-no-seed', 'true');
    _data.contents = [];
    if (!_data.kpiTargets) _data.kpiTargets = {};
    for (const slug of ['nidal-junior', 'nidal']) {
      const targets = JSON.parse(JSON.stringify(DEFAULT_BRAND_KPI_TARGETS[slug] || {}));
      for (const k of Object.keys(targets)) {
        if (targets[k] && typeof targets[k] === 'object') {
          targets[k].current = 0;
        }
      }
      _data.kpiTargets[slug] = targets;
    }
    _save();
    if (NidalAPI.isOnline()) {
      NidalAPI.request('/api/data/reset', { method: 'DELETE' }).catch(err => console.warn('Reset serveur différé:', err.message));
    }
    return true;
  }

  function reset() {
    return clearMockData();
  }

  function loadDemoData() {
    localStorage.removeItem('nidal-no-seed');
    _data = _defaultData();
    _data.contents = _seedContents().map(_normalize);
    _save();
    return true;
  }

  function hasMockData() {
    if (localStorage.getItem('nidal-no-seed') === 'true') return false;
    return (_data?.contents || []).some(item =>
      item.titre?.includes('Nounou') ||
      item.titre?.includes('livre des histoires') ||
      item.titre?.includes('Progresser avec méthode') ||
      item.titre?.includes('cartable')
    );
  }

  async function syncRemote() {
    if (!NidalAPI.isOnline()) return false;
    const brand = getActiveBrand();
    try {
      const [remoteContents, remoteTargets, liveMeta] = await Promise.all([
        NidalAPI.listContents(brand).catch(() => []),
        NidalAPI.getKpiTargets(brand).catch(() => null),
        NidalAPI.getSocialLive(brand).catch(() => null)
      ]);
      const isCleared = localStorage.getItem('nidal-no-seed') === 'true';
      if (remoteContents && remoteContents.length) {
        if (isCleared && remoteContents.some(r => r.data?.titre?.includes('Nounou') || r.data?.titre?.includes('livre des histoires'))) {
          // Serveur encore sur démo alors que client est réinitialisé
          NidalAPI.request('/api/data/reset', { method: 'DELETE' }).catch(() => {});
        } else if (!isCleared || !remoteContents.some(r => r.data?.titre?.includes('Nounou'))) {
          const mapped = remoteContents.map(record => _normalize({ ...(record.data || {}), id: record.id, brand: record.brand_slug, finalUrl: record.final_url, externalMediaId: record.external_media_id, syncStatus: record.sync_status, lastSyncedAt: record.last_synced_at }));
          _data.contents = [..._data.contents.filter(item => item.brand !== brand), ...mapped];
        }
      } else if (!isCleared && getAll(brand).length > 0) {
        await Promise.all(getAll(brand).map(item => NidalAPI.upsertContent({ ...item, brand, data: item })));
      }
      if (remoteTargets?.targets) {
        if (!_data.kpiTargets) _data.kpiTargets = {};
        _data.kpiTargets[brand] = { ...(_data.kpiTargets[brand] || {}), ...(remoteTargets.targets || {}) };
      }
      if (liveMeta?.ok) {
        if (!_data.socialProfiles) _data.socialProfiles = {};
        _data.socialProfiles[brand] = liveMeta;
      }
      _save();
      return true;
    } catch (error) {
      console.warn('Synchronisation backend indisponible:', error.message);
      return false;
    }
  }

  async function syncMetaLive(brand = getActiveBrand(), refresh = false) {
    if (!NidalAPI.isOnline()) return null;
    const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
    try {
      const live = await NidalAPI.getSocialLive(slug, refresh);
      if (!_data.socialProfiles) _data.socialProfiles = {};
      _data.socialProfiles[slug] = live;
      _save();
      return live;
    } catch (error) {
      console.warn('Synchronisation Meta live différée:', error.message);
      return null;
    }
  }

  function getSocialLive(brand = getActiveBrand()) {
    const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
    return _data?.socialProfiles?.[slug] || null;
  }

  function _pushItem(item) {
    if (!NidalAPI.isOnline()) return;
    NidalAPI.upsertContent({ ...item, brand: item.brand, data: item }).catch(error => console.warn('Sauvegarde distante differee:', error.message));
  }

  function getInteractions(content) {
    const results = content?.resultats || _emptyResults();
    const values = [results.reactions, results.commentaires, results.partages, results.enregistrements].map(_number);
    return values.every(value => value === null) ? null : values.reduce((sum, value) => sum + (value || 0), 0);
  }

  function getEngagement(content) {
    const portee = _number(content?.resultats?.portee);
    const interactions = getInteractions(content);
    return portee && interactions !== null ? interactions / portee : null;
  }

  function getControl(content) {
    const checks = content?.checks || {};
    const complete = ['logo', 'valeurs', 'footer', 'autorisation'].every(key => checks[key] === true);
    if (content?.validation !== 'approuve' || !complete) return 'a-controler';
    return content?.statut === 'publie' ? 'conforme' : 'pret';
  }

  function getKpiTargets(brand = getActiveBrand()) {
    const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const fallback = DEFAULT_BRAND_KPI_TARGETS[slug] || DEFAULT_BRAND_KPI_TARGETS['nidal-junior'];
    const stored = _data?.kpiTargets?.[slug] || fallback;
    const merged = { ...fallback, ...stored };
    const liveMeta = getSocialLive(slug);
    if (liveMeta?.instagram?.source === 'meta-api' && Number.isFinite(Number(liveMeta.instagram.followers))) {
      merged.followers = { ...(merged.followers || fallback.followers), current: Number(liveMeta.instagram.followers), source: 'meta-api', syncedAt: liveMeta.syncedAt || liveMeta.cachedAt || null };
    }

    if (liveMeta?.facebook?.source === 'meta-api') {
      const fb = liveMeta.facebook;
      const fbInsights = fb.insights || {};
      const syncedAt = liveMeta.syncedAt || liveMeta.cachedAt || null;

      if (Number.isFinite(Number(fb.followers))) {
        merged.facebookFollowers = { ...(merged.facebookFollowers || fallback.facebookFollowers), current: Number(fb.followers), source: 'meta-api', syncedAt };
      }
      if (Number.isFinite(Number(fbInsights.reach))) {
        merged.facebookReach = { ...(merged.facebookReach || fallback.facebookReach), current: Number(fbInsights.reach), source: 'meta-api', syncedAt };
      }
      if (Number.isFinite(Number(fbInsights.views))) {
        merged.facebookViews = { ...(merged.facebookViews || fallback.facebookViews), current: Number(fbInsights.views), source: 'meta-api', syncedAt };
      }
      if (Number.isFinite(Number(fbInsights.interactions))) {
        merged.facebookInteractions = { ...(merged.facebookInteractions || fallback.facebookInteractions), current: Number(fbInsights.interactions), source: 'meta-api', syncedAt };
      }
      if (Number.isFinite(Number(fbInsights.comments))) {
        merged.facebookComments = { ...(merged.facebookComments || fallback.facebookComments), current: Number(fbInsights.comments), source: 'meta-api', syncedAt };
      }
    }

    // Calculate actual aggregates from contents
    const contents = getAll(slug);
    const sumViews = contents.reduce((sum, c) => sum + (_number(c.resultats?.vues) || 0), 0);
    const sumComments = contents.reduce((sum, c) => sum + (_number(c.resultats?.commentaires) || 0), 0);
    const sumConversions = contents.reduce((sum, c) => sum + (_number(c.resultats?.conversions) || 0), 0);
    const sumReach = contents.reduce((sum, c) => sum + (_number(c.resultats?.portee) || 0), 0);
    const sumInteractions = contents.reduce((sum, c) => sum + (getInteractions(c) || 0), 0);

    const enrich = (key, metric) => {
      const cur = _number(metric.current) ?? 0;
      const tgt = _number(metric.target) ?? 1;
      const ratio = tgt > 0 ? cur / tgt : 0;
      const eta = metric.eta || '';
      const etaInfo = getEtaInfo(eta, ratio);
      return {
        ...metric,
        key,
        current: cur,
        target: tgt,
        ratio,
        pct: Math.round(ratio * 100),
        remaining: Math.max(0, tgt - cur),
        etaInfo
      };
    };

    return {
      brand: slug,
      followers: enrich('followers', merged.followers || fallback.followers),
      views: enrich('views', merged.views || fallback.views),
      comments: enrich('comments', merged.comments || fallback.comments),
      conversions: enrich('conversions', merged.conversions || fallback.conversions),
      reach: enrich('reach', merged.reach || fallback.reach),
      interactions: enrich('interactions', merged.interactions || fallback.interactions),
      facebookFollowers: enrich('facebookFollowers', merged.facebookFollowers || fallback.facebookFollowers),
      facebookReach: enrich('facebookReach', merged.facebookReach || fallback.facebookReach),
      facebookViews: enrich('facebookViews', merged.facebookViews || fallback.facebookViews),
      facebookInteractions: enrich('facebookInteractions', merged.facebookInteractions || fallback.facebookInteractions),
      facebookComments: enrich('facebookComments', merged.facebookComments || fallback.facebookComments),
      contentTotals: {
        views: sumViews,
        comments: sumComments,
        conversions: sumConversions,
        reach: sumReach,
        interactions: sumInteractions
      }
    };
  }

  function updateKpiTargets(newTargets, brand = getActiveBrand()) {
    const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
    if (!_data.kpiTargets) _data.kpiTargets = {};
    _data.kpiTargets[slug] = {
      ...(DEFAULT_BRAND_KPI_TARGETS[slug] || {}),
      ...(_data.kpiTargets[slug] || {}),
      ...newTargets
    };
    _save();
    if (NidalAPI.isOnline()) {
      NidalAPI.saveKpiTargets(slug, _data.kpiTargets[slug]).catch(err => console.warn('Sauvegarde distante KPI différée:', err.message));
    }
    return getKpiTargets(slug);
  }

  function getEtaInfo(etaDate, progressRatio = 0) {
    if (!etaDate) {
      return {
        formattedDate: 'Date à définir',
        daysLeft: null,
        status: 'none',
        label: 'Échéance à définir',
        badgeClass: 'eta-badge--muted',
        isAchieved: progressRatio >= 1,
        isOverdue: false
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${etaDate}T00:00:00`);
    const diffTime = target.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = formatDate(etaDate, 'compact');

    if (progressRatio >= 1) {
      return {
        formattedDate,
        daysLeft,
        status: 'done',
        label: '✓ Objectif atteint !',
        badgeClass: 'eta-badge--done',
        isAchieved: true,
        isOverdue: false
      };
    }

    if (daysLeft < 0) {
      return {
        formattedDate,
        daysLeft,
        status: 'overdue',
        label: `Dépassé de ${Math.abs(daysLeft)} j · ${formattedDate}`,
        badgeClass: 'eta-badge--overdue',
        isAchieved: false,
        isOverdue: true
      };
    }

    if (daysLeft === 0) {
      return {
        formattedDate,
        daysLeft,
        status: 'today',
        label: `Échéance aujourd’hui !`,
        badgeClass: 'eta-badge--urgent',
        isAchieved: false,
        isOverdue: false
      };
    }

    if (daysLeft <= 14) {
      return {
        formattedDate,
        daysLeft,
        status: 'urgent',
        label: `J-${daysLeft} (${daysLeft} j) · ${formattedDate}`,
        badgeClass: 'eta-badge--urgent',
        isAchieved: false,
        isOverdue: false
      };
    }

    return {
      formattedDate,
      daysLeft,
      status: 'ok',
      label: `J-${daysLeft} (${daysLeft} j) · ${formattedDate}`,
      badgeClass: 'eta-badge--ok',
      isAchieved: false,
      isOverdue: false
    };
  }

  function getStats() {
    const contents = getAll();
    const byStatus = Object.fromEntries(STATUSES.map(status => [status.id, 0]));
    const byFormat = Object.fromEntries(CONTENT_TYPES.map(type => [type.id, 0]));
    const byLevel = Object.fromEntries(LEVELS.map(level => [level.id, 0]));
    contents.forEach(content => {
      if (byStatus[content.statut] !== undefined) byStatus[content.statut]++;
      if (byFormat[content.format] !== undefined) byFormat[content.format]++;
      if (byLevel[content.niveau] !== undefined) byLevel[content.niveau]++;
    });
    const published = byStatus.publie || 0;
    const ready = byStatus.pret || 0;
    const reachItems = contents.filter(content => _number(content.resultats?.portee) !== null);
    const totalReach = reachItems.length ? reachItems.reduce((sum, content) => sum + _number(content.resultats.portee), 0) : null;
    const totalInteractions = reachItems.length ? reachItems.reduce((sum, content) => sum + (getInteractions(content) || 0), 0) : null;
    const totalClicks = contents.some(content => _number(content.resultats?.clics) !== null)
      ? contents.reduce((sum, content) => sum + (_number(content.resultats?.clics) || 0), 0) : null;
    const totalViews = contents.some(content => _number(content.resultats?.vues) !== null)
      ? contents.reduce((sum, content) => sum + (_number(content.resultats?.vues) || 0), 0) : null;
    const totalComments = contents.some(content => _number(content.resultats?.commentaires) !== null)
      ? contents.reduce((sum, content) => sum + (_number(content.resultats?.commentaires) || 0), 0) : null;
    const totalConversions = contents.some(content => _number(content.resultats?.conversions) !== null)
      ? contents.reduce((sum, content) => sum + (_number(content.resultats?.conversions) || 0), 0) : null;

    return {
      total: contents.length,
      published,
      ready,
      inProduction: byStatus['en-production'] || 0,
      completion: contents.length ? published / contents.length : 0,
      controls: contents.filter(content => getControl(content) === 'a-controler').length,
      totalReach,
      totalViews,
      totalComments,
      totalConversions,
      totalInteractions,
      engagement: totalReach ? totalInteractions / totalReach : null,
      totalClicks,
      byStatus,
      byFormat,
      byLevel
    };
  }

  function subscribe(fn) { _subscribers.push(fn); return () => { _subscribers = _subscribers.filter(item => item !== fn); }; }

  function _seedContents() {
    const base = { brand: 'nidal-junior', responsable: 'Equipe contenu', plateforme: 'Instagram + Facebook', validation: 'a-valider', checks: { logo: true, valeurs: true, footer: true, autorisation: true } };
    const nidal = { ...base, brand: 'nidal', classes: 'Tous les cycles', album: '', plateforme: 'Instagram + Facebook' };
    return [
      { ...base, titre: 'Qui va ouvrir le livre des histoires ?', format: 'story', statut: 'brouillon', niveau: 'tous', classes: 'Toutes les classes', album: 'Le jardin des histoires', pilier: 'Notoriete', objectif: 'Creer l’attente', message: 'Une silhouette, un livre jaune et un nouveau rendez-vous arrivent chez Nidal Junior.', cta: 'Repondez a la devinette', livrable: 'Story teaser de Nounou', datePublication: '2026-09-21', heure: '18:30', objectifs: { portee: 800, interactions: 40, clics: 5 } },
      { ...base, titre: 'Voici Nounou, le petit guide de Nidal Junior', format: 'post', statut: 'pret', niveau: 'tous', classes: 'Toutes les classes', album: 'Presentation de Nounou', pilier: 'Identite', objectif: 'Presenter le personnage', message: 'Nounou accompagne les enfants dans les histoires, les decouvertes et les activites de la maternelle.', cta: 'Souhaitez-lui la bienvenue', livrable: 'Avatar officiel de Nounou', datePublication: '2026-09-22', heure: '18:30', validation: 'approuve', objectifs: { portee: 1500, interactions: 90, clics: 10 } },
      { ...base, titre: 'Coucou ! Moi, c’est Nounou', format: 'video', statut: 'en-production', niveau: 'tous', classes: 'Toutes les classes', album: 'Premiere prise de parole', pilier: 'Engagement', objectif: 'Faire connaitre la voix de Nounou', message: 'Nounou se presente et invite les familles a lire, imaginer, apprendre et grandir avec lui.', cta: 'Suivez sa premiere aventure', livrable: 'Video verticale', datePublication: '2026-09-23', heure: '19:00', objectifs: { portee: 2500, interactions: 160, clics: 20 } },
      { ...base, titre: 'Trois classes, trois couleurs, mille premieres decouvertes', format: 'carrousel', statut: 'planifie', niveau: 'petite-section', classes: 'Coccinelles, Poussins, Chenilles', album: 'Belle, Antonin et Camille', pilier: 'Pedagogie', objectif: 'Valoriser les petites sections', message: 'Belle observe les couleurs, Antonin explore les sons et Camille avance pas a pas.', cta: 'Quel univers prefere votre enfant ?', livrable: 'Carrousel de 4 pages', datePublication: '2026-09-24', heure: '18:30', checks: { logo: true, valeurs: true, footer: true, autorisation: false }, objectifs: { portee: 1800, interactions: 110, clics: 12 } },
      { ...base, titre: 'Grandir, c’est aussi apprivoiser ses petites peurs', format: 'carrousel', statut: 'planifie', niveau: 'moyenne-section', classes: 'Oursons, Ecureuils, Abeilles', album: 'Ourson le terrible, Sam Ecureuil, Mireille l’abeille', pilier: 'Confiance', objectif: 'Valoriser les apprentissages socio-emotionnels', message: 'Les Oursons nomment leurs emotions, les Ecureuils relevent un defi et les Abeilles apprennent a cooperer.', cta: 'Encouragez-les en commentaire', livrable: 'Carrousel de 4 pages', datePublication: '2026-09-25', heure: '18:30', checks: { logo: true, valeurs: true, footer: true, autorisation: false }, objectifs: { portee: 1800, interactions: 120, clics: 12 } },
      { ...base, titre: 'Une image, quelques mots et l’imagination prend son envol', format: 'video', statut: 'planifie', niveau: 'grande-section', classes: 'Papillons, Lapins, Chatons', album: 'Simeon, Adrien et Bonne nuit mon chaton', pilier: 'Expression', objectif: 'Mettre en valeur le langage et l’imagination', message: 'Les Papillons inventent une fin, les Lapins racontent une scene et les Chatons jouent avec les mots doux.', cta: 'Inventez une fin avec votre enfant', livrable: 'Video courte avec Nounou', datePublication: '2026-09-26', heure: '11:00', checks: { logo: true, valeurs: true, footer: true, autorisation: false }, objectifs: { portee: 2400, interactions: 150, clics: 18 } },
      { ...base, titre: 'Ce soir, quel personnage racontera l’histoire ?', format: 'story', statut: 'planifie', niveau: 'familles', classes: 'Toutes les classes', album: 'Le rituel de lecture', pilier: 'Communaute', objectif: 'Prolonger l’apprentissage a la maison', message: 'Nounou propose de choisir un album, observer la couverture puis raconter son moment prefere.', cta: 'Partagez le choix de votre enfant', livrable: 'Story interactive', datePublication: '2026-09-27', heure: '17:00', objectifs: { portee: 1200, interactions: 80, clics: 8 } },
      { ...nidal, titre: 'Une semaine pour progresser avec methode', format: 'story', statut: 'pret', niveau: 'tous', pilier: 'Methode', objectif: 'Lancer le theme de la semaine', message: 'Une organisation simple permet de commencer la semaine avec clarte et confiance.', cta: 'Quel est votre objectif cette semaine ?', livrable: 'Story interactive', datePublication: '2026-09-21', heure: '19:00', validation: 'approuve', objectifs: { portee: 1800, interactions: 95, clics: 8 } },
      { ...nidal, titre: 'Preparer son cartable sans rien oublier', format: 'carrousel', statut: 'planifie', niveau: 'tous', pilier: 'Organisation', objectif: 'Partager un conseil pratique', message: 'Une courte checklist pour gagner du temps et commencer la journee sereinement.', cta: 'Enregistrez la checklist', livrable: 'Carrousel pratique', datePublication: '2026-09-22', heure: '19:00', objectifs: { portee: 2300, interactions: 160, clics: 12 } },
      { ...nidal, titre: 'La methode 3-2-1 pour reviser efficacement', format: 'video', statut: 'en-production', niveau: 'tous', pilier: 'Apprentissage', objectif: 'Faire connaitre une methode de revision', message: 'Trois minutes pour ecrire, deux minutes pour verifier et une minute pour reformuler.', cta: 'Testez la methode ce soir', livrable: 'Reel pedagogique', datePublication: '2026-09-23', heure: '19:00', objectifs: { portee: 3200, interactions: 210, clics: 22 } },
      { ...nidal, titre: 'La confiance se construit pas a pas', format: 'post', statut: 'planifie', niveau: 'tous', pilier: 'Confiance', objectif: 'Valoriser les efforts', message: 'Chaque effort regulier rapproche l’eleve de son objectif.', cta: 'Partagez un progres dont vous etes fier', livrable: 'Post citation', datePublication: '2026-09-24', heure: '19:00', objectifs: { portee: 1900, interactions: 105, clics: 8 } },
      { ...nidal, titre: 'Petit effort aujourd’hui, grands resultats demain', format: 'story', statut: 'planifie', niveau: 'tous', pilier: 'Progres', objectif: 'Encourager la regularite', message: 'Un rappel simple pour terminer la semaine avec motivation.', cta: 'Choisissez votre petit effort du jour', livrable: 'Story motivation', datePublication: '2026-09-25', heure: '18:30', objectifs: { portee: 1500, interactions: 80, clics: 6 } },
      { ...nidal, titre: 'Parents : accompagner sans faire a la place', format: 'carrousel', statut: 'planifie', niveau: 'familles', pilier: 'Parentalite', objectif: 'Donner des reperes aux parents', message: 'Questionner, encourager et laisser l’eleve expliquer sa demarche.', cta: 'Enregistrez ces trois reperes', livrable: 'Carrousel parents', datePublication: '2026-09-26', heure: '11:00', objectifs: { portee: 2500, interactions: 180, clics: 15 } },
      { ...nidal, titre: 'Preparer la semaine en dix minutes', format: 'post', statut: 'planifie', niveau: 'familles', pilier: 'Organisation', objectif: 'Installer un rituel familial', message: 'Verifier l’emploi du temps, fixer trois priorites et preparer le materiel essentiel.', cta: 'Preparez votre semaine avec nous', livrable: 'Post pratique', datePublication: '2026-09-27', heure: '17:00', objectifs: { portee: 1800, interactions: 120, clics: 10 } }
    ];
  }

  return {
    init, getAll, getById, create, update, remove,
    getSettings, updateSettings, exportData, importData,
    reset, clearMockData, loadDemoData, hasMockData, syncRemote, syncMetaLive, getSocialLive,
    getInteractions, getEngagement, getControl, getStats, subscribe,
    getKpiTargets, updateKpiTargets, getEtaInfo
  };
})();
