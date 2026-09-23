/**
 * Nidal Junior — Pilotage éditorial
 * Vue Planning — Calendrier mensuel interactif des publications
 */

const PlanningView = (() => {
  let _year = new Date().getFullYear();
  let _month = new Date().getMonth();

  function render() {
    const view = document.getElementById('view-planning');
    if (!view) return;

    view.innerHTML = `
      <header class="view__header">
        <div>
          <h1 class="view__title">📅 Planning éditorial</h1>
          <p class="view__subtitle">Calendrier mensuel des publications planifiées</p>
        </div>
      </header>

      <div class="planning">
        <div class="planning__nav">
          <button class="btn btn--icon" id="plan-prev" aria-label="Mois précédent">◀</button>
          <h2 class="planning__month-label" id="plan-month-lbl"></h2>
          <button class="btn btn--icon" id="plan-next" aria-label="Mois suivant">▶</button>
          <button class="btn btn--secondary btn--sm" id="plan-today">Aujourd'hui</button>
        </div>

        <div class="planning__weekdays" role="row">
          ${DAYS_FR.map(d => `<div role="columnheader">${d}</div>`).join('')}
        </div>
        <div class="planning__days" id="plan-grid" role="grid"></div>

        <div class="planning__detail" id="plan-day-detail" aria-live="polite">
          <p style="color:var(--text-muted)">Cliquez sur un jour du calendrier pour afficher les contenus correspondants.</p>
        </div>

        <div class="planning__legend" aria-label="Légende des types de contenus">
          ${CONTENT_TYPES.map(t => `
            <div class="planning__legend-item">
              <span class="planning__legend-dot" style="background:${t.color}" aria-hidden="true"></span>
              <span>${t.icon} ${t.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('plan-prev').onclick = () => { _shiftMonth(-1); };
    document.getElementById('plan-next').onclick = () => { _shiftMonth(1); };
    document.getElementById('plan-today').onclick = () => {
      _year = new Date().getFullYear();
      _month = new Date().getMonth();
      _renderGrid();
    };

    _renderGrid();
  }

  function _shiftMonth(delta) {
    _month += delta;
    if (_month > 11) { _month = 0; _year++; }
    if (_month < 0) { _month = 11; _year--; }
    _renderGrid();
  }

  function _renderGrid() {
    const label = document.getElementById('plan-month-lbl');
    const grid = document.getElementById('plan-grid');
    if (!label || !grid) return;

    label.textContent = `${MONTHS_FR[_month]} ${_year}`;
    grid.innerHTML = '';

    const daysCount = getDaysInMonth(_year, _month);
    const firstDay = getFirstDayOfMonth(_year, _month);
    const contents = NidalStore.getAll();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div')).className = 'planning__day planning__day--empty';
    }

    for (let day = 1; day <= daysCount; day++) {
      const cellDate = new Date(_year, _month, day);
      const isToday = isSameDay(cellDate, today);
      const dayContents = contents.filter(c => c.datePublication && isSameDay(c.datePublication, cellDate));

      const cell = document.createElement('div');
      cell.className = `planning__day ${isToday ? 'planning__day--today' : ''}`;
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${day} ${MONTHS_FR[_month]} ${_year}, ${dayContents.length} contenu(s)`);

      cell.innerHTML = `
        <span class="planning__day-number">${day}</span>
        <div class="planning__day-dots">
          ${dayContents.slice(0, 4).map(c => `<span class="planning__dot" style="background:${getContentType(c.type).color}" title="${escapeHtml(c.titre)}"></span>`).join('')}
          ${dayContents.length > 4 ? `<span class="planning__more">+${dayContents.length - 4}</span>` : ''}
        </div>
      `;

      cell.onclick = () => _showDetail(cellDate, dayContents);
      cell.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _showDetail(cellDate, dayContents);
        }
      };
      grid.appendChild(cell);
    }
  }

  function _showDetail(date, contents) {
    const detail = document.getElementById('plan-day-detail');
    if (!detail) return;

    if (!contents.length) {
      detail.innerHTML = `
        <div style="display:flex;align-items:center;gap:1.25rem;padding:0.75rem 0;">
          <img src="./assets/mascot.png" alt="Mascotte Nidal" style="height:65px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15));">
          <div>
            <p style="color:var(--text-muted);margin:0;font-size:0.95rem;">Aucun contenu planifié pour le <strong>${formatDate(date, 'long')}</strong>.</p>
            <button class="btn btn--primary btn--sm" style="margin-top:0.5rem;" onclick="ContentsView.openCreateForm('${toISODate(date)}')">+ Planifier un contenu</button>
          </div>
        </div>
      `;
      return;
    }

    detail.innerHTML = `
      <h3 style="margin-bottom:0.75rem;">📅 ${formatDate(date, 'long')} — ${contents.length} élément(s)</h3>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        ${contents.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem;background:var(--bg-app);border-radius:var(--radius-sm);">
            <div>
              <span>${getContentType(c.type).icon} <strong>${escapeHtml(c.titre)}</strong></span>
              <span class="badge badge--${c.statut}" style="margin-left:0.5rem;">${getStatus(c.statut).label}</span>
              ${c.auteur ? `<span style="margin-left:0.5rem;color:var(--text-muted);font-size:0.8rem;">par ${escapeHtml(c.auteur)}</span>` : ''}
            </div>
            <button class="btn btn--icon btn--sm" onclick="ContentsView.openEditForm('${c.id}')" aria-label="Modifier ${escapeHtml(c.titre)}">✏️</button>
          </div>
        `).join('')}
      </div>
    `;
    announceToScreenReader(`${contents.length} contenus affichés pour le ${formatDate(date, 'long')}`);
  }

  return { render };
})();
