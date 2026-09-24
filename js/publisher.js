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
              <label class="form-label" for="publisher-media-url">URL média publique</label>
              <input id="publisher-media-url" class="form-control" type="url" placeholder="https://… image ou vidéo">
              <small style="color:var(--muted);">Requis pour Instagram. L’URL doit être accessible publiquement par Meta.</small>
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
              <button class="btn btn--primary" id="publisher-save-btn">Publier / programmer</button>
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

    document.getElementById('publisher-save-btn')?.addEventListener('click', async () => {
      const platforms = [];
      if (document.getElementById('publisher-instagram')?.checked) platforms.push('instagram');
      if (document.getElementById('publisher-facebook')?.checked) platforms.push('facebook');

      const scheduledRaw = document.getElementById('publisher-scheduled-at')?.value || '';
      const body = {
        brand: getActiveBrand(),
        message: document.getElementById('publisher-message')?.value || '',
        mediaUrl: document.getElementById('publisher-media-url')?.value || '',
        linkUrl: document.getElementById('publisher-link-url')?.value || '',
        mediaType: document.getElementById('publisher-media-type')?.value || 'text',
        platforms,
        scheduledAt: scheduledRaw ? new Date(scheduledRaw).toISOString() : new Date().toISOString(),
        automationMode: scheduledRaw ? 'scheduled' : 'manual'
      };

      try {
        const job = await NidalAPI.createPublishJob(body);
        if (!scheduledRaw) await NidalAPI.runPublishJob(job.id);
        showToast(scheduledRaw ? 'Publication programmée.' : 'Publication envoyée à Meta.', 'success');
        _jobs = [];
        await _load();
        render();
      } catch (error) {
        showToast(error.message || 'Échec de la publication', 'error');
      }
    });

    document.getElementById('publisher-refresh-btn')?.addEventListener('click', async () => {
      await _load();
      render();
    });

    document.querySelectorAll('[data-run-job]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await NidalAPI.runPublishJob(btn.dataset.runJob);
          showToast('Publication envoyée à Meta.', 'success');
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