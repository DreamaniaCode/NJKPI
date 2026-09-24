/**
 * NidalImport — Import de contenus depuis des liens sociaux (Instagram, Facebook, TikTok...).
 * Détection automatique de la plateforme et du type de contenu.
 */
const NidalImport = (() => {
  const PLATFORM_PATTERNS = [
    { pattern: /instagram\.com/i, platform: 'Instagram (IG)', icon: '📷' },
    { pattern: /facebook\.com|fb\.watch/i, platform: 'Facebook (FB)', icon: '📘' },
    { pattern: /tiktok\.com/i, platform: 'TikTok', icon: '🎵' },
    { pattern: /youtube\.com|youtu\.be/i, platform: 'YouTube', icon: '🎥' },
    { pattern: /linkedin\.com/i, platform: 'LinkedIn', icon: '💼' },
    { pattern: /x\.com|twitter\.com/i, platform: 'X / Twitter', icon: '🐦' }
  ];

  const TYPE_PATTERNS = [
    { pattern: /\/reel\//i, type: 'Reel', format: 'video' },
    { pattern: /\/stories\//i, type: 'Story', format: 'story' },
    { pattern: /\/shorts\//i, type: 'Short', format: 'video' },
    { pattern: /\/watch\?|youtu\.be|fb\.watch|\/videos\//i, type: 'Vidéo', format: 'video' },
    { pattern: /\/p\/|\/posts\/|\/status\//i, type: 'Post', format: 'post' }
  ];

  function detectUrl(url) {
    if (!url || typeof url !== 'string') return { platform: 'Inconnu', platformIcon: '🔗', contentType: 'Publication', format: 'post', isValid: false };
    const trimmed = url.trim();
    let platform = 'Inconnu', platformIcon = '🔗';
    for (const p of PLATFORM_PATTERNS) {
      if (p.pattern.test(trimmed)) { platform = p.platform; platformIcon = p.icon; break; }
    }
    let contentType = 'Publication', format = 'post';
    for (const t of TYPE_PATTERNS) {
      if (t.pattern.test(trimmed)) { contentType = t.type; format = t.format; break; }
    }
    const isValid = platform !== 'Inconnu' && /^https?:\/\/.+/.test(trimmed);
    return { platform, platformIcon, contentType, format, isValid };
  }

  function openImportModal() {
    let urlCount = 1;
    const maxUrls = 10;

    const renderUrlRows = (count) => {
      let html = '';
      for (let i = 0; i < count; i++) {
        html += `
          <div class="import-url-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <input type="url" class="form-control import-url-field" placeholder="https://www.instagram.com/reel/..." style="flex:1;" data-idx="${i}">
            <span class="import-url-preview" data-preview-idx="${i}" style="font-size:11px;white-space:nowrap;min-width:140px;"></span>
            ${i > 0 ? `<button type="button" class="btn btn--secondary btn--sm import-remove-row" data-remove-idx="${i}" style="padding:2px 8px;">✕</button>` : ''}
          </div>`;
      }
      return html;
    };

    openModal('🔗 Importer depuis un lien', `
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">
        Collez un lien Instagram, Facebook, TikTok, YouTube ou LinkedIn pour importer automatiquement le contenu.
      </p>
      <div id="import-url-container">
        ${renderUrlRows(1)}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <button type="button" class="btn btn--secondary btn--sm" id="import-add-more">+ Ajouter un autre lien</button>
        <span id="import-count-label" style="font-size:11px;color:var(--muted);">1 lien</span>
      </div>
    `, {
      footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="import-submit-btn">🔗 Importer (1 lien)</button>`,
      onOpen: modal => {
        const container = modal.querySelector('#import-url-container');
        const addBtn = modal.querySelector('#import-add-more');
        const submitBtn = modal.querySelector('#import-submit-btn');
        const countLabel = modal.querySelector('#import-count-label');

        function updatePreviews() {
          const fields = container.querySelectorAll('.import-url-field');
          let validCount = 0;
          fields.forEach(field => {
            const idx = field.dataset.idx;
            const preview = container.querySelector(`[data-preview-idx="${idx}"]`) || modal.querySelector(`[data-preview-idx="${idx}"]`);
            const val = field.value.trim();
            if (!val) { if (preview) preview.innerHTML = ''; return; }
            const det = detectUrl(val);
            if (preview) {
              preview.innerHTML = det.isValid
                ? `${det.platformIcon} ${det.platform} · ${det.contentType} · <span style="color:var(--green);">✅</span>`
                : `<span style="color:var(--red);">❌ Lien non reconnu</span>`;
            }
            if (det.isValid) validCount++;
          });
          const total = fields.length;
          countLabel.textContent = `${validCount}/${total} lien(s) valide(s)`;
          submitBtn.textContent = `🔗 Importer (${validCount} lien${validCount > 1 ? 's' : ''})`;
          submitBtn.disabled = validCount === 0;
        }

        // Debounced input handler
        let debounceTimer;
        container.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(updatePreviews, 250);
        });

        addBtn.onclick = () => {
          urlCount++;
          if (urlCount > maxUrls) { showToast(`Maximum ${maxUrls} liens à la fois`, 'info'); return; }
          const row = document.createElement('div');
          row.className = 'import-url-row';
          row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
          row.innerHTML = `
            <input type="url" class="form-control import-url-field" placeholder="https://..." style="flex:1;" data-idx="${urlCount - 1}">
            <span class="import-url-preview" data-preview-idx="${urlCount - 1}" style="font-size:11px;white-space:nowrap;min-width:140px;"></span>
            <button type="button" class="btn btn--secondary btn--sm import-remove-row" data-remove-idx="${urlCount - 1}" style="padding:2px 8px;">✕</button>`;
          container.appendChild(row);
          row.querySelector('.import-remove-row').onclick = () => { row.remove(); urlCount--; updatePreviews(); };
          updatePreviews();
        };

        // Remove row handlers for initial row (if any)
        container.querySelectorAll('.import-remove-row').forEach(btn => {
          btn.onclick = () => { btn.closest('.import-url-row').remove(); urlCount--; updatePreviews(); };
        });

        submitBtn.onclick = async () => {
          const fields = container.querySelectorAll('.import-url-field');
          const urls = [];
          fields.forEach(f => { const v = f.value.trim(); if (v && detectUrl(v).isValid) urls.push(v); });
          if (!urls.length) { showToast('Aucun lien valide à importer', 'error'); return; }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Import en cours...';
          const brand = getActiveBrand();
          let imported = 0;

          for (let i = 0; i < urls.length; i++) {
            submitBtn.textContent = `Import en cours... ${i + 1}/${urls.length}`;
            try {
              if (NidalAPI.isOnline()) {
                const result = await NidalAPI.request('/api/import/url', { method: 'POST', body: JSON.stringify({ url: urls[i], brand }) });
                if (result?.content) {
                  const itemToCreate = result.content.data || result.content;
                  if (result.metrics) {
                    itemToCreate.resultats = { ...(itemToCreate.resultats || {}), ...result.metrics };
                  }
                  NidalStore.create(itemToCreate);
                  imported++;
                }
              } else {
                // Fallback : détection locale
                const det = detectUrl(urls[i]);
                NidalStore.create({
                  titre: `Import ${det.platform} — ${det.contentType}`,
                  format: det.format,
                  plateforme: det.platform,
                  statut: 'publie',
                  finalUrl: urls[i],
                  syncStatus: 'pending',
                  notes: `Importé depuis ${urls[i]}`,
                  brand
                });
                imported++;
              }
            } catch (e) {
              console.warn('Erreur import URL:', urls[i], e);
              // Fallback local
              const det = detectUrl(urls[i]);
              NidalStore.create({
                titre: `Import ${det.platform} — ${det.contentType}`,
                format: det.format,
                plateforme: det.platform,
                statut: 'publie',
                finalUrl: urls[i],
                notes: `Importé depuis ${urls[i]}`,
                brand
              });
              imported++;
            }
          }

          closeModal();
          showToast(`${imported} contenu(s) importé(s) avec succès`, 'success');
          App.navigateTo('contents');
        };
      }
    });
  }

  function renderImportButton() {
    return '<button class="btn btn--secondary" id="btn-import-url" title="Importer depuis un lien social">🔗 Importer depuis un lien</button>';
  }

  return { detectUrl, openImportModal, renderImportButton };
})();
