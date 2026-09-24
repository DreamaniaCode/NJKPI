/** Gestion complete des contenus sociaux Nidal Junior. */
const ContentsView = (() => {
  let _query = '';
  let _format = '';
  let _status = '';
  let _level = '';

  function render() {
    const view = document.getElementById('view-contents');
    if (!view) return;
    view.innerHTML = `
      <header class="view__header workspace-header">
        <div><span class="section-kicker">Production</span><h1 class="view__title">Contenus</h1><p class="view__subtitle">Messages, statuts, objectifs et resultats au meme endroit</p></div>
        <div class="header-actions"><button class="btn btn--secondary" id="export-btn">📤 Exporter</button><button class="btn btn--secondary" id="import-url-btn">🔗 Importer</button><button class="btn btn--primary" id="add-content-btn">+ Nouveau contenu</button></div>
      </header>
      <div class="contents-toolbar">
        <input type="search" id="content-search" class="search-input" placeholder="Rechercher un titre, une classe ou un album" value="${escapeHtml(_query)}" aria-label="Rechercher">
        <select id="filter-format" class="select-input" aria-label="Filtrer par format"><option value="">Tous les formats</option>${CONTENT_TYPES.map(type => `<option value="${type.id}" ${_format === type.id ? 'selected' : ''}>${type.label}</option>`).join('')}</select>
        <select id="filter-level" class="select-input" aria-label="Filtrer par niveau"><option value="">Tous les niveaux</option>${LEVELS.map(level => `<option value="${level.id}" ${_level === level.id ? 'selected' : ''}>${level.label}</option>`).join('')}</select>
        <select id="filter-status" class="select-input" aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${STATUSES.map(status => `<option value="${status.id}" ${_status === status.id ? 'selected' : ''}>${status.label}</option>`).join('')}</select>
      </div>
      <div class="table-responsive"><table class="data-table"><thead><tr><th>Date</th><th>Contenu</th><th>Public</th><th>Format</th><th>Statut</th><th>Controle</th><th class="actions-column">Actions</th></tr></thead><tbody id="contents-tbody"></tbody></table></div>`;
    document.getElementById('add-content-btn').onclick = () => openCreateForm();
    document.getElementById('export-btn').onclick = () => NidalExport.openExportModal();
    document.getElementById('import-url-btn').onclick = () => { if (typeof NidalImport !== 'undefined') NidalImport.openImportModal(); else showToast('Module d\'import non disponible', 'error'); };
    document.getElementById('content-search').oninput = debounce(event => { _query = event.target.value.toLowerCase(); _renderRows(); });
    document.getElementById('filter-format').onchange = event => { _format = event.target.value; _renderRows(); };
    document.getElementById('filter-level').onchange = event => { _level = event.target.value; _renderRows(); };
    document.getElementById('filter-status').onchange = event => { _status = event.target.value; _renderRows(); };
    _renderRows();
  }

  function _filtered() {
    return NidalStore.getAll().filter(content => {
      const haystack = [content.titre, content.classes, content.album, content.message].join(' ').toLowerCase();
      return (!_query || haystack.includes(_query)) && (!_format || content.format === _format) && (!_status || content.statut === _status) && (!_level || content.niveau === _level);
    });
  }

  function _renderRows() {
    const tbody = document.getElementById('contents-tbody');
    if (!tbody) return;
    const items = _filtered();
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><img src="./assets/mascot.png" alt=""><div><strong>Aucun contenu trouve</strong><p>Modifiez les filtres ou creez un nouveau contenu.</p></div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(content => {
      const control = getControlMeta(NidalStore.getControl(content));
      const platformMeta = typeof getPlatform === 'function' ? getPlatform(content.plateforme) : { icon: '🌐', short: content.plateforme || 'IG + FB' };
      return `<tr>
        <td><strong>${formatDate(content.datePublication, 'compact')}</strong><small>${escapeHtml(content.heure)}</small></td>
        <td><strong>${escapeHtml(content.titre)}</strong><small>${escapeHtml(content.album || content.objectif)}</small></td>
        <td>${escapeHtml(getLevel(content.niveau).label)}<small>${escapeHtml(content.classes)}</small></td>
        <td>${escapeHtml(getContentType(content.format).label)}<span class="badge" style="margin-left:6px;font-size:10px;background:#eef4ff;color:#1746d1;font-weight:600;">${platformMeta.icon} ${escapeHtml(platformMeta.short)}</span></td>
        <td><span class="badge badge--${content.statut}">${escapeHtml(getStatus(content.statut).label)}</span></td>
        <td><span class="control-badge ${control.className}">${control.label}</span></td>
        <td class="actions-column"><button class="btn btn--icon btn--sm" onclick="ContentsView.openEditForm('${content.id}')" aria-label="Modifier ${escapeHtml(content.titre)}" title="Modifier">Modifier</button><button class="btn btn--icon btn--sm btn--danger-text" onclick="ContentsView.deleteContent('${content.id}')" aria-label="Supprimer ${escapeHtml(content.titre)}" title="Supprimer">Supprimer</button></td>
      </tr>`;
    }).join('');
  }

  function _options(items, selected) { return items.map(item => `<option value="${item.id}" ${selected === item.id ? 'selected' : ''}>${item.label}</option>`).join(''); }
  function _value(value) { return value === null || value === undefined ? '' : escapeHtml(value); }

  function _formHtml(content = {}) {
    const checks = content.checks || { logo: true, valeurs: true, footer: true, autorisation: true };
    const objectifs = content.objectifs || { portee: 1000, interactions: 50, clics: 5 };
    const resultats = content.resultats || {};
    const platformList = typeof PLATFORMS !== 'undefined' ? PLATFORMS : [
      { id: 'instagram-facebook', label: 'Instagram + Facebook (IG + FB)', icon: '🌐' },
      { id: 'instagram', label: 'Instagram (IG)', icon: '📷' },
      { id: 'facebook', label: 'Facebook (FB)', icon: '📘' },
      { id: 'reel-ig', label: 'Instagram Reel (IG)', icon: '🎬' },
      { id: 'story-ig', label: 'Instagram Story (IG)', icon: '📱' },
      { id: 'tiktok', label: 'TikTok', icon: '🎵' },
      { id: 'linkedin', label: 'LinkedIn', icon: '💼' }
    ];

    return `<form id="content-form" onsubmit="return false;">
      <div class="form-section"><h3>Publication</h3>
        <div class="form-group form-group--wide"><label for="form-title">Titre *</label><input id="form-title" class="form-control" required value="${_value(content.titre)}"></div>
        <div class="form-row form-row--three"><div class="form-group"><label for="form-date">Date</label><input type="date" id="form-date" class="form-control" value="${toISODate(content.datePublication)}"></div><div class="form-group"><label for="form-time">Heure</label><input type="time" id="form-time" class="form-control" value="${_value(content.heure || '18:30')}"></div><div class="form-group"><label for="form-platform">Plateforme</label><select id="form-platform" class="form-control">${platformList.map(p => `<option value="${p.label}" ${content.plateforme === p.label || content.plateforme === p.id || content.plateforme === p.short || (!content.plateforme && p.id === 'instagram-facebook') ? 'selected' : ''}>${p.icon} ${p.label}</option>`).join('')}</select></div></div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <label for="form-final-url">Lien final après publication</label>
            <button type="button" class="btn btn--secondary btn--sm" id="btn-sync-url-metrics" style="padding:2px 8px;font-size:11px;" title="Récupérer les likes, commentaires et statistiques en direct">🔄 Récupérer Likes & Commentaires</button>
          </div>
          <input type="url" id="form-final-url" class="form-control" value="${_value(content.finalUrl)}" placeholder="https://www.instagram.com/p/...">
        </div>
        <div class="form-row form-row--three"><div class="form-group"><label for="form-format">Format</label><select id="form-format" class="form-control">${_options(CONTENT_TYPES, content.format)}</select></div><div class="form-group"><label for="form-status">Statut</label><select id="form-status" class="form-control">${_options(STATUSES, content.statut)}</select></div><div class="form-group"><label for="form-validation">Validation</label><select id="form-validation" class="form-control">${_options(VALIDATIONS, content.validation)}</select></div></div>
      </div>
      <div class="form-section"><h3>Vision editoriale</h3>
        <div class="form-row"><div class="form-group"><label for="form-level">Niveau</label><select id="form-level" class="form-control">${_options(LEVELS, content.niveau)}</select></div><div class="form-group"><label for="form-classes">Classe(s)</label><input id="form-classes" class="form-control" value="${_value(content.classes)}"></div></div>
        <div class="form-group"><label for="form-album">Album ou univers</label><input id="form-album" class="form-control" value="${_value(content.album)}"></div>
        <div class="form-row"><div class="form-group"><label for="form-pillar">Pilier</label><input id="form-pillar" class="form-control" value="${_value(content.pilier)}"></div><div class="form-group"><label for="form-objective">But</label><input id="form-objective" class="form-control" value="${_value(content.objectif)}"></div></div>
        <div class="form-group"><label for="form-message">Message principal</label><textarea id="form-message" class="form-control" rows="3">${_value(content.message)}</textarea></div>
        <div class="form-row"><div class="form-group"><label for="form-cta">Appel a l’action</label><input id="form-cta" class="form-control" value="${_value(content.cta)}"></div><div class="form-group"><label for="form-deliverable">Livrable</label><input id="form-deliverable" class="form-control" value="${_value(content.livrable)}"></div></div>
      </div>
      <div class="form-section"><h3>Objectifs cibles & Échéance (ETA)</h3>
        <div class="form-row form-row--four">
          ${_numberField('target-reach','Portée cible',objectifs.portee)}
          ${_numberField('target-views','Vues cibles',objectifs.vues)}
          ${_numberField('target-comments','Commentaires cibles',objectifs.commentaires)}
          ${_numberField('target-conversions','Conversions cibles',objectifs.conversions)}
        </div>
        <div class="form-row form-row--three">
          ${_numberField('target-interactions','Interactions cibles',objectifs.interactions)}
          ${_numberField('target-clicks','Clics CTA cibles',objectifs.clics)}
          <div class="form-group"><label for="target-eta">Échéance cible (ETA)</label><input type="date" id="target-eta" class="form-control" value="${toISODate(objectifs.eta || content.datePublication)}"></div>
        </div>
      </div>
      <div class="form-section"><h3>Résultats réels constatés</h3>
        <div class="form-row form-row--four">
          ${_numberField('result-reach','Portée réelle',resultats.portee)}
          ${_numberField('result-views','Vues vidéo',resultats.vues)}
          ${_numberField('result-comments','Commentaires',resultats.commentaires)}
          ${_numberField('result-conversions','Conversions / Inscriptions',resultats.conversions)}
        </div>
        <div class="form-row form-row--four">
          ${_numberField('result-reactions','Réactions',resultats.reactions)}
          ${_numberField('result-shares','Partages',resultats.partages)}
          ${_numberField('result-saves','Enregistrements',resultats.enregistrements)}
          ${_numberField('result-clicks','Clics CTA',resultats.clics)}
        </div>
      </div>
      <div class="form-section"><h3>Controle avant publication</h3><div class="check-grid">${_check('check-logo','Logo officiel',checks.logo)}${_check('check-values','Valeurs de la marque',checks.valeurs)}${_check('check-footer','Pied de page',checks.footer)}${_check('check-consent','Autorisations verifiees ou non requises',checks.autorisation)}</div><div class="form-group"><label for="form-notes">Notes</label><textarea id="form-notes" class="form-control" rows="2">${_value(content.notes)}</textarea></div></div>
    </form>`;
  }

  function _numberField(id, label, value) { return `<div class="form-group"><label for="${id}">${label}</label><input type="number" min="0" id="${id}" class="form-control" value="${_value(value)}" placeholder="—"></div>`; }
  function _check(id, label, checked) { return `<label class="check-item"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span>${label}</span></label>`; }
  function _number(modal, id) { const el = modal.querySelector(`#${id}`); if (!el) return null; const value = el.value; return value === '' ? null : Number(value); }

  function _readForm(modal) {
    return {
      titre: modal.querySelector('#form-title').value.trim(), datePublication: modal.querySelector('#form-date').value, heure: modal.querySelector('#form-time').value, finalUrl: modal.querySelector('#form-final-url').value.trim(),
      plateforme: modal.querySelector('#form-platform').value, format: modal.querySelector('#form-format').value, statut: modal.querySelector('#form-status').value, validation: modal.querySelector('#form-validation').value,
      niveau: modal.querySelector('#form-level').value, classes: modal.querySelector('#form-classes').value.trim(), album: modal.querySelector('#form-album').value.trim(), pilier: modal.querySelector('#form-pillar').value.trim(), objectif: modal.querySelector('#form-objective').value.trim(),
      message: modal.querySelector('#form-message').value.trim(), cta: modal.querySelector('#form-cta').value.trim(), livrable: modal.querySelector('#form-deliverable').value.trim(), notes: modal.querySelector('#form-notes').value.trim(),
      objectifs: {
        portee: _number(modal,'target-reach'),
        vues: _number(modal,'target-views'),
        commentaires: _number(modal,'target-comments'),
        interactions: _number(modal,'target-interactions'),
        clics: _number(modal,'target-clicks'),
        conversions: _number(modal,'target-conversions'),
        eta: modal.querySelector('#target-eta')?.value || ''
      },
      resultats: {
        portee: _number(modal,'result-reach'),
        vues: _number(modal,'result-views'),
        commentaires: _number(modal,'result-comments'),
        reactions: _number(modal,'result-reactions'),
        partages: _number(modal,'result-shares'),
        enregistrements: _number(modal,'result-saves'),
        clics: _number(modal,'result-clicks'),
        conversions: _number(modal,'result-conversions')
      },
      checks: { logo: modal.querySelector('#check-logo').checked, valeurs: modal.querySelector('#check-values').checked, footer: modal.querySelector('#check-footer').checked, autorisation: modal.querySelector('#check-consent').checked }
    };
  }

  function _bindFormSync(modal) {
    const btnSync = modal.querySelector('#btn-sync-url-metrics');
    if (!btnSync) return;
    btnSync.onclick = async () => {
      const urlInput = modal.querySelector('#form-final-url');
      const url = urlInput?.value.trim();
      if (!url) {
        showToast('Veuillez d\'abord coller une URL Instagram ou Facebook', 'error');
        urlInput?.focus();
        return;
      }
      btnSync.disabled = true;
      btnSync.textContent = 'Récupération en direct...';
      try {
        const brand = getActiveBrand();
        const res = await NidalAPI.request('/api/import/url', { method: 'POST', body: JSON.stringify({ url, brand }) });
        if (res?.metrics) {
          const m = res.metrics;
          const setV = (id, val) => { const el = modal.querySelector(`#${id}`); if (el && val !== null && val !== undefined) el.value = val; };
          setV('result-reactions', m.reactions);
          setV('result-comments', m.commentaires);
          setV('result-views', m.vues);
          setV('result-reach', m.portee);
          setV('result-shares', m.partages);
          setV('result-saves', m.enregistrements);
          if (res.content?.data?.titre) {
            const titleEl = modal.querySelector('#form-title');
            if (titleEl && (!titleEl.value || titleEl.value.startsWith('Import '))) titleEl.value = res.content.data.titre;
          }
          if (res.content?.data?.message) {
            const msgEl = modal.querySelector('#form-message');
            if (msgEl && !msgEl.value) msgEl.value = res.content.data.message;
          }
          if (res.content?.data?.plateforme) {
            const platEl = modal.querySelector('#form-platform');
            if (platEl) {
              const opt = Array.from(platEl.options).find(o => o.value.includes(res.content.data.plateforme) || res.content.data.plateforme.includes(o.value));
              if (opt) platEl.value = opt.value;
            }
          }
          if (res.content?.data?.format) {
            const fmtEl = modal.querySelector('#form-format');
            if (fmtEl) fmtEl.value = res.content.data.format;
          }
          showToast(`Métriques synchronisées : ${m.reactions || 0} likes, ${m.commentaires || 0} commentaires !`, 'success');
        } else {
          showToast('Lien analysé, aucune métrique publique trouvée', 'info');
        }
      } catch (err) {
        showToast('Erreur lors de la récupération : ' + err.message, 'error');
      } finally {
        btnSync.disabled = false;
        btnSync.textContent = '🔄 Récupérer Likes & Commentaires';
      }
    };
  }

  function openCreateForm(defaultDate = '') {
    const initial = { datePublication: defaultDate, heure: '18:30', format: 'post', statut: 'planifie', niveau: 'tous', validation: 'a-valider', plateforme: 'Instagram + Facebook (IG + FB)', checks: { logo: true, valeurs: true, footer: true, autorisation: true }, objectifs: { portee: 1000, vues: 1500, commentaires: 15, interactions: 50, clics: 10, conversions: 5, eta: defaultDate }, resultats: {} };
    openModal('Nouveau contenu', _formHtml(initial), {
      footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="save-content-btn">Enregistrer</button>`,
      onOpen: modal => {
        _bindFormSync(modal);
        modal.querySelector('#save-content-btn').onclick = () => {
          const values = _readForm(modal);
          if (!values.titre) return showToast('Le titre est obligatoire', 'error');
          NidalStore.create(values);
          closeModal();
          showToast('Contenu créé', 'success');
        };
      }
    });
  }

  function openEditForm(id) {
    const content = NidalStore.getById(id);
    if (!content) return;
    openModal('Modifier le contenu', _formHtml(content), {
      footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="save-content-btn">Enregistrer</button>`,
      onOpen: modal => {
        _bindFormSync(modal);
        modal.querySelector('#save-content-btn').onclick = () => {
          const values = _readForm(modal);
          if (!values.titre) return showToast('Le titre est obligatoire', 'error');
          NidalStore.update(id, values);
          closeModal();
          showToast('Modifications enregistrées', 'success');
        };
      }
    });
  }

  function deleteContent(id) { const content = NidalStore.getById(id); confirmAction(`Supprimer « ${content?.titre || 'ce contenu'} » ?`, () => { NidalStore.remove(id); showToast('Contenu supprime', 'success'); }); }
  return { render, openCreateForm, openEditForm, deleteContent };
})();
