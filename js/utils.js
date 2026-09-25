/**
 * Nidal Junior - constantes, formatage et utilitaires partages.
 */

const CONTENT_TYPES = [
  { id: 'article', label: 'Article', color: '#1746d1', icon: '📝' },
  { id: 'interview', label: 'Interview', color: '#31b9cc', icon: '🎙️' },
  { id: 'dossier', label: 'Dossier', color: '#6938ef', icon: '📂' },
  { id: 'breve', label: 'Brève', color: '#ffc928', icon: '⚡' },
  { id: 'chronique', label: 'Chronique', color: '#d91b5c', icon: '✍️' },
  { id: 'infographie', label: 'Infographie', color: '#0f8871', icon: '📊' },
  { id: 'quiz', label: 'Quiz', color: '#e04f16', icon: '❓' },
  { id: 'post', label: 'Post image', color: '#1746d1', icon: '🖼️' },
  { id: 'carrousel', label: 'Carrousel', color: '#d91b5c', icon: '📑' },
  { id: 'video', label: 'Vidéo / Reel', color: '#ffc928', icon: '🎬' },
  { id: 'story', label: 'Story', color: '#31b9cc', icon: '📱' }
];

const STATUSES = [
  { id: 'brouillon', label: 'Brouillon', color: '#c28b00' },
  { id: 'en-cours', label: 'En cours', color: '#1746d1' },
  { id: 'relecture', label: 'Relecture', color: '#6938ef' },
  { id: 'planifie', label: 'Planifié', color: '#98a2b3' },
  { id: 'en-production', label: 'En production', color: '#1746d1' },
  { id: 'pret', label: 'Prêt', color: '#0f8871' },
  { id: 'publie', label: 'Publié', color: '#17814f' },
  { id: 'suspendu', label: 'Suspendu', color: '#b42318' }
];

const LEVELS = [
  { id: 'tous', label: 'Tous niveaux' },
  { id: 'petite-section', label: 'Petite section' },
  { id: 'moyenne-section', label: 'Moyenne section' },
  { id: 'grande-section', label: 'Grande section' },
  { id: 'familles', label: 'Familles' }
];

const BRANDS = [
  { id: 'nidal-junior', label: 'Nidal Junior' },
  { id: 'nidal', label: 'Nidal' }
];

const VALIDATIONS = [
  { id: 'a-valider', label: 'A valider' },
  { id: 'approuve', label: 'Approuve' },
  { id: 'refuse', label: 'Refuse' }
];

