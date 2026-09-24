/** Routeur principal et theme. */
const App = (() => {
  let _currentView = 'dashboard';
  const VIEWS = ['dashboard', 'planning', 'contents', 'agent', 'performance', 'insights', 'quality'];

  async function init() {
    NidalStore.init();
    await NidalAPI.init();
    await NidalStore.syncRemote();
    _initTheme();
    _initBrandSwitch();
    document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => navigateTo(button.dataset.view));
    window.onpopstate = _routeFromHash;
    _routeFromHash();
    NidalStore.subscribe(_renderCurrentView);
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
    document.getElementById('main-content').focus({ preventScroll: true });
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
    document.getElementById('theme-toggle').onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      NidalStore.updateSettings({ theme: next });
      _updateTheme(next);
    };
  }

  function _updateTheme(theme) {
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀' : '◐';
    document.querySelector('.theme-toggle__label').textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }

  function _initBrandSwitch() {
    const select = document.getElementById('brand-switch');
    select.value = getActiveBrand();
    _updateBrandName();
    select.onchange = async () => {
      setActiveBrand(select.value);
      _updateBrandName();
      await NidalStore.syncRemote();
      _renderCurrentView();
      showToast(`Marque active : ${getActiveBrandLabel()}`, 'success');
    };
  }

  function _updateBrandName() {
    const name = document.querySelector('.sidebar__brand strong');
    if (name) name.textContent = getActiveBrandLabel();
  }
  return { init, navigateTo };
})();
document.addEventListener('DOMContentLoaded', App.init);
