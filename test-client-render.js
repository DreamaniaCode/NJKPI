/**
 * Test de simulation complet de l'environnement client :
 * Exécute tous les scripts frontend dans l'ordre d'index.html et vérifie
 * le rendu sans aucune erreur de toutes les vues.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('=== TEST DE RENDU CLIENT COMPLET (SIMULATION BROWSER) ===\n');

// 1. Mock minimal de l'environnement browser
const storage = new Map();
const listeners = {};

class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = '';
    this.dataset = {};
    this.attributes = {};
    this._innerHTML = '';
    this._textContent = '';
    this.value = '';
    this.children = [];
    this.style = {};
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) { this._innerHTML = String(val); }
  get textContent() { return this._textContent; }
  set textContent(val) {
    this._textContent = String(val);
    this._innerHTML = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      return id === this.id ? this : (this._findById(id) || new MockElement('div', id));
    }
    return new MockElement('div');
  }
  querySelectorAll() { return []; }
  addEventListener(event, fn) { listeners[event] = fn; }
  removeEventListener() {}
  focus() {}
  remove() {}
  classList = {
    add: () => {},
    remove: () => {},
    toggle: () => {}
  };
  _findById(id) {
    for (const c of this.children) {
      if (c.id === id) return c;
      const f = c._findById?.(id);
      if (f) return f;
    }
    return null;
  }
}

const elementsById = new Map();
function getOrCreateElement(id, tag = 'div') {
  if (!elementsById.has(id)) {
    elementsById.set(id, new MockElement(tag, id));
  }
  return elementsById.get(id);
}

// Pre-create view containers defined in index.html
['view-dashboard', 'view-planning', 'view-contents', 'view-agent', 'view-performance', 'view-insights', 'view-quality', 'main-content', 'modal-overlay', 'modal-container', 'toast-container', 'sr-announcer', 'brand-switch', 'theme-toggle', 'theme-icon'].forEach(id => {
  getOrCreateElement(id);
});

const mockWindow = {
  location: { hash: '#dashboard', reload: () => {} },
  localStorage: {
    getItem: k => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  },
  navigator: { clipboard: { writeText: async () => {} } },
  document: {
    documentElement: { dataset: {} },
    getElementById: id => getOrCreateElement(id),
    querySelector: sel => sel.startsWith('#') ? getOrCreateElement(sel.slice(1)) : new MockElement('div'),
    querySelectorAll: () => [],
    createElement: tag => new MockElement(tag),
    createElementNS: (_ns, tag) => new MockElement(tag),
    body: new MockElement('body'),
    addEventListener: (event, fn) => { listeners[event] = fn; },
    removeEventListener: () => {}
  },
  fetch: async () => ({
    ok: true,
    text: async () => JSON.stringify({ ok: true, integrations: {} })
  }),
  requestAnimationFrame: fn => setTimeout(fn, 0),
  crypto: { randomUUID: () => '11111111-2222-3333-4444-555555555555' },
  Intl,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  setTimeout,
  clearTimeout,
  console
};

mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);

// Order in index.html
const scripts = [
  'js/utils.js',
  'js/api.js',
  'js/store.js',
  'js/charts.js',
  'js/export.js',
  'js/dashboard.js',
  'js/planning.js',
  'js/contents.js',
  'js/agent.js',
  'js/performance.js',
  'js/insights.js',
  'js/quality.js',
  'js/app.js'
];

for (const scriptPath of scripts) {
  const code = fs.readFileSync(path.resolve(process.cwd(), scriptPath), 'utf8');
  try {
    vm.runInContext(code, context);
    console.log(`✓ Chargé et exécuté avec succès : ${scriptPath}`);
  } catch (err) {
    console.error(`❌ ÉCHEC lors de l'exécution de ${scriptPath}:`, err);
    process.exit(1);
  }
}

console.log('\n--- TEST DU ROUTEUR ET DU RENDU DE TOUTES LES VUES ---');

// Test App.init()
try {
  vm.runInContext('App.init();', context);
  console.log('✓ App.init() exécuté sans erreur');
} catch (err) {
  console.error('❌ Échec App.init():', err);
  process.exit(1);
}

// Test rendering of all 7 views
const views = ['dashboard', 'planning', 'contents', 'agent', 'performance', 'insights', 'quality'];
for (const v of views) {
  try {
    vm.runInContext(`App.navigateTo('${v}', false);`, context);
    const panel = getOrCreateElement(`view-${v}`);
    if (!panel.innerHTML || panel.innerHTML.trim() === '') {
      throw new Error(`Le conteneur view-${v} est resté vide après navigateTo('${v}') !`);
    }
    console.log(`✓ Vue [${v.toUpperCase()}] rendue avec succès (${panel.innerHTML.length} caractères de contenu)`);
  } catch (err) {
    console.error(`❌ Échec du rendu de la vue ${v}:`, err);
    process.exit(1);
  }
}

// Test KPI Targets modal opening
try {
  vm.runInContext(`PerformanceView.openKpiTargetsModal();`, context);
  const modalContainer = getOrCreateElement('modal-container');
  console.log('Contenu modal-container :', modalContainer.innerHTML.slice(0, 150));
  if (!modalContainer.innerHTML.includes('Objectifs KPI')) {
    throw new Error('La modale des Objectifs KPI & ETA ne contient pas le titre attendu');
  }
  console.log('✓ Modale des Objectifs KPI & ETA ouverte et vérifiée avec succès');
} catch (err) {
  console.error('❌ Échec ouverture modale KPI:', err);
  process.exit(1);
}

console.log('\n======================================================');
console.log('TOUS LES TESTS CLIENT DU DOM ONT RÉUSSI À 100% ! 🎉');
console.log('======================================================\n');
