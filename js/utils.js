/**
 * Nidal Junior — Pilotage éditorial
 * Utilitaires partagés, constantes (7 contenus, 4 statuts), dates et accessibilité
 */

const CONTENT_TYPES = [
  { id: 'article',      label: 'Article',      icon: '📰', color: '#10b981' },
  { id: 'interview',    label: 'Interview',     icon: '🎤', color: '#0ea5e9' },
  { id: 'dossier',      label: 'Dossier',       icon: '📁', color: '#f59e0b' },
  { id: 'breve',        label: 'Brève',         icon: '📋', color: '#8b5cf6' },
  { id: 'chronique',    label: 'Chronique',     icon: '✍️', color: '#ec4899' },
  { id: 'infographie',  label: 'Infographie',   icon: '📊', color: '#06b6d4' },
  { id: 'quiz',         label: 'Quiz',          icon: '❓', color: '#f97316' }
];

const STATUSES = [
  { id: 'brouillon', label: 'Brouillon',    color: '#94a3b8' },
  { id: 'en-cours',  label: 'En cours',     color: '#f59e0b' },
  { id: 'relecture', label: 'En relecture', color: '#6366f1' },
  { id: 'publie',    label: 'Publié',       color: '#10b981' }
];

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function formatDate(date, format = 'short') {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (format === 'iso') return `${year}-${month}-${day}`;
  if (format === 'long') return `${day} ${MONTHS_FR[d.getMonth()]} ${year}`;
  return `${day}/${month}/${year}`;
}

function toISODate(date) {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Lundi = 0
}

function isSameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay = 300) {
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

/* Accessibilité : Piège à focus pour fenêtre modale */
function trapFocus(element) {
  const focusables = element.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return () => {};
  const first = focusables[0], last = focusables[focusables.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  element.addEventListener('keydown', handler);
  first.focus();
  return () => element.removeEventListener('keydown', handler);
}

function announceToScreenReader(message, priority = 'polite') {
  const region = document.getElementById('sr-announcer');
  if (region) {
    region.setAttribute('aria-live', priority);
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }
}

function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  announceToScreenReader(message);
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
        <h2 class="modal__title">${escapeHtml(title)}</h2>
        <button class="modal__close" aria-label="Fermer" data-close-modal>&times;</button>
      </div>
      <div class="modal__body">${contentHtml}</div>
      ${options.footer ? `<div class="modal__footer">${options.footer}</div>` : ''}
    </div>
  `;

  overlay.hidden = false;
  overlay.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const escHandler = e => { if (e.key === 'Escape') closeModal(); };
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
  if (overlay._escHandler) {
    document.removeEventListener('keydown', overlay._escHandler);
    overlay._escHandler = null;
  }
  if (_prevFocus) { _prevFocus.focus(); _prevFocus = null; }
}

function confirmAction(message, onConfirm) {
  openModal('Confirmation', `<p>${escapeHtml(message)}</p>`, {
    footer: `
      <button class="btn btn--secondary" data-close-modal>Annuler</button>
      <button class="btn btn--danger" id="confirm-btn">Confirmer</button>
    `,
    onOpen: (modal) => {
      modal.querySelector('#confirm-btn').addEventListener('click', () => {
        closeModal();
        onConfirm();
      });
      modal.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    }
  });
}
