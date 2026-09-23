/**
 * Nidal Junior — Pilotage éditorial
 * Vue Gestion des contenus (CRUD, filtres, recherche, modales, exports)
 */

const ContentsView = (() => {
  let _searchQuery = '';
  let _selectedType = '';
  let _selectedStatus = '';

  function render() {
    const view = document.getElementById('view-contents');
    if (!view) return;

    view.innerHTML = `
      <header class="view__header">
        <div>
          <h1 class="view__title">📝 Gestion des contenus</h1>
          <p class="view__subtitle">Catalogue et suivi des 7 types de contenus éditoriaux</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn--secondary" id="export-csv-btn">📥 Export CSV</button>
          <button class="btn btn--secondary" id="export-xlsx-btn">📊 Export Excel</button>
          <button class="btn btn--primary" id="add-content-btn">+ Nouveau contenu</button>
        </div>
      </header>

      <div class="contents-toolbar">
        <div class="filters-group">
          <input type="search" id="content-search" class="search-input" placeholder="Rechercher par titre, auteur..." value="${escapeHtml(_searchQuery)}" aria-label="Recherche de contenu">
          <select id="filter-type" class="select-input" aria-label="Filtrer par type">
            <option value="">Tous les types</option>
            ${CONTENT_TYPES.map(t => `<option value="${t.id}" ${_selectedType === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
          <select id="filter-status" class="select-input" aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            ${STATUSES.map(s => `<option value="${s.id}" ${_selectedStatus === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Titre</th>
              <th scope="col">Statut</th>
              <th scope="col">Auteur</th>
              <th scope="col">Date de publication</th>
              <th scope="col" style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="contents-tbody"></tbody>
        </table>
      </div>
    `;

    document.getElementById('add-content-btn').onclick = () => openCreateForm();
    document.getElementById('export-csv-btn').onclick = () => NidalExport.exportCSV(_getFilteredContents());
    document.getElementById('export-xlsx-btn').onclick = () => NidalExport.exportExcel(_getFilteredContents());

    document.getElementById('content-search').oninput = debounce(e => {
      _searchQuery = e.target.value.toLowerCase();
      _renderTableBody();
    });

    document.getElementById('filter-type').onchange = e => {
      _selectedType = e.target.value;
      _renderTableBody();
    };

    document.getElementById('filter-status').onchange = e => {
      _selectedStatus = e.target.value;
      _renderTableBody();
    };

    _renderTableBody();
  }

  function _getFilteredContents() {
    return NidalStore.getAll().filter(c => {
      const matchSearch = !_searchQuery ||
        c.titre.toLowerCase().includes(_searchQuery) ||
        c.auteur.toLowerCase().includes(_searchQuery) ||
        (c.description && c.description.toLowerCase().includes(_searchQuery));
      const matchType = !_selectedType || c.type === _selectedType;
      const matchStatus = !_selectedStatus || c.statut === _selectedStatus;
      return matchSearch && matchType && matchStatus;
    });
  }

  function _renderTableBody() {
    const tbody = document.getElementById('contents-tbody');
    if (!tbody) return;
    const items = _getFilteredContents();

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:3rem 1rem;">
            <div style="display:inline-flex;flex-direction:column;align-items:center;gap:0.75rem;">
              <img src="./assets/mascot.png" alt="Mascotte Nidal" style="height:75px;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
              <p style="color:var(--text-muted);margin:0;font-size:0.95rem;">Aucun contenu ne correspond à vos filtres ou à votre recherche.</p>
              <button class="btn btn--primary btn--sm" onclick="ContentsView.openCreateForm()">+ Créer un nouveau contenu</button>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = items.map(c => {
      const type = getContentType(c.type);
      const st = getStatus(c.statut);
      return `
        <tr>
          <td><span style="display:inline-flex;align-items:center;gap:0.4rem;">${type.icon} ${type.label}</span></td>
          <td>
            <strong>${escapeHtml(c.titre)}</strong>
            ${c.description ? `<p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.2rem;">${escapeHtml(c.description.substring(0, 70))}${c.description.length > 70 ? '…' : ''}</p>` : ''}
          </td>
          <td><span class="badge badge--${c.statut}">${st.label}</span></td>
          <td>${escapeHtml(c.auteur)}</td>
          <td>${formatDate(c.datePublication)}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="btn btn--icon btn--sm" onclick="ContentsView.openEditForm('${c.id}')" aria-label="Modifier ${escapeHtml(c.titre)}" title="Modifier">✏️</button>
            <button class="btn btn--icon btn--sm" onclick="ContentsView.deleteContent('${c.id}')" aria-label="Supprimer ${escapeHtml(c.titre)}" title="Supprimer">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function _formHtml(c = {}) {
    return `
      <form id="content-form" onsubmit="return false;">
        <div class="form-group">
          <label class="form-label" for="form-title">Titre du contenu *</label>
          <input type="text" id="form-title" class="form-control" required value="${escapeHtml(c.titre || '')}" placeholder="ex: Les dinosaures méconnus">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="form-type">Type de contenu</label>
            <select id="form-type" class="form-control">
              ${CONTENT_TYPES.map(t => `<option value="${t.id}" ${c.type === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="form-status">Statut de publication</label>
            <select id="form-status" class="form-control">
              ${STATUSES.map(s => `<option value="${s.id}" ${c.statut === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="form-author">Auteur / Rédacteur</label>
            <input type="text" id="form-author" class="form-control" value="${escapeHtml(c.auteur || '')}" placeholder="ex: Marie Dupont">
          </div>
          <div class="form-group">
            <label class="form-label" for="form-date">Date de publication</label>
            <input type="date" id="form-date" class="form-control" value="${toISODate(c.datePublication)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="form-desc">Synopsis / Description</label>
          <textarea id="form-desc" class="form-control" rows="3" placeholder="Résumé ou note d'intention éditoriale...">${escapeHtml(c.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="form-tags">Mots-clés / Tags (séparés par des virgules)</label>
          <input type="text" id="form-tags" class="form-control" value="${(c.tags || []).join(', ')}" placeholder="nature, science, jeunesse">
        </div>
      </form>
    `;
  }

  function openCreateForm(defaultDate = '') {
    openModal('Créer un nouveau contenu', _formHtml({ datePublication: defaultDate }), {
      footer: `
        <button class="btn btn--secondary" data-close-modal>Annuler</button>
        <button class="btn btn--primary" id="save-content-btn">Enregistrer</button>
      `,
      onOpen: (modal) => {
        modal.querySelector('#save-content-btn').onclick = () => {
          const titre = modal.querySelector('#form-title').value.trim();
          if (!titre) return showToast('Le titre est obligatoire', 'error');

          NidalStore.create({
            titre,
            type: modal.querySelector('#form-type').value,
            statut: modal.querySelector('#form-status').value,
            auteur: modal.querySelector('#form-author').value.trim(),
            datePublication: modal.querySelector('#form-date').value,
            description: modal.querySelector('#form-desc').value.trim(),
            tags: modal.querySelector('#form-tags').value.split(',').map(t => t.trim()).filter(Boolean)
          });
          closeModal();
          showToast('Nouveau contenu créé avec succès', 'success');
          render();
        };
      }
    });
  }

  function openEditForm(id) {
    const item = NidalStore.getById(id);
    if (!item) return;

    openModal('Modifier le contenu', _formHtml(item), {
      footer: `
        <button class="btn btn--secondary" data-close-modal>Annuler</button>
        <button class="btn btn--primary" id="save-content-btn">Mettre à jour</button>
      `,
      onOpen: (modal) => {
        modal.querySelector('#save-content-btn').onclick = () => {
          const titre = modal.querySelector('#form-title').value.trim();
          if (!titre) return showToast('Le titre est obligatoire', 'error');

          NidalStore.update(id, {
            titre,
            type: modal.querySelector('#form-type').value,
            statut: modal.querySelector('#form-status').value,
            auteur: modal.querySelector('#form-author').value.trim(),
            datePublication: modal.querySelector('#form-date').value,
            description: modal.querySelector('#form-desc').value.trim(),
            tags: modal.querySelector('#form-tags').value.split(',').map(t => t.trim()).filter(Boolean)
          });
          closeModal();
          showToast('Contenu mis à jour', 'success');
          render();
        };
      }
    });
  }

  function deleteContent(id) {
    const item = NidalStore.getById(id);
    const title = item ? item.titre : 'ce contenu';
    confirmAction(`Êtes-vous sûr de vouloir supprimer définitivement « ${title} » ?`, () => {
      NidalStore.remove(id);
      showToast('Contenu supprimé avec succès', 'success');
      render();
    });
  }

  return { render, openCreateForm, openEditForm, deleteContent };
})();
