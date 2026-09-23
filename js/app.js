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
    const renderers = { dashboard: DashboardView, planning: PlanningView, contents: ContentsView, agent: AgentView, performance: PerformanceView, insights: InsightsView, quality: QualityView };
    renderers[_currentView]?.render();
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
