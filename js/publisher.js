/** Publication directe, programmée et file d'automatisation Meta. */
const PublisherView = (() => {
  let _jobs = [];
  let _loading = false;

  function _fmtDate(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('fr-FR'); } catch { return value; }
  }

  function _statusBadge(status) {
    const map = {
      scheduled: ['Planifiée', 'badge--planifie'],
      publishing: ['Publication…', 'badge--en-production'],
      published: ['Publiée', 'badge--publie'],
      partial: ['Partielle', 'badge--pret'],
      failed: ['Échec', 'badge--brouillon']
    };
    const item = map[status] || [status || '—', 'badge--brouillon'];
    return '<span class="badge ' + item[1] + '">' + escapeHtml(item[0]) + '</span>';
  }

  async function _load() {
    if (!NidalAPI.isOnline()) return;
    try {
      _jobs = await NidalAPI.listPublishJobs(getActiveBrand());
    } catch (error) {
      showToast(error.message || 'Impossible de charger la file de publication', 'error');
    }
  }

  async function render() {
    const view = document.getElementById('view-publisher');
    if (!view) return;

    if (!_loading && !_jobs.length && NidalAPI.isOnline()) {
      _loading = true;
      await _load();
      _loading = false;
    }

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Publication Meta</span>
          <h1 class="view__title">Publier & programmer</h1>
          <p class="view__subtitle">Publiez depuis NJKPI vers Instagram, Facebook ou les deux. Les publications planifiées sont exécutées automatiquement par le serveur.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn--secondary" id="publisher-week-btn">📅 Planifier 7 jours</button>
          <button class="btn btn--secondary" id="publisher-bulk-btn">＋ Création en masse</button>
        </div>
      </header>

      <section class="analysis-panel" style="margin-bottom:22px;">
        <div class="section-heading">
          <div>
            <span class="section-kicker">Nouvelle publication</span>
            <h2>Composer et planifier</h2>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1.3fr .7fr;gap:18px;align-items:start;">
          <div>
            <label class="form-label" for="publisher-message">Texte / légende</label>
            <textarea id="publisher-message" class="form-control" rows="8" placeholder="Écrivez le texte de la publication…"></textarea>
          </div>
          <div style="display:grid;gap:12px;">
            <div>
              <label class="form-label">Photo / vidéo</label>
              <div class="media-upload-box">
                <input id="publisher-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" hidden>
                <button class="btn btn--secondary" type="button" id="publisher-media-upload-btn">📷 Choisir une photo / vidéo</button>
                <span id="publisher-media-upload-status" class="media-upload-box__status">Aucun fichier choisi</span>
                <div id="publisher-media-preview" class="media-upload-preview"></div>
                <input id="publisher-media-url" class="form-control media-upload-box__url" type="url" placeholder="URL générée automatiquement">
              </div>
              <small style="color:var(--muted);">NJKPI téléverse le fichier puis fournit l’URL publique attendue par Meta.</small>
            </div>
            <div>
              <label class="form-label" for="publisher-link-url">Lien à partager</label>
              <input id="publisher-link-url" class="form-control" type="url" placeholder="https://gsnidal.ma/...">
            </div>
            <div>
              <label class="form-label" for="publisher-media-type">Type</label>
              <select id="publisher-media-type" class="form-control">
                <option value="text">Texte / lien</option>
                <option value="image">Image</option>
                <option value="reel">Reel / vidéo</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="publisher-scheduled-at">Date et heure</label>
              <input id="publisher-scheduled-at" class="form-control" type="datetime-local">
              <small style="color:var(--muted);">Laissez vide pour publier maintenant.</small>
            </div>
            <div style="display:flex;gap:14px;flex-wrap:wrap;">
              <label><input type="checkbox" id="publisher-instagram" checked> Instagram</label>
              <label><input type="checkbox" id="publisher-facebook" checked> Facebook</label>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn--primary" id="publisher-publish-now-btn">🚀 Publier maintenant</button>
              <button class="btn btn--secondary" id="publisher-schedule-btn">🗓 Programmer</button>
              <button class="btn btn--secondary" id="publisher-refresh-btn">↻ Actualiser la file</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="section-heading">
          <div>
            <span class="section-kicker">Automatisation</span>
            <h2>File de publication</h2>
          </div>
          <span class="badge badge--planifie">${_jobs.length} élément${_jobs.length > 1 ? 's' : ''}</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date prévue</th>
                <th>Plateformes</th>
                <th>Contenu</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Résultat / erreur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${_jobs.length ? _jobs.map(job => `
                <tr>
                  <td><strong>${escapeHtml(_fmtDate(job.scheduled_at))}</strong></td>
                  <td>${(job.platforms || []).map(p => '<span class="badge badge--planifie" style="margin-right:4px;">' + escapeHtml(p) + '</span>').join('')}</td>
                  <td style="min-width:240px;">${escapeHtml(String(job.message || '').slice(0,120) || job.media_url || job.link_url || '—')}</td>
                  <td>${escapeHtml(job.media_type || 'text')}</td>
                  <td>${_statusBadge(job.status)}</td>
                  <td style="max-width:300px;"><small>${escapeHtml(job.error || (job.result && Object.keys(job.result).length ? 'Publication Meta enregistrée' : '—'))}</small></td>
                  <td>${job.status === 'scheduled' ? '<button class="btn btn--secondary btn--sm" data-run-job="' + escapeHtml(job.id) + '">Publier maintenant</button>' : ''}</td>
                </tr>
              `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px;">Aucune publication programmée.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById('publisher-week-btn')?.addEventListener('click', () => {
      if (typeof ContentsView !== 'undefined') ContentsView.openWeeklyCreateForm();
    });
    document.getElementById('publisher-bulk-btn')?.addEventListener('click', () => {
      if (typeof ContentsView !== 'undefined') ContentsView.openBulkCreateForm();
    });

    const mediaFileInput = document.getElementById('publisher-media-file');
    const mediaUploadBtn = document.getElementById('publisher-media-upload-btn');
    const mediaUrlInput = document.getElementById('publisher-media-url');
    const mediaStatus = document.getElementById('publisher-media-upload-status');
    const mediaPreview = document.getElementById('publisher-media-preview');

    if (mediaUploadBtn && mediaFileInput) {
      mediaUploadBtn.onclick = () => mediaFileInput.click();
      mediaFileInput.onchange = async () => {
        const file = mediaFileInput.files?.[0];
        if (!file) return;
        mediaUploadBtn.disabled = true;
        mediaUploadBtn.textContent = 'Téléversement…';
        if (mediaStatus) mediaStatus.textContent = `${file.name} · envoi en cours`;
        try {
          const uploaded = await NidalAPI.uploadMedia(file);
          mediaUrlInput.value = uploaded.url || '';
          if (mediaStatus) mediaStatus.textContent = uploaded.convertedForMeta
            ? `${file.name} · converti automatiquement en JPG · prêt`
            : `${file.name} · prêt`;
          if (mediaPreview) {
            const finalMime = uploaded.mime || file.type;
            mediaPreview.innerHTML = finalMime.startsWith('video/')
              ? `<video src="${escapeHtml(uploaded.url)}" controls preload="metadata"></video>`
              : `<img src="${escapeHtml(uploaded.url)}" alt="Aperçu du média">`;
          }
          document.getElementById('publisher-media-type').value = (uploaded.mime || file.type).startsWith('video/') ? 'reel' : 'image';
          showToast(
            uploaded.convertedForMeta
              ? 'Image convertie automatiquement en JPG et prête pour Facebook + Instagram.'
              : 'Média envoyé et prêt pour publication.',
            'success'
          );
        } catch (error) {
          if (mediaStatus) mediaStatus.textContent = 'Échec du téléversement';
          showToast('Upload impossible : ' + error.message, 'error');
        } finally {
          mediaUploadBtn.disabled = false;
          mediaUploadBtn.textContent = '📷 Choisir une photo / vidéo';
        }
      };
    }

    const submitPublication = async mode => {
      const platforms = [];
      if (document.getElementById('publisher-instagram')?.checked) platforms.push('instagram');
      if (document.getElementById('publisher-facebook')?.checked) platforms.push('facebook');
      if (!platforms.length) return showToast('Sélectionnez Instagram et/ou Facebook.', 'error');

      const scheduledRaw = document.getElementById('publisher-scheduled-at')?.value || '';
      if (mode === 'schedule' && !scheduledRaw) return showToast('Choisissez la date et l’heure de programmation.', 'error');

      const mediaUrl = mediaUrlInput?.value || '';
      if (platforms.includes('instagram') && !mediaUrl) {
        return showToast('Choisissez une photo ou vidéo pour Instagram.', 'error');
      }

      const mediaType = document.getElementById('publisher-media-type')?.value || 'text';
      let preparedMediaUrl = mediaUrl;
      if (platforms.includes('instagram') && preparedMediaUrl && mediaType === 'image') {
        const prepared = await NidalAPI.ensureInstagramCompatibleImage(preparedMediaUrl, mediaType);
        preparedMediaUrl = prepared.url || preparedMediaUrl;
        if (prepared.converted && mediaUrlInput) mediaUrlInput.value = preparedMediaUrl;
      }

      const body = {
        brand: getActiveBrand(),
        message: document.getElementById('publisher-message')?.value || '',
        mediaUrl: preparedMediaUrl,
        linkUrl: document.getElementById('publisher-link-url')?.value || '',
        mediaType,
        platforms,
        scheduledAt: mode === 'schedule' ? new Date(scheduledRaw).toISOString() : new Date().toISOString(),
        automationMode: mode === 'schedule' ? 'scheduled' : 'manual'
      };

      const buttons = [
        document.getElementById('publisher-publish-now-btn'),
        document.getElementById('publisher-schedule-btn')
      ].filter(Boolean);
      buttons.forEach(btn => btn.disabled = true);

      try {
        const job = await NidalAPI.createPublishJob(body);
        if (mode === 'now') {
          const result = await NidalAPI.runPublishJob(job.id);
          if (result.status !== 'published') {
            throw new Error(result.error || `Publication Meta incomplète (statut: ${result.status || 'inconnu'}).`);
          }
        }
        showToast(mode === 'schedule' ? 'Publication programmée.' : 'Publication confirmée par Meta.', 'success');
        _jobs = [];
        await _load();
        render();
      } catch (error) {
        buttons.forEach(btn => btn.disabled = false);
        showToast(error.message || 'Échec de la publication', 'error');
      }
    };

    document.getElementById('publisher-publish-now-btn')?.addEventListener('click', () => submitPublication('now'));
    document.getElementById('publisher-schedule-btn')?.addEventListener('click', () => submitPublication('schedule'));

    document.getElementById('publisher-refresh-btn')?.addEventListener('click', async () => {
      await _load();
      render();
    });

    document.querySelectorAll('[data-run-job]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const result = await NidalAPI.runPublishJob(btn.dataset.runJob);
          if (result.status !== 'published') {
            throw new Error(result.error || `Publication Meta incomplète (statut: ${result.status || 'inconnu'}).`);
          }
          showToast('Publication confirmée par Meta.', 'success');
          await _load();
          render();
        } catch (error) {
          showToast(error.message || 'Échec de la publication', 'error');
        }
      });
    });
  }

  return { render };
})();