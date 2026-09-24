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
        <div class="header-actions"><button class="btn btn--secondary" id="export-btn">📤 Exporter</button><button class="btn btn--secondary" id="import-url-btn">🔗 Importer</button><button class="btn btn--secondary" id="weekly-content-btn">📅 Planifier 7 jours</button><button class="btn btn--secondary" id="bulk-content-btn">＋ Création en masse</button><button class="btn btn--primary" id="add-content-btn">+ Nouveau contenu</button></div>
      </header>
      <div class="contents-toolbar">
        <input type="search" id="content-search" class="search-input" placeholder="Rechercher un titre, une classe ou un album" value="${escapeHtml(_query)}" aria-label="Rechercher">
        <select id="filter-format" class="select-input" aria-label="Filtrer par format"><option value="">Tous les formats</option>${CONTENT_TYPES.map(type => `<option value="${type.id}" ${_format === type.id ? 'selected' : ''}>${type.label}</option>`).join('')}</select>
        <select id="filter-level" class="select-input" aria-label="Filtrer par niveau"><option value="">Tous les niveaux</option>${LEVELS.map(level => `<option value="${level.id}" ${_level === level.id ? 'selected' : ''}>${level.label}</option>`).join('')}</select>
        <select id="filter-status" class="select-input" aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${STATUSES.map(status => `<option value="${status.id}" ${_status === status.id ? 'selected' : ''}>${status.label}</option>`).join('')}</select>
      </div>
      <div class="table-responsive"><table class="data-table"><thead><tr><th>Date</th><th>Contenu</th><th>Public</th><th>Format</th><th>Statut</th><th>Controle</th><th class="actions-column">Actions</th></tr></thead><tbody id="contents-tbody"></tbody></table></div>`;
    document.getElementById('add-content-btn').onclick = () => openCreateForm();
    document.getElementById('bulk-content-btn').onclick = () => openBulkCreateForm();
    document.getElementById('weekly-content-btn').onclick = () => openWeeklyCreateForm();
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

  function _formHtml(content = {}, options = {}) {
    const checks = content.checks || { logo: true, valeurs: true, footer: true, autorisation: true };
    const objectifs = content.objectifs || { portee: 1000, interactions: 50, clics: 5 };
    const resultats = content.resultats || {};
    const includePublishActions = Boolean(options.includePublishActions);
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
        <div class="form-row">
          <div class="form-group">
            <label>Photo / vidéo à publier</label>
            <div class="media-upload-box">
              <input type="file" id="form-media-file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" hidden>
              <button type="button" class="btn btn--secondary" id="form-media-upload-btn">📷 Choisir une photo / vidéo</button>
              <span id="form-media-upload-status" class="media-upload-box__status">${content.mediaUrl ? 'Média déjà associé' : 'Aucun fichier choisi'}</span>
              <div id="form-media-preview" class="media-upload-preview">${content.mediaUrl ? `<img src="${_value(content.mediaUrl)}" alt="Aperçu du média" onerror="this.style.display='none'">` : ''}</div>
              <input type="url" id="form-media-url" class="form-control media-upload-box__url" value="${_value(content.mediaUrl)}" placeholder="URL créée automatiquement après upload">
            </div>
            <small style="color:var(--muted);">Le fichier est envoyé sur NJKPI puis une URL publique est générée automatiquement pour Meta.</small>
          </div>
          <div class="form-group">
            <label for="form-link-url">Lien CTA / site à partager</label>
            <input type="url" id="form-link-url" class="form-control" value="${_value(content.linkUrl)}" placeholder="https://gsnidal.ma/...">
            <small style="color:var(--muted);">Utilisé pour les publications Facebook avec lien.</small>
          </div>
        </div>
        <div class="form-group">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <label for="form-final-url">Lien final après publication</label>
              <button type="button" class="btn btn--secondary btn--sm" id="btn-sync-url-metrics" style="padding:2px 8px;font-size:11px;" title="Récupérer les likes, commentaires et statistiques en direct">🔄 Récupérer Likes & Commentaires</button>
            </div>
            <input type="url" id="form-final-url" class="form-control" value="${_value(content.finalUrl)}" placeholder="https://www.instagram.com/p/...">
        </div>
        <div class="form-row form-row--three"><div class="form-group"><label for="form-format">Format</label><select id="form-format" class="form-control">${_options(CONTENT_TYPES, content.format)}</select></div><div class="form-group"><label for="form-status">Statut</label><select id="form-status" class="form-control">${_options(STATUSES, content.statut)}</select></div><div class="form-group"><label for="form-validation">Validation</label><select id="form-validation" class="form-control">${_options(VALIDATIONS, content.validation)}</select></div></div>
        ${includePublishActions ? `
          <div class="publish-choice-panel">
            <div>
              <span class="section-kicker">Publication Meta</span>
              <strong>Les actions sont disponibles en bas de la fenêtre</strong>
              <small>Enregistrer, Programmer ou Publier maintenant. La programmation utilise la date et l'heure ci-dessus.</small>
            </div>
          </div>
        ` : ''}
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
      titre: modal.querySelector('#form-title').value.trim(), datePublication: modal.querySelector('#form-date').value, heure: modal.querySelector('#form-time').value, mediaUrl: modal.querySelector('#form-media-url')?.value.trim() || '', linkUrl: modal.querySelector('#form-link-url')?.value.trim() || '', finalUrl: modal.querySelector('#form-final-url').value.trim(),
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

  function _bindMediaUpload(modal) {
    const fileInput = modal.querySelector('#form-media-file');
    const uploadBtn = modal.querySelector('#form-media-upload-btn');
    const urlInput = modal.querySelector('#form-media-url');
    const status = modal.querySelector('#form-media-upload-status');
    const preview = modal.querySelector('#form-media-preview');
    if (!fileInput || !uploadBtn || !urlInput) return;

    const renderPreview = (url, type = '') => {
      if (!preview) return;
      if (!url) { preview.innerHTML = ''; return; }
      preview.innerHTML = type.startsWith('video/')
        ? `<video src="${escapeHtml(url)}" controls preload="metadata"></video>`
        : `<img src="${escapeHtml(url)}" alt="Aperçu du média">`;
    };

    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Téléversement…';
      if (status) status.textContent = `${file.name} · envoi en cours`;

      try {
        const uploaded = await NidalAPI.uploadMedia(file);
        urlInput.value = uploaded.url || '';
        if (status) status.textContent = `${file.name} · prêt`;
        renderPreview(uploaded.url, file.type);
        showToast('Média envoyé et prêt pour Meta.', 'success');
      } catch (error) {
        if (status) status.textContent = 'Échec du téléversement';
        showToast('Upload impossible : ' + error.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📷 Choisir une photo / vidéo';
      }
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

  function _platformsFromValue(value = '') {
    const text = String(value || '').toLowerCase();
    const platforms = [];
    if (text.includes('instagram') || text.includes('ig')) platforms.push('instagram');
    if (text.includes('facebook') || text.includes('fb')) platforms.push('facebook');
    return [...new Set(platforms)];
  }

  function _mediaTypeForContent(values = {}) {
    const text = `${values.format || ''} ${values.plateforme || ''}`.toLowerCase();
    if (text.includes('reel') || text.includes('video') || text.includes('vidéo')) return 'reel';
    return values.mediaUrl ? 'image' : 'text';
  }

  function _captionForContent(values = {}) {
    return [values.message, values.cta].filter(Boolean).join('\n\n').trim();
  }

  function _scheduledAtFromContent(values = {}) {
    if (!values.datePublication) throw new Error('Choisissez une date de publication.');
    const time = values.heure || '18:30';
    const date = new Date(`${values.datePublication}T${time}:00`);
    if (Number.isNaN(date.getTime())) throw new Error('Date ou heure de publication invalide.');
    return date;
  }

  async function _queueContentPublication(values, mode) {
    if (!NidalAPI.isOnline()) throw new Error('Le serveur NJKPI doit être connecté pour publier via Meta.');
    const platforms = _platformsFromValue(values.plateforme);
    if (!platforms.length) throw new Error('Choisissez Instagram, Facebook ou les deux.');

    if (platforms.includes('instagram') && !values.mediaUrl) {
      throw new Error('Ajoutez une URL média publique pour publier sur Instagram.');
    }

    const scheduledAt = mode === 'schedule' ? _scheduledAtFromContent(values) : new Date();
    const job = await NidalAPI.createPublishJob({
      brand: getActiveBrand(),
      message: _captionForContent(values),
      mediaUrl: values.mediaUrl || '',
      linkUrl: values.linkUrl || '',
      mediaType: _mediaTypeForContent(values),
      platforms,
      scheduledAt: scheduledAt.toISOString(),
      automationMode: mode === 'schedule' ? 'scheduled' : 'manual'
    });

    if (mode === 'now') return NidalAPI.runPublishJob(job.id);
    return job;
  }

  function _bulkPlatformOptions(selected = 'Instagram + Facebook (IG + FB)') {
    const items = [
      'Instagram + Facebook (IG + FB)',
      'Instagram (IG)',
      'Facebook (FB)'
    ];
    return items.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('');
  }

  function _localISODate(date) {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
  }

  function _bulkRowHtml(index, defaultDate = '', dayLabel = '') {
    return `
      <article class="bulk-post-row" data-bulk-row data-day-label="${dayLabel ? escapeHtml(dayLabel) : ''}">
        <div class="bulk-post-row__number">${dayLabel ? escapeHtml(dayLabel) : '#' + (index + 1)}</div>
        <div class="bulk-post-row__fields">
          <div class="form-row">
            <div class="form-group"><label>Titre *</label><input class="form-control" data-bulk-title placeholder="Titre du post"></div>
            <div class="form-group">
              <label>Photo / vidéo</label>
              <input class="form-control" type="file" data-bulk-file accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm">
              <input type="hidden" data-bulk-media>
            </div>
          </div>
          <div class="form-group"><label>Texte / légende</label><textarea class="form-control" rows="3" data-bulk-message placeholder="Texte du post..."></textarea></div>
          <div class="form-row form-row--three">
            <div class="form-group"><label>Date</label><input class="form-control" type="date" data-bulk-date value="${escapeHtml(defaultDate)}"></div>
            <div class="form-group"><label>Heure</label><input class="form-control" type="time" data-bulk-time value="18:30"></div>
            <div class="form-group"><label>Format</label><select class="form-control" data-bulk-format><option value="post">Post</option><option value="video">Vidéo</option><option value="reel">Reel</option><option value="story">Story</option></select></div>
          </div>
        </div>
        <button type="button" class="btn btn--icon btn--danger-text" data-remove-bulk title="Supprimer cette ligne">×</button>
      </article>`;
  }

  function openBulkCreateForm(defaultDate = '', weekMode = false) {
    let rowCount = weekMode ? 7 : 3;
    const now = new Date();
    const today = defaultDate || _localISODate(now);
    const weekRows = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() + index);
      return {
        date: _localISODate(date),
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
      };
    });
    const html = `
      <div class="bulk-create">
        <div class="bulk-create__defaults">
          <div class="form-group">
            <label for="bulk-platform">Plateforme pour le lot</label>
            <select id="bulk-platform" class="form-control">${_bulkPlatformOptions()}</select>
          </div>
          <div class="form-group">
            <label for="bulk-mode">Action après création</label>
            <select id="bulk-mode" class="form-control">
              <option value="save" ${weekMode ? '' : 'selected'}>Enregistrer seulement</option>
              <option value="schedule" ${weekMode ? 'selected' : ''}>Programmer chaque post</option>
              <option value="now">Publier maintenant</option>
            </select>
          </div>
        </div>
        <div class="bulk-create__toolbar">
          <div>
            <span class="section-kicker">${weekMode ? 'Planning 7 jours' : 'Création en masse'}</span>
            <strong>${weekMode ? 'Préparez votre semaine complète de publications' : 'Préparez plusieurs posts en une seule fois'}</strong>
          </div>
          ${weekMode ? '<span class="badge badge--planifie">7 jours</span>' : '<button type="button" class="btn btn--secondary btn--sm" id="bulk-add-row">+ Ajouter un post</button>'}
        </div>
        <div id="bulk-rows" class="bulk-post-list">
          ${weekMode
            ? weekRows.map((row, i) => _bulkRowHtml(i, row.date, row.label)).join('')
            : [0,1,2].map(i => _bulkRowHtml(i, today)).join('')}
        </div>
      </div>`;

    openModal(weekMode ? 'Planifier une semaine' : 'Créer plusieurs contenus', html, {
      footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="bulk-create-btn">${weekMode ? 'Programmer la semaine' : 'Créer le lot'}</button>`,
      onOpen: modal => {
        const rows = modal.querySelector('#bulk-rows');
        const renumber = () => modal.querySelectorAll('[data-bulk-row]').forEach((row, idx) => {
          const number = row.querySelector('.bulk-post-row__number');
          if (number) number.textContent = row.dataset.dayLabel || `#${idx + 1}`;
        });
        const bindRemovers = () => modal.querySelectorAll('[data-remove-bulk]').forEach(btn => {
          btn.onclick = () => {
            const all = modal.querySelectorAll('[data-bulk-row]');
            if (all.length <= 1) return showToast('Gardez au moins un post dans le lot.', 'error');
            btn.closest('[data-bulk-row]')?.remove();
            renumber();
          };
        });

        bindRemovers();

        const addRowBtn = modal.querySelector('#bulk-add-row');
        if (addRowBtn) addRowBtn.onclick = () => {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = _bulkRowHtml(rowCount++, today);
          rows.appendChild(wrapper.firstElementChild);
          bindRemovers();
          renumber();
        };

        modal.querySelector('#bulk-create-btn').onclick = async () => {
          const button = modal.querySelector('#bulk-create-btn');
          const platform = modal.querySelector('#bulk-platform').value;
          const mode = modal.querySelector('#bulk-mode').value;
          const rowEls = [...modal.querySelectorAll('[data-bulk-row]')];
          const batch = rowEls.map(row => ({
            titre: row.querySelector('[data-bulk-title]').value.trim(),
            message: row.querySelector('[data-bulk-message]').value.trim(),
            mediaUrl: row.querySelector('[data-bulk-media]').value.trim(),
            mediaFile: row.querySelector('[data-bulk-file]')?.files?.[0] || null,
            datePublication: row.querySelector('[data-bulk-date]').value,
            heure: row.querySelector('[data-bulk-time]').value || '18:30',
            format: row.querySelector('[data-bulk-format]').value || 'post',
            plateforme: platform
          })).filter(item => item.titre);

          if (!batch.length) return showToast('Ajoutez au moins un titre.', 'error');

          if (mode === 'schedule' && batch.some(item => !item.datePublication)) {
            return showToast('Chaque post programmé doit avoir une date.', 'error');
          }

          button.disabled = true;
          button.textContent = 'Création du lot…';
          let queued = 0;
          let published = 0;
          const errors = [];

          for (const item of batch) {
            try {
              if (item.mediaFile) {
                const uploaded = await NidalAPI.uploadMedia(item.mediaFile);
                item.mediaUrl = uploaded.url || '';
              }
            } catch (error) {
              errors.push(`${item.titre}: upload média impossible — ${error.message}`);
              continue;
            }

            const needsInstagram = _platformsFromValue(platform).includes('instagram') && mode !== 'save';
            if (needsInstagram && !item.mediaUrl) {
              errors.push(`${item.titre}: photo/vidéo requise pour Instagram`);
              continue;
            }

            const { mediaFile, ...cleanItem } = item;
            const values = {
              ...cleanItem,
              statut: mode === 'now' ? 'en-production' : 'planifie',
              validation: 'a-valider',
              niveau: 'tous',
              classes: '',
              album: '',
              pilier: '',
              objectif: '',
              cta: '',
              livrable: '',
              notes: '',
              finalUrl: '',
              objectifs: { portee: 1000, vues: 1500, commentaires: 15, interactions: 50, clics: 10, conversions: 5, eta: item.datePublication },
              resultats: {},
              checks: { logo: true, valeurs: true, footer: true, autorisation: true }
            };
            const created = NidalStore.create(values);

            if (mode !== 'save') {
              try {
                await _queueContentPublication(values, mode);
                if (mode === 'now') {
                  NidalStore.update(created.id, { statut: 'publie' });
                  published++;
                } else {
                  queued++;
                }
              } catch (error) {
                errors.push(`${item.titre}: ${error.message}`);
              }
            }
          }

          closeModal();
          const base = `${batch.length} contenu${batch.length > 1 ? 's' : ''} créé${batch.length > 1 ? 's' : ''}`;
          if (errors.length) {
            showToast(`${base}. ${errors.length} publication(s) à vérifier.`, 'error');
          } else if (mode === 'now') {
            showToast(`${base} · ${published} publié${published > 1 ? 's' : ''}.`, 'success');
          } else if (mode === 'schedule') {
            showToast(`${base} · ${queued} programmé${queued > 1 ? 's' : ''}.`, 'success');
          } else {
            showToast(base + '.', 'success');
          }
        };
      }
    });
  }

  function openWeeklyCreateForm() {
    openBulkCreateForm('', true);
  }

  function openCreateForm(defaultDate = '') {
    const today = defaultDate || new Date().toISOString().slice(0, 10);
    const initial = { datePublication: today, heure: '18:30', format: 'post', statut: 'planifie', niveau: 'tous', validation: 'a-valider', plateforme: 'Instagram + Facebook (IG + FB)', mediaUrl: '', checks: { logo: true, valeurs: true, footer: true, autorisation: true }, objectifs: { portee: 1000, vues: 1500, commentaires: 15, interactions: 50, clics: 10, conversions: 5, eta: today }, resultats: {} };
    openModal('Nouveau contenu', _formHtml(initial, { includePublishActions: true }), {
      footer: `
        <button type="button" class="btn btn--secondary" data-close-modal>Annuler</button>
        <button type="button" class="btn btn--secondary" id="save-content-btn">Enregistrer</button>
        <button type="button" class="btn btn--secondary" id="schedule-content-btn">🗓 Programmer</button>
        <button type="button" class="btn btn--primary" id="publish-content-btn">🚀 Publier maintenant</button>
      `,
      onOpen: modal => {
        _bindFormSync(modal);
        _bindMediaUpload(modal);

        const runAction = async (mode, button) => {
          const values = _readForm(modal);
          if (!values.titre) return showToast('Le titre est obligatoire', 'error');
          if (mode === 'schedule' && !values.datePublication) return showToast('Choisissez la date de programmation.', 'error');
          if (mode !== 'save' && _platformsFromValue(values.plateforme).includes('instagram') && !values.mediaUrl) {
            return showToast('Choisissez et téléversez une photo ou vidéo pour Instagram.', 'error');
          }

          const buttons = [...modal.querySelectorAll('#save-content-btn,#schedule-content-btn,#publish-content-btn')];
          buttons.forEach(btn => btn.disabled = true);
          const original = button.textContent;
          button.textContent = mode === 'now' ? 'Publication…' : (mode === 'schedule' ? 'Programmation…' : 'Enregistrement…');

          const created = NidalStore.create({
            ...values,
            statut: mode === 'now' ? 'en-production' : values.statut
          });

          try {
            if (mode === 'now') {
              await _queueContentPublication(values, 'now');
              NidalStore.update(created.id, { statut: 'publie' });
            } else if (mode === 'schedule') {
              await _queueContentPublication(values, 'schedule');
              NidalStore.update(created.id, { statut: 'planifie' });
            }

            closeModal();
            showToast(
              mode === 'now' ? 'Contenu créé et envoyé à Meta.' :
              mode === 'schedule' ? 'Contenu créé et publication programmée.' :
              'Contenu enregistré.',
              'success'
            );
          } catch (error) {
            NidalStore.update(created.id, { statut: 'planifie', notes: [values.notes, 'Publication Meta à vérifier : ' + error.message].filter(Boolean).join('\n') });
            buttons.forEach(btn => btn.disabled = false);
            button.textContent = original;
            showToast('Contenu enregistré, mais publication Meta non terminée : ' + error.message, 'error');
          }
        };

        modal.querySelector('#save-content-btn').onclick = event => runAction('save', event.currentTarget);
        modal.querySelector('#schedule-content-btn').onclick = event => runAction('schedule', event.currentTarget);
        modal.querySelector('#publish-content-btn').onclick = event => runAction('now', event.currentTarget);
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
        _bindMediaUpload(modal);
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
  return { render, openCreateForm, openBulkCreateForm, openWeeklyCreateForm, openEditForm, deleteContent };
})();
