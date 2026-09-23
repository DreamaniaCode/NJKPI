/**
 * Nidal Junior — Pilotage éditorial
 * Contrôleur principal, gestion du thème et routeur SPA (4 vues)
 */

const App = (() => {
  let _currentView = 'dashboard';

  function init() {
    NidalStore.init();
    _initTheme();
    _initNavigation();
    _initRouteFromHash();

    // Réactivité globale : rafraîchit la vue courante dès qu'une modification survient
    NidalStore.subscribe(() => {
      _renderCurrentView();
    });
  }

  function _initTheme() {
    const settings = NidalStore.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    _updateThemeButton(settings.theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.onclick = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        NidalStore.updateSettings({ theme: next });
        _updateThemeButton(next);
      };
    }
  }

  function _updateThemeButton(theme) {
    const icon = document.getElementById('theme-icon');
    const label = document.querySelector('.theme-toggle__label');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }

  function _initNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => navigateTo(btn.dataset.view);
    });
    window.onpopstate = () => _initRouteFromHash();
  }

  function _initRouteFromHash() {
    const hash = window.location.hash.replace('#', '');
    const validViews = ['dashboard', 'planning', 'contents', 'settings'];
    navigateTo(validViews.includes(hash) ? hash : 'dashboard', false);
  }

  function navigateTo(viewId, updateHash = true) {
    _currentView = viewId;
    if (updateHash) window.location.hash = viewId;

    // Mise à jour visuelle des onglets de navigation desktop et mobile
    document.querySelectorAll('[data-view]').forEach(el => {
      const isActive = el.dataset.view === viewId;
      el.classList.toggle('active', isActive);
      if (el.tagName === 'BUTTON') {
        el.setAttribute('aria-current', isActive ? 'page' : 'false');
      }
    });

    // Affichage / masquage des panneaux de vue
    document.querySelectorAll('.view-panel').forEach(panel => {
      const isActive = panel.id === `view-${viewId}`;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });

    _renderCurrentView();
    announceToScreenReader(`Affichage de la vue : ${viewId}`);
  }

  function _renderCurrentView() {
    switch (_currentView) {
      case 'dashboard':
        DashboardView.render();
        break;
      case 'planning':
        PlanningView.render();
        break;
      case 'contents':
        ContentsView.render();
        break;
      case 'settings':
        SettingsView.render();
        break;
    }
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', App.init);
