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
    try {
      if (typeof NidalAuth !== 'undefined') {
        const jwt = NidalAuth.getToken?.();
        if (jwt) return jwt;
      }
    } catch { /* NidalAuth pas encore initialisé */ }
    return getConfig().accessToken || '';
  }

  function getAuthHeaders() {
    const token = getAuthToken();
    if (!token) return {};

    // Un JWT contient 3 segments séparés par des points.
    // APP_ACCESS_TOKEN legacy ne doit PAS être envoyé comme Bearer JWT.
    if (String(token).split('.').length === 3) {
      return { Authorization: `Bearer ${token}` };
    }
    return { 'X-Access-Token': token };
  }

  async function request(path, options = {}, auth = true) {
    const config = getConfig();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (auth) Object.assign(headers, getAuthHeaders());

    const isAiRequest = /^\/api\/(?:editorial|agent)\//.test(path);
    const attempts = isAiRequest ? 2 : 1;
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(`${config.baseUrl}${path}`, { cache: 'no-store', ...options, headers });
        const text = await response.text();
        let payload = null;

        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          const contentType = String(response.headers.get('content-type') || '');
          const preview = String(text || '').replace(/\s+/g, ' ').slice(0, 180);
          const proxyLike = [502, 503, 504].includes(response.status) || /text\/html/i.test(contentType);

          if (proxyLike && attempt < attempts) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            continue;
          }

          const hint = proxyLike
            ? `Le proxy/serveur a répondu HTTP ${response.status} avec une page HTML au lieu de JSON. Cela arrive souvent lors d'un timeout ou d'un redémarrage du conteneur.`
            : `Réponse API non JSON (HTTP ${response.status}, ${contentType || 'type inconnu'}).`;

          throw new Error(preview ? `${hint} Début de réponse : ${preview}` : hint);
        }

        if (!response.ok) {
          const message = payload?.error || payload?.message || `API ${response.status}`;
          if ([502, 503, 504].includes(response.status) && attempt < attempts) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            continue;
          }
          throw new Error(message);
        }

        return payload;
      } catch (error) {
        lastError = error;
        if (attempt >= attempts) throw error;
      }
    }

    throw lastError || new Error('Erreur API inconnue');
  }


  async function uploadMedia(file) {
    if (!file) throw new Error('Sélectionnez un fichier.');

    const originalType = String(file.type || '').toLowerCase();
    const config = getConfig();
    const headers = {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name || 'media')
    };
    Object.assign(headers, getAuthHeaders());

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
    return {
      ...payload,
      convertedForMeta: Boolean(payload.convertedForMeta),
      originalMime: payload.originalMime || originalType || null,
      mime: payload.mime || file.type
    };
  }

  async function ensureInstagramCompatibleImage(mediaUrl, mediaType = 'image') {
    const type = String(mediaType || '').toLowerCase();
    if (!mediaUrl || type === 'video' || type === 'reel') return { url: mediaUrl, converted: false };

    let parsed;
    try { parsed = new URL(mediaUrl, window.location.origin); }
    catch { return { url: mediaUrl, converted: false }; }

    if (/\.(jpe?g)$/i.test(parsed.pathname)) return { url: mediaUrl, converted: false };
    if (!/\.(png|webp|gif)$/i.test(parsed.pathname)) return { url: mediaUrl, converted: false };

    // Conversion automatique des anciens médias NJKPI déjà uploadés.
    // Pour une URL externe sans CORS, on demande simplement un nouvel upload.
    try {
      const response = await fetch(parsed.toString(), { credentials: parsed.origin === window.location.origin ? 'same-origin' : 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const originalName = parsed.pathname.split('/').pop() || 'image';
      const file = new File([blob], originalName, { type: blob.type || 'image/png' });
      const uploaded = await uploadMedia(file);
      return { url: uploaded.url || mediaUrl, converted: Boolean(uploaded.convertedForMeta), upload: uploaded };
    } catch {
      throw new Error('Instagram exige une image JPG/JPEG. Réuploadez cette image avec le bouton Photo / vidéo : NJKPI la convertira automatiquement.');
    }
  }

  async function init() {
    try { _health = await request('/api/health', {}, false); _online = Boolean(_health.ok); }
    catch { _online = false; _health = null; }
    return _online;
  }

  const isOnline = () => _online;
  const isPersistentOnline = () => Boolean(_online && _health?.database?.connected);
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
  const generateProfessionalPlan = body => request('/api/editorial/pro-plan', { method: 'POST', body: JSON.stringify(body) });
  const generateEditorial = body => request('/api/editorial/generate', { method: 'POST', body: JSON.stringify(body) });
  const saveToPlanning = body => request('/api/editorial/save-to-planning', { method: 'POST', body: JSON.stringify(body) });
  const transferEditorial = body => request('/api/editorial/transfer', { method: 'POST', body: JSON.stringify(body) });
  const deleteEditorialGeneration = id => request(`/api/editorial/generations/${encodeURIComponent(id)}?confirm=true`, { method: 'DELETE' });

  return {
    init, isOnline, isPersistentOnline, getHealth, getConfig, saveConfig, request, uploadMedia, ensureInstagramCompatibleImage,
    listContents, upsertContent, deleteContent, syncContent,
    generate, listAds, syncAds, getKpiTargets, saveKpiTargets, getSocialProfiles, getSocialLive, getAudienceConversions, getAudienceHistory,
    listPublishJobs, createPublishJob, runPublishJob,
    listEditorialAgents, listEditorialProviders, listEditorialGenerations, generateProfessionalPlan, generateEditorial,
    saveToPlanning, transferEditorial, deleteEditorialGeneration
  };
})();
