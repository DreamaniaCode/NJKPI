/**
 * Nidal Junior — Pilotage éditorial
 * Couche de persistance localStorage avec réactivité et gestion des KPIs
 */

const NidalStore = (() => {
  const STORAGE_KEY = 'nidal-junior-data';
  const CURRENT_VERSION = 1;
  let _subscribers = [];
  let _data = null;

  function _defaultData() {
    return {
      version: CURRENT_VERSION,
      contents: [],
      settings: { theme: 'light' },
      lastModified: new Date().toISOString()
    };
  }

  function _save() {
    _data.lastModified = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (e) {
      console.error('Erreur localStorage:', e);
      showToast('Erreur d’enregistrement des données', 'error');
    }
    _notify();
  }

  function _notify() {
    _subscribers.forEach(fn => {
      try { fn(_data); } catch (e) { console.error('Store subscriber error:', e); }
    });
  }

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _data = JSON.parse(raw);
        if (!_data.version || _data.version < CURRENT_VERSION) {
          _data.version = CURRENT_VERSION;
          if (!_data.settings) _data.settings = { theme: 'light' };
          _save();
        }
      } else {
        _data = _defaultData();
        _save();
      }
    } catch (e) {
      console.error('Erreur de lecture localStorage:', e);
      _data = _defaultData();
      _save();
    }

    // Si la base est neuve, charger automatiquement les données d'exemple
    if (_data.contents.length === 0) {
      loadDemoData(false);
    }
    return _data;
  }

  function getAll() {
    return [...(_data?.contents || [])];
  }

  function getById(id) {
    return _data?.contents.find(c => c.id === id) || null;
  }

  function create(content) {
    const item = {
      id: generateId(),
      titre: content.titre || 'Sans titre',
      type: content.type || 'article',
      statut: content.statut || 'brouillon',
      auteur: content.auteur || 'Équipe Nidal',
      dateCreation: new Date().toISOString(),
      datePublication: content.datePublication || '',
      description: content.description || '',
      tags: Array.isArray(content.tags) ? content.tags : []
    };
    _data.contents.push(item);
    _save();
    return item;
  }

  function update(id, updates) {
    const idx = _data.contents.findIndex(c => c.id === id);
    if (idx === -1) return null;
    _data.contents[idx] = { ..._data.contents[idx], ...updates, id };
    _save();
    return _data.contents[idx];
  }

  function remove(id) {
    const idx = _data.contents.findIndex(c => c.id === id);
    if (idx === -1) return false;
    _data.contents.splice(idx, 1);
    _save();
    return true;
  }

  function getSettings() {
    return { ...(_data?.settings || { theme: 'light' }) };
  }

  function updateSettings(updates) {
    _data.settings = { ..._data.settings, ...updates };
    _save();
    return _data.settings;
  }

  function exportData() {
    return JSON.stringify(_data, null, 2);
  }

  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.contents || !Array.isArray(parsed.contents)) {
        throw new Error('Format de fichier invalide');
      }
      _data.contents = parsed.contents;
      if (parsed.settings) _data.settings = { ..._data.settings, ...parsed.settings };
      _save();
      return true;
    } catch (e) {
      console.error('Erreur import JSON:', e);
      throw e;
    }
  }

  function reset() {
    _data = _defaultData();
    _save();
  }

  function loadDemoData(notify = true) {
    const demoItems = [
      { titre: 'Les secrets de la forêt amazonienne', type: 'article', statut: 'publie', auteur: 'Marie Dupont', description: 'Découverte des espèces animales et végétales menacées du poumon vert.', tags: ['nature', 'écologie', 'amazonie'], datePublication: _offsetDate(-14) },
      { titre: 'Rencontre avec Thomas Pesquet', type: 'interview', statut: 'publie', auteur: 'Lucas Martin', description: 'L’astronaute français raconte la vie quotidienne et les expériences en apesanteur.', tags: ['espace', 'sciences'], datePublication: _offsetDate(-10) },
      { titre: 'Tout comprendre aux volcans', type: 'dossier', statut: 'publie', auteur: 'Sophie Bernard', description: 'Un grand format richement documenté sur le magma, les plaques et les éruptions.', tags: ['géologie', 'terre'], datePublication: _offsetDate(-6) },
      { titre: 'Flash découverte : l’animal le plus rapide', type: 'breve', statut: 'publie', auteur: 'Emma Leroy', description: 'Le faucon pèlerin et ses pointes vertigineuses à plus de 300 km/h.', tags: ['animaux', 'records'], datePublication: _offsetDate(-2) },
      { titre: 'Mon collège passe au zéro déchet', type: 'chronique', statut: 'relecture', auteur: 'Noa Petit', description: 'Témoignage d’une classe pilote engagée pour réduire les emballages.', tags: ['écologie', 'jeunesse'], datePublication: _offsetDate(3) },
      { titre: 'Infographie : Le cycle de l’eau', type: 'infographie', statut: 'en-cours', auteur: 'Julie Garcia', description: 'Schéma détaillé des étapes de l’évaporation aux nappes phréatiques.', tags: ['eau', 'cycle', 'infographie'], datePublication: _offsetDate(8) },
      { titre: 'Grand Quiz : Es-tu un explorateur ?', type: 'quiz', statut: 'brouillon', auteur: 'Marc Dubois', description: '10 questions interactives pour tester ses connaissances d’aventurier.', tags: ['quiz', 'jeu'], datePublication: _offsetDate(12) },
      { titre: 'Les abysses : voyage dans l’inconnu', type: 'article', statut: 'en-cours', auteur: 'Marie Dupont', description: 'Plongée dans les profondeurs océaniques à la rencontre des créatures bioluminescentes.', tags: ['océan', 'biologie'], datePublication: _offsetDate(18) },
      { titre: 'Dans les coulisses d’un zoo refuge', type: 'interview', statut: 'relecture', auteur: 'Lucas Martin', description: 'Interview exclusive de la vétérinaire en chef soignant les fauves rescapés.', tags: ['animaux', 'protection'], datePublication: _offsetDate(5) }
    ];

    demoItems.forEach(d => create(d));
    if (notify) showToast('Données de démonstration chargées', 'success');
  }

  function _offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  function getStats() {
    const contents = getAll();
    const total = contents.length;
    const byStatus = { 'brouillon': 0, 'en-cours': 0, 'relecture': 0, 'publie': 0 };
    const byType = {};
    CONTENT_TYPES.forEach(t => { byType[t.id] = 0; });

    contents.forEach(c => {
      if (byStatus[c.statut] !== undefined) byStatus[c.statut]++;
      if (byType[c.type] !== undefined) byType[c.type]++;
    });

    const published = byStatus['publie'];
    const inProgress = byStatus['en-cours'];
    const completion = total > 0 ? Math.round((published / total) * 100) : 0;

    // Évolution mensuelle sur les 6 derniers mois
    const monthly = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${MONTHS_FR[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
      const count = contents.filter(c => {
        if (!c.datePublication) return false;
        const pub = new Date(c.datePublication);
        return pub.getFullYear() === d.getFullYear() && pub.getMonth() === d.getMonth();
      }).length;
      monthly.push({ label, count });
    }

    return { total, published, inProgress, completion, byStatus, byType, monthly };
  }

  function subscribe(fn) {
    _subscribers.push(fn);
    return () => { _subscribers = _subscribers.filter(s => s !== fn); };
  }

  return {
    init, getAll, getById, create, update, remove,
    getSettings, updateSettings, exportData, importData,
    reset, loadDemoData, getStats, subscribe
  };
})();
