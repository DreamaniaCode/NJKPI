/** Calendrier mensuel des publications sociales. */
const PlanningView = (() => {
  const _now = new Date();
  let _year = _now.getFullYear();
  let _month = _now.getMonth();

  function render() {
    const view = document.getElementById('view-planning');
    if (!view) return;
    view.innerHTML = `
      <header class="view__header workspace-header">
        <div><span class="section-kicker">Organisation</span><h1 class="view__title">Planning editorial</h1><p class="view__subtitle">${getActiveBrand() === 'nidal-junior' ? 'Calendrier Instagram uniquement' : 'Calendrier Facebook et Instagram'} · ${escapeHtml(getActiveBrandLabel())}</p></div>
        <button class="btn btn--primary" onclick="ContentsView.openCreateForm()">+ Planifier un contenu</button>
      </header>
      <section class="planning">
        <div class="planning__nav"><button class="btn btn--icon" id="plan-prev" aria-label="Mois precedent">‹</button><h2 id="plan-month-lbl"></h2><button class="btn btn--icon" id="plan-next" aria-label="Mois suivant">›</button><button class="btn btn--secondary btn--sm" id="plan-today">Cette semaine</button></div>
        <div class="planning__weekdays" role="row">${DAYS_FR.map(day => `<div role="columnheader">${day}</div>`).join('')}</div>
        <div class="planning__days" id="plan-grid" role="grid"></div>
        <div class="planning__detail" id="plan-day-detail" aria-live="polite"><p class="empty-copy">Selectionnez un jour pour afficher les publications.</p></div>
        <div class="planning__legend">${CONTENT_TYPES.map(type => `<span><i style="background:${type.color}"></i>${type.label}</span>`).join('')}</div>
      </section>`;
    document.getElementById('plan-prev').onclick = () => _shift(-1);
    document.getElementById('plan-next').onclick = () => _shift(1);
    document.getElementById('plan-today').onclick = () => {
      const today = new Date();
      _year = today.getFullYear();
      _month = today.getMonth();
      _renderGrid();
    };
    _renderGrid();
  }

  function _shift(delta) { _month += delta; if (_month > 11) { _month = 0; _year++; } if (_month < 0) { _month = 11; _year--; } _renderGrid(); }

  function _renderGrid() {
    const label = document.getElementById('plan-month-lbl');
    const grid = document.getElementById('plan-grid');
    if (!label || !grid) return;
    label.textContent = `${MONTHS_FR[_month]} ${_year}`;
    grid.innerHTML = '';
    const firstDay = getFirstDayOfMonth(_year, _month);
    const contents = NidalStore.getAll();
    for (let i = 0; i < firstDay; i++) grid.appendChild(Object.assign(document.createElement('div'), { className: 'planning__day planning__day--empty' }));
    for (let day = 1; day <= getDaysInMonth(_year, _month); day++) {
      const date = new Date(_year, _month, day);
      const dayContents = contents.filter(content => content.datePublication && isSameDay(content.datePublication, date));
      const cell = document.createElement('button');
      cell.type = 'button';
      const today = new Date();
      cell.className = `planning__day ${_year === today.getFullYear() && _month === today.getMonth() && day === today.getDate() ? 'planning__day--today' : ''}`;
      cell.setAttribute('aria-label', `${day} ${MONTHS_FR[_month]} ${_year}, ${dayContents.length} contenu(s)`);
      cell.innerHTML = `<span class="planning__day-number">${day}</span><div class="planning__day-items">${dayContents.slice(0, 3).map(content => `<span style="--item-color:${getContentType(content.format).color}">${escapeHtml(content.titre)}</span>`).join('')}${dayContents.length > 3 ? `<small>+${dayContents.length - 3}</small>` : ''}</div>`;
      cell.onclick = () => _showDetail(date, dayContents);
      grid.appendChild(cell);
    }
  }

  function _showDetail(date, contents) {
    const detail = document.getElementById('plan-day-detail');
    if (!contents.length) {
      detail.innerHTML = `<div class="empty-state"><img src="./assets/mascot.png" alt=""><div><p>Aucun contenu planifie le <strong>${formatDate(toISODate(date), 'long')}</strong>.</p><button class="btn btn--primary btn--sm" onclick="ContentsView.openCreateForm('${toISODate(date)}')">+ Ajouter</button></div></div>`;
      return;
    }

    detail.innerHTML = `
      <h3>${formatDate(toISODate(date), 'long')}</h3>
      <div class="day-content-list">
        ${contents.map(content => {
          const tags = Array.isArray(content.tags)
            ? content.tags
            : (Array.isArray(content.hashtags) ? content.hashtags : []);
          const productionText = content.videoScript
            || content.imagePrompt
            || content.promptImage
            || content.livrable
            || '';
          const storyboardText = Array.isArray(content.storyboard) && content.storyboard.length
            ? JSON.stringify(content.storyboard, null, 2)
            : '';
          return `
            <article class="planning-content-detail" style="padding:10px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;">
              <button type="button" onclick="ContentsView.openEditForm('${content.id}')" style="width:100%;border:0;background:transparent;text-align:left;display:flex;gap:10px;align-items:center;cursor:pointer;padding:0;">
                <span style="width:8px;height:34px;border-radius:8px;background:${getContentType(content.format).color};flex:none;"></span>
                ${content.mediaUrl ? `<img src="${escapeHtml(content.mediaUrl)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">` : ''}
                <div style="flex:1;min-width:0;">
                  <strong>${escapeHtml(content.titre)}</strong>
                  <small style="display:block;">${escapeHtml(content.heure)} · ${escapeHtml(content.plateforme)} · ${escapeHtml(content.classes)}</small>
                  ${tags.length ? `<small style="display:block;color:var(--primary);margin-top:3px;">${escapeHtml(tags.join(' '))}</small>` : ''}
                </div>
                <i class="badge badge--${content.statut}">${escapeHtml(getStatus(content.statut).label)}</i>
              </button>

              ${productionText || storyboardText ? `
                <details style="margin:8px 0 0 18px;">
                  <summary style="cursor:pointer;font-size:11px;font-weight:700;">Voir script / prompt de production</summary>
                  ${productionText ? `<pre style="white-space:pre-wrap;margin:8px 0 0;font-size:10.5px;">${escapeHtml(productionText)}</pre>` : ''}
                  ${storyboardText ? `<pre style="white-space:pre-wrap;margin:8px 0 0;font-size:10px;">${escapeHtml(storyboardText)}</pre>` : ''}
                </details>
              ` : ''}
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  return { render };
})();
