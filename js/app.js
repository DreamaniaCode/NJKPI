/** Routeur principal et theme. */
const App = (() => {
  let _currentView = 'dashboard';
  let _metaLiveTimer = null;
  const VIEWS = ['dashboard', 'planning', 'contents', 'agent', 'performance', 'insights', 'audience', 'publisher', 'quality', 'settings'];

  async function init() {
    // 1. Initialisation locale et affichage immédiat (0ms) pour éviter tout écran blanc
    NidalStore.init();
    _initTheme();
    _initBrandSwitch();
    document.querySelectorAll('[data-view]').forEach(button => {
      button.onclick = () => navigateTo(button.dataset.view);
    });
    window.onpopstate = _routeFromHash;
    NidalStore.subscribe(_renderCurrentView);

    // 2. Auth check — si le module NidalAuth est disponible
    if (typeof NidalAuth !== 'undefined') {
      try {
        await NidalAuth.init();
        if (NidalAuth.isAuthEnabled() && !NidalAuth.isAuthenticated()) {
          _showLoginPage();
          return;
        }
        _applyAuth();
      } catch (err) {
        console.warn('Auth init différée:', err);
      }
    }

    _routeFromHash();

    // 3. Synchronisation avec le serveur en arrière-plan (non-bloquante)
    try {
      await NidalAPI.init();
      await NidalStore.syncRemote();
      _startMetaLivePolling();
      _renderCurrentView();
    } catch (err) {
      console.warn('Synchronisation initiale différée:', err);
    }
  }

  function _startMetaLivePolling() {
    if (_metaLiveTimer || typeof NidalStore.syncMetaLive !== 'function') return;
    _metaLiveTimer = window.setInterval(async () => {
      if (document.hidden || !NidalAPI.isOnline()) return;
      const live = await NidalStore.syncMetaLive(getActiveBrand(), false);
      if (live && _currentView === 'dashboard') _renderCurrentView();
    }, 60000);
  }

  function _showLoginPage() {
    const loginPage = document.getElementById('login-page');
    const appLayout = document.querySelector('.app-layout');
    if (loginPage && appLayout) {
      appLayout.hidden = true;
      loginPage.hidden = false;
      loginPage.innerHTML = NidalAuth.renderLoginPage();
      NidalAuth.bindLoginEvents(loginPage);
    }
  }

  function _hideLoginPage() {
    const loginPage = document.getElementById('login-page');
    const appLayout = document.querySelector('.app-layout');
    if (loginPage && appLayout) {
      loginPage.hidden = true;
      appLayout.hidden = false;
    }
  }

  function _applyAuth() {
    _hideLoginPage();
    // Render user badge in sidebar
    const badge = document.getElementById('sidebar-user-badge');
    if (badge && typeof NidalAuth !== 'undefined' && NidalAuth.isAuthenticated()) {
      badge.innerHTML = NidalAuth.renderUserBadge();
      badge.querySelector('#btn-logout')?.addEventListener('click', () => NidalAuth.logout());
    }
    // Apply role visibility — hide Agent nav for viewers
    if (typeof NidalAuth !== 'undefined') {
      NidalAuth.applyRoleVisibility();
    }
  }

  function onLoginSuccess() {
    _applyAuth();
    _routeFromHash();
    NidalAPI.init().then(() => NidalStore.syncRemote()).then(() => { _startMetaLivePolling(); _renderCurrentView(); }).catch(() => {});
  }

  function _routeFromHash() {
    const hash = window.location.hash.replace('#', '');
    navigateTo(VIEWS.includes(hash) ? hash : 'dashboard', false);
  }

  function navigateTo(viewId, updateHash = true) {
    // Block viewer from accessing agent view
    if (viewId === 'agent' && typeof NidalAuth !== 'undefined' && NidalAuth.isAuthEnabled() && !NidalAuth.canViewAgents()) {
      showToast('Accès réservé aux éditeurs et administrateurs', 'error');
      viewId = 'dashboard';
    }
    _currentView = viewId;
    if (updateHash) window.location.hash = viewId;
    document.querySelectorAll('[data-view]').forEach(element => {
      const active = element.dataset.view === viewId;
      element.classList.toggle('active', active);
      element.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('.view-panel').forEach(panel => {
      const active = panel.id === `view-${viewId}`;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    _renderCurrentView();
    const mainEl = document.getElementById('main-content');
    if (mainEl) mainEl.focus({ preventScroll: true });
    announceToScreenReader(`Affichage de la vue ${viewId}`);
  }

  function _renderCurrentView() {
    const renderers = {
      dashboard: typeof DashboardView !== 'undefined' ? DashboardView : null,
      planning: typeof PlanningView !== 'undefined' ? PlanningView : null,
      contents: typeof ContentsView !== 'undefined' ? ContentsView : null,
      agent: typeof AgentView !== 'undefined' ? AgentView : null,
      performance: typeof PerformanceView !== 'undefined' ? PerformanceView : null,
      insights: typeof InsightsView !== 'undefined' ? InsightsView : null,
      audience: typeof AudienceView !== 'undefined' ? AudienceView : null,
      publisher: typeof PublisherView !== 'undefined' ? PublisherView : null,
      quality: typeof QualityView !== 'undefined' ? QualityView : null,
      settings: typeof SettingsView !== 'undefined' ? SettingsView : null
    };
    try {
      renderers[_currentView]?.render();
    } catch (err) {
      console.error(`Erreur lors du rendu de la vue ${_currentView}:`, err);
      const panel = document.getElementById(`view-${_currentView}`);
      if (panel) {
        panel.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;">
          <div style="color:var(--red);font-size:32px;margin-bottom:12px;">⚠️</div>
          <div>
            <strong>Erreur d'affichage de la vue « ${_currentView} »</strong>
            <p style="margin-top:6px;color:var(--muted);">${escapeHtml(err.message)}</p>
            <button class="btn btn--secondary btn--sm" onclick="location.reload()" style="margin-top:10px;">Recharger l'application</button>
          </div>
        </div>`;
      }
    }
  }

  function _initTheme() {
    const settings = NidalStore.getSettings();
    document.documentElement.dataset.theme = settings.theme || 'light';
    _updateTheme(settings.theme || 'light');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.onclick = () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        NidalStore.updateSettings({ theme: next });
        _updateTheme(next);
      };
    }
  }

  function _updateTheme(theme) {
    const icon = document.getElementById('theme-icon');
    const lbl = document.querySelector('.theme-toggle__label');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '◐';
    if (lbl) lbl.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }

  function _initBrandSwitch() {
    const select = document.getElementById('brand-switch');
    if (!select) return;
    select.value = getActiveBrand();
    _updateBrandName();
    select.onchange = async () => {
      setActiveBrand(select.value);
      _updateBrandName();
      _renderCurrentView();
      showToast(`Marque active : ${getActiveBrandLabel()}`, 'success');
      await NidalStore.syncRemote();
      _renderCurrentView();
    };
  }

  function _updateBrandName() {
    const name = document.querySelector('.sidebar__brand strong');
    if (name) name.textContent = getActiveBrandLabel();
  }
  return { init, navigateTo, onLoginSuccess };
})();
document.addEventListener('DOMContentLoaded', App.init);