const PLATFORMS = [
  { id: 'instagram-facebook', label: 'Instagram + Facebook (IG + FB)', short: 'IG + FB', icon: '🌐', color: '#6938ef' },
  { id: 'instagram', label: 'Instagram (IG)', short: 'IG', icon: '📷', color: '#d91b5c' },
  { id: 'facebook', label: 'Facebook (FB)', short: 'FB', icon: '📘', color: '#1746d1' },
  { id: 'reel-ig', label: 'Instagram Reel (IG)', short: 'IG Reel', icon: '🎬', color: '#d91b5c' },
  { id: 'story-ig', label: 'Instagram Story (IG)', short: 'IG Story', icon: '📱', color: '#ffc928' },
  { id: 'reel-fb', label: 'Facebook Reel (FB)', short: 'FB Reel', icon: '🎬', color: '#1746d1' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok', icon: '🎵', color: '#0f8871' },
  { id: 'linkedin', label: 'LinkedIn', short: 'LinkedIn', icon: '💼', color: '#0077b5' },
  { id: 'youtube', label: 'YouTube', short: 'YouTube', icon: '🎥', color: '#e04f16' }
];

function getPlatform(labelOrId) {
  if (!labelOrId) return PLATFORMS[0];
  const s = String(labelOrId).trim().toLowerCase();
  if (s === 'ig' || s === 'instagram' || s.startsWith('instagram (ig)')) return PLATFORMS[1];
  if (s === 'fb' || s === 'facebook' || s.startsWith('facebook (fb)')) return PLATFORMS[2];
  if (s.includes('instagram') && s.includes('facebook')) return PLATFORMS[0];
  if (s.includes('reel') && s.includes('ig')) return PLATFORMS[3];
  if (s.includes('story') && s.includes('ig')) return PLATFORMS[4];
  return PLATFORMS.find(p => p.id === s || p.label.toLowerCase() === s) || PLATFORMS[0];
}

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function formatDate(date, format = 'short') {
  if (!date) return '—';
  const d = new Date(`${String(date).split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (format === 'iso') return `${year}-${month}-${day}`;
  if (format === 'long') return `${day} ${MONTHS_FR[d.getMonth()]} ${year}`;
  if (format === 'compact') return `${day} ${MONTHS_FR[d.getMonth()].slice(0, 3).toLowerCase()}.`;
  return `${day}/${month}/${year}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('fr-FR').format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

function toISODate(date) {
  if (!date) return '';
  const value = String(date).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(d1, d2) {
  const a = new Date(`${String(d1).split('T')[0]}T12:00:00`);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getContentType(id) {
  return CONTENT_TYPES.find(t => t.id === id) || CONTENT_TYPES[0];
}

function getStatus(id) {
  return STATUSES.find(s => s.id === id) || STATUSES[0];
}

function getLevel(id) {
  return LEVELS.find(level => level.id === id) || LEVELS[0];
}

function getValidation(id) {
  return VALIDATIONS.find(item => item.id === id) || VALIDATIONS[0];
}

function getControlMeta(id) {
  const controls = {
    'conforme': { label: 'Conforme', className: 'control--conforme' },
    'pret': { label: 'Pret', className: 'control--pret' },
    'a-controler': { label: 'A controler', className: 'control--alerte' }
  };
  return controls[id] || controls['a-controler'];
}

function getActiveBrand() {
  return localStorage.getItem('nidal-active-brand') || 'nidal-junior';
}

function setActiveBrand(brand) {
  if (BRANDS.some(item => item.id === brand)) localStorage.setItem('nidal-active-brand', brand);
}

function getActiveBrandLabel() {
  return BRANDS.find(item => item.id === getActiveBrand())?.label || 'Nidal Junior';
}

function trapFocus(element) {
  const focusables = element.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return () => {};
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function handler(event) {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
  element.addEventListener('keydown', handler);
  first.focus();
  return () => element.removeEventListener('keydown', handler);
}

function announceToScreenReader(message, priority = 'polite') {
  const region = document.getElementById('sr-announcer');
  if (!region) return;
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

function showToast(message, type = 'success', duration = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const meta = {
    success: { icon: '✓', title: 'Succès', duration: 5000 },
    error: { icon: '×', title: 'Erreur', duration: 7000 },
    info: { icon: 'i', title: 'Information', duration: 5200 },
    warning: { icon: '!', title: 'Attention', duration: 6000 }
  };
  const cfg = meta[type] || meta.info;
  const timeout = Number(duration) > 0 ? Number(duration) : cfg.duration;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${cfg.icon}</span>
    <span class="toast__content">
      <strong class="toast__title">${cfg.title}</strong>
      <span class="toast__message">${escapeHtml(message)}</span>
    </span>
    <button class="toast__close" type="button" aria-label="Fermer">×</button>
  `;

  const close = () => {
    if (!toast.isConnected) return;
    toast.classList.remove('toast--visible');
    window.setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('.toast__close')?.addEventListener('click', close);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  announceToScreenReader(`${cfg.title}. ${message}`);
  window.setTimeout(close, timeout);
}

let _releaseFocus = null;
let _prevFocus = null;

function openModal(title, contentHtml, options = {}) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return;
  _prevFocus = document.activeElement;
  container.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal__header">
        <div><span class="section-kicker">Mise a jour</span><h2 class="modal__title">${escapeHtml(title)}</h2></div>
        <button type="button" class="modal__close" aria-label="Fermer" data-close-modal>&times;</button>
      </div>
      <div class="modal__body">${contentHtml}</div>
      ${options.footer ? `<div class="modal__footer">${options.footer}</div>` : ''}
    </div>`;
  overlay.hidden = false;
  overlay.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal));
  overlay.onclick = event => { if (event.target === overlay) closeModal(); };
  const escHandler = event => { if (event.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', escHandler);
  overlay._escHandler = escHandler;
  _releaseFocus = trapFocus(container.querySelector('.modal'));
  if (options.onOpen) options.onOpen(container.querySelector('.modal'));
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  if (_releaseFocus) { _releaseFocus(); _releaseFocus = null; }
  if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
  overlay._escHandler = null;
  if (_prevFocus) _prevFocus.focus();
  _prevFocus = null;
}

function confirmAction(message, onConfirm) {
  openModal('Confirmation', `<p>${escapeHtml(message)}</p>`, {
    footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--danger" id="confirm-btn">Confirmer</button>`,
    onOpen: modal => modal.querySelector('#confirm-btn').addEventListener('click', () => { closeModal(); onConfirm(); })
  });
}
