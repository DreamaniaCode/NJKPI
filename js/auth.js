/**
 * NidalAuth — Authentification JWT côté client et gestion des rôles.
 * Viewer = dashboards + KPI seulement. Editor = contenu + agents IA. Admin = tout.
 */
const NidalAuth = (() => {
  const AUTH_KEY = 'nidal-auth';
  let _user = null;
  let _token = null;
  let _authEnabled = false;

  /* ── Initialisation ──────────────────────────────────────────────── */
  async function init() {
    // Charger depuis localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (stored?.token && stored?.user) {
        _token = stored.token;
        _user = stored.user;
        _updateApiToken(_token);
      }
    } catch { /* ignore */ }

    // Vérifier directement auprès du serveur. Ne pas dépendre de
    // NidalAPI.isOnline() ici : au premier chargement l'API peut ne pas encore
    // avoir terminé son health-check, ce qui laissait auparavant entrer dans
    // l'application sans vraie session.
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (_token) headers.Authorization = `Bearer ${_token}`;
      const config = NidalAPI.getConfig();
      const resp = await fetch(`${config.baseUrl}/api/auth/me`, { headers });

      if (resp.ok) {
        const data = await resp.json();
        _authEnabled = Boolean(data.authEnabled);
        if (data.user) {
          _user = data.user;
          _token = _token || null;
          if (_token) _updateApiToken(_token);
        } else if (_authEnabled) {
          _clear();
          _authEnabled = true;
        }
      } else if (resp.status === 401) {
        _clear();
        _authEnabled = true;
      }
    } catch (e) {
      console.warn('Auth check différé:', e);
    }
    return _user;
  }

  /* ── Login ───────────────────────────────────────────────────────── */
  async function login(username, password) {
    try {
      const config = NidalAPI.getConfig();
      const resp = await fetch(`${config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error || 'Identifiants invalides', 'error');
        return null;
      }
      const data = await resp.json();
      _token = data.token;
      _user = data.user;
      _authEnabled = true;
      localStorage.setItem(AUTH_KEY, JSON.stringify({ token: _token, user: _user }));
      _updateApiToken(_token);
      showToast(`Bienvenue, ${_user.display_name || _user.username} !`, 'success');
      return _user;
    } catch (e) {
      showToast('Erreur de connexion : ' + e.message, 'error');
      return null;
    }
  }

  /* ── Logout ──────────────────────────────────────────────────────── */
  function logout() {
    _clear();
    location.reload();
  }

  function _clear() {
    _user = null;
    _token = null;
    localStorage.removeItem(AUTH_KEY);
    _updateApiToken('');
  }

  function _updateApiToken(token) {
    try {
      const config = NidalAPI.getConfig();
      NidalAPI.saveConfig({ ...config, accessToken: token });
    } catch { /* NidalAPI pas encore prêt */ }
  }

  /* ── Getters ─────────────────────────────────────────────────────── */
  function getUser() { return _user; }
  function getToken() { return _token; }
  function getRole() { return _user?.role || 'viewer'; }
  function isAuthenticated() { return Boolean(_user); }
  function isAuthEnabled() { return _authEnabled; }
  function hasRole(...roles) { return roles.includes(getRole()); }
  function canEdit() { return hasRole('admin', 'editor'); }
  function canAdmin() { return hasRole('admin'); }
  function canViewAgents() { return hasRole('admin', 'editor'); }

  /* ── Page de connexion ───────────────────────────────────────────── */
  function renderLoginPage() {
    return `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg, #f4f5f7);padding:20px;">
        <div style="background:var(--surface, #fff);border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);padding:40px;max-width:380px;width:100%;text-align:center;">
          <img src="./assets/mascot.png" alt="Nounou" style="width:64px;height:auto;margin-bottom:12px;">
          <h1 style="font-size:20px;color:var(--ink, #1a1a2e);margin:0 0 4px;">Nidal Junior</h1>
          <p style="color:var(--muted, #667);font-size:13px;margin:0 0 24px;">Pilotage éditorial — Connexion</p>
          <form id="login-form">
            <div style="margin-bottom:14px;text-align:left;">
              <label for="login-username" style="display:block;font-size:12px;font-weight:600;color:var(--ink);margin-bottom:4px;">Nom d'utilisateur</label>
              <input type="text" id="login-username" class="form-control" required autocomplete="username" placeholder="admin" style="width:100%;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:20px;text-align:left;">
              <label for="login-password" style="display:block;font-size:12px;font-weight:600;color:var(--ink);margin-bottom:4px;">Mot de passe</label>
              <input type="password" id="login-password" class="form-control" required autocomplete="current-password" placeholder="••••••" style="width:100%;box-sizing:border-box;">
            </div>
            <button type="submit" class="btn btn--primary" style="width:100%;padding:10px;">Se connecter</button>
          </form>
          <p id="login-error" style="color:var(--red, #b42318);font-size:12px;margin-top:12px;display:none;"></p>
        </div>
      </div>`;
  }

  function bindLoginEvents(container) {
    const form = container.querySelector('#login-form');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const username = form.querySelector('#login-username').value.trim();
      const password = form.querySelector('#login-password').value;
      if (!username || !password) return;
      btn.disabled = true;
      btn.textContent = 'Connexion...';
      const user = await login(username, password);
      if (user) {
        App.onLoginSuccess();
      } else {
        btn.disabled = false;
        btn.textContent = 'Se connecter';
        const errEl = container.querySelector('#login-error');
        if (errEl) { errEl.textContent = 'Identifiants incorrects'; errEl.style.display = 'block'; }
      }
    };
  }

  /* ── Badge utilisateur (sidebar) ─────────────────────────────────── */
  function renderUserBadge() {
    if (!_user) return '';
    const initial = (_user.display_name || _user.username || '?')[0].toUpperCase();
    const roleColors = { admin: '#b42318', editor: '#1746d1', viewer: '#667' };
    const roleLabels = { admin: 'Admin', editor: 'Éditeur', viewer: 'Lecteur' };
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${roleColors[_user.role] || '#667'};color:#fff;font-weight:700;font-size:13px;">${initial}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(_user.display_name || _user.username)}</div>
          <div style="font-size:10px;color:${roleColors[_user.role] || '#667'};text-transform:uppercase;">${roleLabels[_user.role] || _user.role}</div>
        </div>
        <button id="btn-logout" class="btn btn--secondary btn--sm" style="padding:2px 8px;font-size:10px;" title="Déconnexion">⏻</button>
      </div>`;
  }

  /* ── Visibilité selon le rôle ─────────────────────────────────────── */
  function applyRoleVisibility() {
    if (!_authEnabled) return;
    const role = getRole();

    // Masquer la nav "Agents IA" pour les viewers
    document.querySelectorAll('[data-view="agent"]').forEach(el => {
      if (role === 'viewer') {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });

    // Masquer les éléments avec data-role-min
    document.querySelectorAll('[data-role-min]').forEach(el => {
      const min = el.dataset.roleMin;
      if (min === 'admin' && role !== 'admin') el.style.display = 'none';
      else if (min === 'editor' && role === 'viewer') el.style.display = 'none';
      else el.style.display = '';
    });
  }

  return {
    init, login, logout,
    getUser, getToken, getRole,
    isAuthenticated, isAuthEnabled, hasRole,
    canEdit, canAdmin, canViewAgents,
    renderLoginPage, bindLoginEvents, renderUserBadge,
    applyRoleVisibility
  };
})();
