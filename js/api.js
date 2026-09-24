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

  async function request(path, options = {}, auth = true) {
    const config = getConfig();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (auth && config.accessToken) headers.Authorization = `Bearer ${config.accessToken}`;
    const response = await fetch(`${config.baseUrl}${path}`, { ...options, headers });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error('Le serveur API ne renvoie pas du JSON'); }
    if (!response.ok) throw new Error(payload.error || `API ${response.status}`);
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

  const listEditorialAgents = () => request('/api/editorial/agents');
  const listEditorialProviders = () => request('/api/editorial/providers');
  const listEditorialGenerations = (agent = '', brand = '') => request(`/api/editorial/generations?agent=${encodeURIComponent(agent)}&brand=${encodeURIComponent(brand)}`);
  const generateEditorial = body => request('/api/editorial/generate', { method: 'POST', body: JSON.stringify(body) });
  const saveToPlanning = body => request('/api/editorial/save-to-planning', { method: 'POST', body: JSON.stringify(body) });
  const transferEditorial = body => request('/api/editorial/transfer', { method: 'POST', body: JSON.stringify(body) });
  const deleteEditorialGeneration = id => request(`/api/editorial/generations/${encodeURIComponent(id)}?confirm=true`, { method: 'DELETE' });

  return {
    init, isOnline, getHealth, getConfig, saveConfig,
    listContents, upsertContent, deleteContent, syncContent,
    generate, listAds, syncAds,
    listEditorialAgents, listEditorialProviders, listEditorialGenerations, generateEditorial,
    saveToPlanning, transferEditorial, deleteEditorialGeneration
  };
})();
