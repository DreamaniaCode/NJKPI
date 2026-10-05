/** Routeur principal et theme. */
const App = (() => {
  let _currentView = 'dashboard';
  let _metaLiveTimer = null;
  let _remoteSyncTimer = null;
  const VIEWS = ['dashboard', 'planning', 'contents', 'agent', 'performance', 'insights', 'audience', 'publisher', 'leads', 'report-data', 'quality', 'settings'];

  async function init() {
    // Vérifier AVANT le rendu que le navigateur n'a pas assemblé des assets
    // provenant de builds différents (cas observé avec un ancien dashboard.js).
    const frontendOk = await _ensureFrontendBuild();
    if (!frontendOk) return;

    // 1. Initialisation locale et affichage immédiat (0ms) pour éviter tout écran blanc
    NidalStore.init();
    _initTheme();
    _initBrandSwitch();
    document.querySelectorAll('[data-view]').forEach(button => {
      button.onclick = () => navigateTo(button.dataset.view);
    });
    window.onpopstate = _routeFromHash;
    NidalStore.subscribe(() => requestRefresh());

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
      if (!NidalAPI.isPersistentOnline?.()) {
        const health = NidalAPI.getHealth?.();
        const detail = health?.database?.error ? ` — ${health.database.error}` : '';
        showToast('Base PostgreSQL non connectée : la synchronisation entre appareils est impossible' + detail, 'error');
      }
      await NidalStore.syncRemote();
      _startRemoteSyncPolling();
      _startMetaLivePolling();
      requestRefresh();
      window.setInterval(async () => {
        if (document.hidden || !NidalAPI.isOnline()) return;
        await NidalStore.syncRemote();
        if (_currentView === 'leads') await LeadsView.refresh();
        if (_currentView === 'insights') await InsightsView.refresh();
        requestRefresh();
      }, 60000);
    } catch (err) {
      console.warn('Synchronisation initiale différée:', err);
    }
  }

  async function _ensureFrontendBuild() {
    const htmlBuild = document.querySelector('meta[name="nidal-build"]')?.content || '';
    const dashboardBuild = typeof DashboardView !== 'undefined' ? (DashboardView.build || '') : '';
    let serverBuild = '';

    try {
      const response = await fetch('/api/version?ts=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const payload = await response.json();
        serverBuild = String(payload.build || '');
      }
    } catch {
      // Ne pas bloquer l'application si le serveur est momentanément inaccessible.
    }

    const expectedBuild = serverBuild || htmlBuild;
    const mismatch = Boolean(
      expectedBuild
      && (
        (htmlBuild && htmlBuild !== expectedBuild)
        || !dashboardBuild
        || dashboardBuild !== expectedBuild
      )
    );

    if (!mismatch) return true;

    const reloadKey = 'nidal_frontend_reload_' + expectedBuild;
    if (sessionStorage.getItem(reloadKey) === '1') {
      console.error('Frontend toujours incohérent après rechargement', {
        htmlBuild, dashboardBuild, serverBuild
      });
      document.body.innerHTML = `
        <main style="max-width:760px;margin:60px auto;padding:24px;font-family:Arial,sans-serif;">
          <h1>Frontend NJKPI non synchronisé</h1>
          <p>Le serveur utilise le build <strong>${serverBuild || '—'}</strong>, mais le navigateur a chargé le dashboard <strong>${dashboardBuild || 'ancien/inconnu'}</strong>.</p>
          <p>Rechargez cette page depuis l'URL ci-dessous pour contourner tout cache intermédiaire.</p>
          <p><a href="/?build=${encodeURIComponent(expectedBuild)}&fresh=${Date.now()}">Recharger NJKPI ${expectedBuild}</a></p>
        </main>
      `;
      return false;
    }

    sessionStorage.setItem(reloadKey, '1');

    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
    } catch {}

    const url = new URL(window.location.href);
    url.searchParams.set('build', expectedBuild);
    url.searchParams.set('fresh', String(Date.now()));
    window.location.replace(url.toString());
    return false;
  }

  function _startRemoteSyncPolling() {
    if (_remoteSyncTimer || typeof NidalStore.syncRemote !== 'function') return;

    const refresh = async () => {
      if (document.hidden || !NidalAPI.isOnline()) return;
      const ok = await NidalStore.syncRemote({ includeMeta: false });
      if (ok) requestRefresh();
    };

    _remoteSyncTimer = window.setInterval(() => {
      refresh().catch(error => console.warn('Sync multi-appareils:', error.message));
    }, 10000);

    window.addEventListener('focus', () => {
      refresh().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh().catch(() => {});
    });
  }

  function _startMetaLivePolling() {
    if (_metaLiveTimer || typeof NidalStore.syncMetaLive !== 'function') return;

    const refresh = async (force = false) => {
      if (document.hidden || !NidalAPI.isOnline()) return;
      const live = await NidalStore.syncMetaLive(getActiveBrand(), force);
      if (live && ['dashboard', 'performance', 'insights', 'audience'].includes(_currentView)) {
        requestRefresh();
      }
    };

    let ticks = 0;
    _metaLiveTimer = window.setInterval(async () => {
      ticks += 1;
      // Toutes les 5 minutes, forcer une vraie lecture Meta.
      // Entre-temps, utiliser le cache serveur pour garder l'UI à jour sans surcharger l'API.
      await refresh(ticks % 5 === 0);
    }, 60000);

    window.addEventListener('focus', () => {
      refresh(true).catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh(true).catch(() => {});
    });
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
    NidalAPI.init().then(() => NidalStore.syncRemote()).then(() => { _startRemoteSyncPolling(); _startMetaLivePolling(); requestRefresh(); }).catch(() => {});
  }

  function _routeFromHash() {
    const hash = window.location.hash.replace('#', '');
    navigateTo(VIEWS.includes(hash) ? hash : 'dashboard', false);
  }

  function navigateTo(viewId, updateHash = true) {
    // Block viewer from accessing agent view
    if (['agent', 'publisher'].includes(viewId) && typeof NidalAuth !== 'undefined' && NidalAuth.isAuthEnabled() && !NidalAuth.canEdit()) {
      showToast('Accès réservé aux éditeurs et administrateurs', 'error');
      viewId = 'dashboard';
    }
    _currentView = viewId;
    if (updateHash) window.location.hash = viewId;
    document.querySelectorAll('[data-view]').forEach(element => {
      const grouped = ['planning', 'publisher'].includes(viewId) ? 'contents' : ['insights', 'audience', 'report-data'].includes(viewId) ? 'performance' : viewId;
      const active = element.dataset.view === grouped;
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

  let _refreshTimer = null;
  function requestRefresh(viewId = _currentView) {
    if (viewId !== _currentView || _refreshTimer !== null) return;
    const requestedView = _currentView;
    const flush = () => {
      _refreshTimer = null;
      if (requestedView !== _currentView) return;
      const active = document.activeElement;
      const editing = active?.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
      const selection = window.getSelection?.();
      const modal = document.querySelector('[role="dialog"]');
      if (editing || (selection && !selection.isCollapsed) || (modal && modal.getClientRects().length)) {
        _refreshTimer = window.setTimeout(flush, 500);
        return;
      }
      _renderCurrentView();
    };
    _refreshTimer = window.setTimeout(flush, 0);
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
      'report-data': typeof ReportsDataView !== 'undefined' ? ReportsDataView : null,
      leads: typeof LeadsView !== 'undefined' ? LeadsView : null,
      quality: typeof QualityView !== 'undefined' ? QualityView : null,
      settings: typeof SettingsView !== 'undefined' ? SettingsView : null
    };
    try {
      renderers[_currentView]?.render();
      const tabs = document.getElementById('workspace-tabs');
      const contentGroup = [['contents','Bibliothèque'],['planning','Calendrier'],['publisher','Publier & programmer']];
      const reportGroup = [['performance','Performance'],['audience','Audience & conversions'],['insights','Connexion & campagnes'],['report-data','Données & exports']];
      const group = contentGroup.some(([key]) => key === _currentView) ? contentGroup : reportGroup.some(([key]) => key === _currentView) ? reportGroup : [];
      tabs.hidden = !group.length;
      tabs.innerHTML = group.filter(([key]) => key !== 'publisher' || typeof NidalAuth === 'undefined' || !NidalAuth.isAuthEnabled() || NidalAuth.canEdit()).map(([key,label]) => '<button class="btn ' + (key === _currentView ? 'btn--primary' : 'btn--secondary') + '" aria-current="' + (key === _currentView ? 'page' : 'false') + '" data-section="' + key + '">' + label + '</button>').join('');
      tabs.querySelectorAll('[data-section]').forEach(button => button.onclick = () => navigateTo(button.dataset.section));
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
    const selects = [select, document.getElementById('mobile-brand-switch')].filter(Boolean);
    selects.forEach(item => { item.value = getActiveBrand(); });
    _updateBrandName();
    const changeBrand = async event => {
      setActiveBrand(event.target.value);
      selects.forEach(item => { item.value = getActiveBrand(); });
      _updateBrandName();
      if (NidalAPI.isOnline()) {
        await NidalStore.syncRemote({ includeMeta: false });
      }
      _renderCurrentView();
      showToast(`Marque active : ${getActiveBrandLabel()}`, 'success');
      await NidalStore.syncRemote();
      _renderCurrentView();
    };
    selects.forEach(item => { item.onchange = changeBrand; });
  }

  function _updateBrandName() {
    const name = document.querySelector('.sidebar__brand strong');
    if (name) name.textContent = getActiveBrandLabel();
  }
  return { init, navigateTo, onLoginSuccess, requestRefresh };
})();
document.addEventListener('DOMContentLoaded', App.init);
