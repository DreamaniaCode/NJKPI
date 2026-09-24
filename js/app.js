/** Routeur principal et theme. */
const App = (() => {
  let _currentView = 'dashboard';
  const VIEWS = ['dashboard', 'planning', 'contents', 'agent', 'performance', 'insights', 'quality'];

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
    _routeFromHash();

    // 2. Synchronisation avec le serveur en arrière-plan (non-bloquante)
    try {
      await NidalAPI.init();
      await NidalStore.syncRemote();
      _renderCurrentView();
    } catch (err) {
      console.warn('Synchronisation initiale différée:', err);
    }
  }

  function _routeFromHash() {
    const hash = window.location.hash.replace('#', '');
    navigateTo(VIEWS.includes(hash) ? hash : 'dashboard', false);
  }

  function navigateTo(viewId, updateHash = true) {
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
      quality: typeof QualityView !== 'undefined' ? QualityView : null
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
            <strong>Erreur d’affichage de la vue « ${_currentView} »</strong>
            <p style="margin-top:6px;color:var(--muted);">${escapeHtml(err.message)}</p>
            <button class="btn btn--secondary btn--sm" onclick="location.reload()" style="margin-top:10px;">Recharger l’application</button>
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
  return { init, navigateTo };
})();
document.addEventListener('DOMContentLoaded', App.init);
