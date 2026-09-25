/** Client HTTP du backend Coolify. Toutes les cles restent cote serveur. */
const NidalAPI = (() => {
  const CONFIG_KEY = 'nidal-api-config';
  let _online = false;
  let _health = null;

  function getConfig() {
    try { return { baseUrl: '', accessToken: '', ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') }; }
    catch { return { baseUrl: '', accessToken: '' }; }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ baseUrl: String(config.baseUrl || '').replace(/\/$/, ''), accessToken: config.accessToken || '' }));
  }

  function getAuthToken() {
    // Toujours préférer le JWT de la session utilisateur.
    // Le champ accessToken de la config peut contenir un ancien token legacy
    // ou être vide après un changement de configuration.
    try {
      if (typeof NidalAuth !== 'undefined') {
        const jwt = NidalAuth.getToken?.();
        if (jwt) return jwt;
      }
    } catch { /* NidalAuth pas encore initialisé */ }
    return getConfig().accessToken || '';
  }

  async function request(path, options = {}, auth = true) {
    const config = getConfig();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const authToken = getAuthToken();
    if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${config.baseUrl}${path}`, { ...options, headers });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error('Le serveur API ne renvoie pas du JSON'); }
    if (!response.ok) throw new Error(payload.error || `API ${response.status}`);
    return payload;
  }

  async function uploadMedia(file) {
    if (!file) throw new Error('Sélectionnez un fichier.');
    const config = getConfig();
    const headers = {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name || 'media')
    };
    const authToken = getAuthToken();
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${config.baseUrl}/api/uploads`, {
      method: 'POST',
      headers,
      body: file
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error('Le serveur upload ne renvoie pas du JSON'); }
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expirée ou token de connexion absent. Reconnectez-vous puis réessayez.');
      }
      if (response.status === 403) {
        throw new Error('Votre compte doit avoir le rôle Admin ou Éditeur pour envoyer des médias.');
      }
      throw new Error(payload.error || `Upload ${response.status}`);
    }
    return payload;
  }

  async function init() {
    try { _health = await request('/api/health', {}, false); _online = Boolean(_health.ok); }
    catch { _online = false; _health = null; }
    return _online;
  }

  const isOnline = () => _online;
  const getHealth = () => _health;
  const listContents = brand => request(`/api/contents?brand=${encodeURIComponent(brand)}`);
  const upsertContent = content => request('/api/contents', { method: 'POST', body: JSON.stringify(content) });
  const deleteContent = id => request(`/api/contents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const syncContent = (id, body) => request(`/api/contents/${encodeURIComponent(id)}/sync`, { method: 'POST', body: JSON.stringify(body) });
  const generate = body => request('/api/agent/generate', { method: 'POST', body: JSON.stringify(body) });
  const listAds = brand => request(`/api/ads?brand=${encodeURIComponent(brand)}`);
  const syncAds = brand => request('/api/ads/sync', { method: 'POST', body: JSON.stringify({ brand }) });
  const getKpiTargets = brand => request(`/api/kpi/targets?brand=${encodeURIComponent(brand)}`);
  const saveKpiTargets = (brand, targets) => request('/api/kpi/targets', { method: 'POST', body: JSON.stringify({ brand, targets }) });
  const getSocialProfiles = brand => request(`/api/social/profiles?brand=${encodeURIComponent(brand)}`);
  const getSocialLive = (brand, refresh = false) => request(`/api/social/live?brand=${encodeURIComponent(brand)}${refresh ? '&refresh=1' : ''}`);
  const getAudienceConversions = (brand, refresh = false) => request(`/api/audience-conversions?brand=${encodeURIComponent(brand)}${refresh ? '&refresh=1' : ''}`);
  const getAudienceHistory = (brand, limit = 168) => request(`/api/audience-history?brand=${encodeURIComponent(brand)}&limit=${encodeURIComponent(limit)}`);
  const listPublishJobs = brand => request(`/api/publish/jobs?brand=${encodeURIComponent(brand)}`);
  const createPublishJob = body => request('/api/publish/jobs', { method: 'POST', body: JSON.stringify(body) });
  const runPublishJob = id => request(`/api/publish/jobs/${encodeURIComponent(id)}/run`, { method: 'POST' });

  const listEditorialAgents = () => request('/api/editorial/agents');
  const listEditorialProviders = () => request('/api/editorial/providers');
  const listEditorialGenerations = (agent = '', brand = '') => request(`/api/editorial/generations?agent=${encodeURIComponent(agent)}&brand=${encodeURIComponent(brand)}`);
  const generateEditorial = body => request('/api/editorial/generate', { method: 'POST', body: JSON.stringify(body) });
  const saveToPlanning = body => request('/api/editorial/save-to-planning', { method: 'POST', body: JSON.stringify(body) });
  const transferEditorial = body => request('/api/editorial/transfer', { method: 'POST', body: JSON.stringify(body) });
  const deleteEditorialGeneration = id => request(`/api/editorial/generations/${encodeURIComponent(id)}?confirm=true`, { method: 'DELETE' });

  return {
    init, isOnline, getHealth, getConfig, saveConfig, request, uploadMedia,
    listContents, upsertContent, deleteContent, syncContent,
    generate, listAds, syncAds, getKpiTargets, saveKpiTargets, getSocialProfiles, getSocialLive, getAudienceConversions, getAudienceHistory,
    listPublishJobs, createPublishJob, runPublishJob,
    listEditorialAgents, listEditorialProviders, listEditorialGenerations, generateEditorial,
    saveToPlanning, transferEditorial, deleteEditorialGeneration
  };
})();
