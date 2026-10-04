/** Sélection de médias partagée par les deux formulaires de publication. */
const NidalMediaPicker = (() => {
  function bind({ fileInput, button, urlInput, status, preview, initialItems = [], onChange }) {
    let items = initialItems.map(item => ({ ...item }));
    let busy = false;
    function draw() {
      urlInput.value = items[0]?.url || '';
      urlInput.disabled = items.length > 1;
      status.textContent = items.length > 1 ? `${items.length} photos · carrousel · ordre de publication ci-dessous` : items.length ? '1 média prêt' : 'Aucun média';
      preview.innerHTML = items.map((item, index) => `<div class="media-picker-item">${item.type?.startsWith('video/') ? `<video src="${escapeHtml(item.url)}" controls preload="metadata"></video>` : `<img src="${escapeHtml(item.url)}" alt="Photo ${index + 1}">`}<div><span>${index + 1}</span><button type="button" class="btn btn--sm" data-media-up="${index}" ${index === 0 || busy ? 'disabled' : ''} aria-label="Avancer la photo ${index + 1}">←</button><button type="button" class="btn btn--sm" data-media-remove="${index}" ${busy ? 'disabled' : ''}>Retirer</button></div></div>`).join('');
      preview.querySelectorAll('[data-media-remove]').forEach(btn => { btn.onclick = () => { items.splice(Number(btn.dataset.mediaRemove), 1); draw(); }; });
      preview.querySelectorAll('[data-media-up]').forEach(btn => { btn.onclick = () => { const i = Number(btn.dataset.mediaUp); [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); }; });
      onChange?.(items.map(item => ({ ...item })));
    }
    button.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length || busy) return;
      if (items.length + files.length > 10) return showToast('Maximum 10 photos par carrousel. Retirez des médias avant d’en ajouter.', 'error');
      if (items.length + files.length > 1 && [...items, ...files].some(item => !String(item.type || '').startsWith('image/'))) return showToast('Pour plusieurs médias, sélectionnez uniquement des photos. Une vidéo se publie séparément.', 'error');
      busy = true; button.disabled = true; draw();
      try {
        for (const file of files) {
          status.textContent = 'Téléversement : ' + file.name;
          const uploaded = await NidalAPI.uploadMedia(file);
          if (!uploaded.url) throw new Error('URL du média manquante.');
          items.push({ url: uploaded.url, type: uploaded.mime || file.type });
        }
      } catch (error) { showToast('Téléversement interrompu : ' + error.message, 'error'); }
      finally { busy = false; button.disabled = false; fileInput.value = ''; draw(); }
    };
    urlInput.oninput = () => { items = urlInput.value ? [{ url: urlInput.value, type: /\.(mp4|mov|webm)(?:[?#]|$)/i.test(urlInput.value) ? 'video/mp4' : '' }] : []; onChange?.(items); };
    draw();
    return { getItems: () => items.map(item => ({ ...item })), isBusy: () => busy };
  }
  return { bind };
})();
