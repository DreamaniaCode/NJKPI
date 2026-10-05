/** Tableau réutilisable : filtres, tri, sélection et export des mêmes lignes. */
const NidalDataGrid = (() => {
  const safeCell = value => /^[\s]*[=+@-]/.test(String(value ?? '')) ? `'${value}` : String(value ?? '');
  const delimited = (columns, rows, separator) => [columns.map(c => c.label), ...rows.map(r => columns.map(c => r[c.key] ?? ''))]
    .map(row => row.map(value => `"${safeCell(value).replace(/"/g, '""')}"`).join(separator)).join('\r\n');
  function download(blob, filename) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click();
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
  }
  async function exportRows(format, columns, rows, title) {
    if (!rows.length) throw new Error('Aucune ligne à exporter dans ce périmètre.');
    const filename = `nidal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'xlsx') {
      const config = NidalAPI.getConfig();
      const response = await fetch(`${config.baseUrl}/api/export/table.xlsx`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {}) },
        body: JSON.stringify({ title, columns, rows })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Export Excel indisponible');
      download(await response.blob(), `${filename}.xlsx`); return;
    }
    if (format === 'csv' || format === 'tsv' || format === 'copy') {
      const text = delimited(columns, rows, format === 'csv' ? ';' : '\t');
      if (format === 'copy') { await copyText(text); return; }
      download(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' }), `${filename}.${format}`); return;
    }
    if (format === 'json') {
      const data = rows.map(row => Object.fromEntries(columns.map(c => [c.key, row[c.key] ?? null])));
      download(new Blob([JSON.stringify({ title, exportedAt: new Date().toISOString(), columns, rows: data }, null, 2)], { type: 'application/json' }), `${filename}.json`); return;
    }
    if (format === 'md') {
      const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
      const text = `# ${title}\n\n` + [columns.map(c => c.label), columns.map(() => '---'), ...rows.map(r => columns.map(c => r[c.key]))].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
      download(new Blob([text], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`); return;
    }
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:12px Arial;margin:30px;color:#152643}table{border-collapse:collapse;width:100%}th,td{padding:8px;border:1px solid #d9e1eb;text-align:left;white-space:pre-wrap}th{background:#edf2fa}img{width:100px}@page{size:A4 landscape;margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}</style><body><img src="${location.origin}/assets/logo-cropped.png" alt="Groupe Scolaire Nidal"><h1>${escapeHtml(title)}</h1><p>${rows.length} lignes · ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p><table><thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(String(r[c.key] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    if (format === 'pdf') {
      const popup = window.open('', '_blank');
      if (!popup) throw new Error('Autorisez la fenêtre d’impression pour enregistrer le PDF.');
      popup.onload = () => { popup.focus(); popup.print(); };
      popup.document.write(html); popup.document.close(); return;
    }
    download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${filename}.html`);
  }
  function create({ id, title, columns, filters = [], renderCell, onRowsRendered, onRowClick, initialSortKey }) {
    let rows = [], search = '', sortKey = initialSortKey || columns[0].key, direction = -1, page = 0, scope = 'filtered', format = 'xlsx';
    const selected = new Set(), values = {};
    const filtered = () => rows.filter(row => (!search || columns.some(c => String(row[c.key] ?? '').toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))) && filters.every(f => !values[f.key] || String(row[f.key] ?? '') === values[f.key]))
      .sort((a, b) => { const x = a[sortKey] ?? '', y = b[sortKey] ?? ''; return direction * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fr', { numeric: true })); });
    const scopeRows = scope => scope === 'all' ? [...rows].sort((a,b) => { const x = a[sortKey] ?? '', y = b[sortKey] ?? ''; return direction * (typeof x === 'number' && typeof y === 'number' ? x-y : String(x).localeCompare(String(y),'fr',{numeric:true})); }) : scope === 'selected' ? filtered().filter(row => selected.has(row.id)) : filtered();
    function render() {
      const host = document.getElementById(id); if (!host) return;
      host.innerHTML = `<div class="data-tools"><label>Recherche<input class="form-control" id="${id}-search" value="${escapeHtml(search)}" placeholder="Rechercher dans toutes les colonnes"></label>${filters.map(f => `<label>${escapeHtml(f.label)}<select class="form-control" data-grid-filter="${f.key}"><option value="">Tous</option>${(f.options || [...new Set(rows.map(r => r[f.key]).filter(Boolean))].sort()).map(v => `<option value="${escapeHtml(String(v))}" ${values[f.key] === String(v) ? 'selected' : ''}>${escapeHtml(String(v))}</option>`).join('')}</select></label>`).join('')}<label>Périmètre d’export<select class="form-control" id="${id}-scope"><option value="filtered">Résultats filtrés</option><option value="selected">Sélection visible</option><option value="all">Toutes les données</option></select></label><label>Format<select class="form-control" id="${id}-format"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV · Excel / CRM</option><option value="tsv">TSV</option><option value="json">JSON</option><option value="pdf">PDF / impression</option><option value="html">HTML</option><option value="md">Markdown</option></select></label><button class="btn btn--primary" id="${id}-export">Exporter</button><button class="btn btn--secondary" id="${id}-copy">Copier</button></div><div id="${id}-results"></div>`;
      document.getElementById(`${id}-search`).oninput = event => { search = event.target.value; page = 0; table(); };
      document.getElementById(`${id}-scope`).value = scope;
      document.getElementById(`${id}-format`).value = format;
      document.getElementById(`${id}-scope`).onchange = event => { scope = event.target.value; };
      document.getElementById(`${id}-format`).onchange = event => { format = event.target.value; };
      host.querySelectorAll('[data-grid-filter]').forEach(select => select.onchange = event => { values[select.dataset.gridFilter] = event.target.value; page = 0; table(); });
      const perform = async format => { try { await exportRows(format, columns.filter(c => c.export !== false), scopeRows(document.getElementById(`${id}-scope`).value), title); showToast(format === 'copy' ? 'Données copiées' : 'Export préparé', 'success'); } catch (error) { showToast(error.message, 'error'); } };
      document.getElementById(`${id}-export`).onclick = () => perform(document.getElementById(`${id}-format`).value);
      document.getElementById(`${id}-copy`).onclick = () => perform('copy'); table();
    }
    function table() {
      const all = filtered(), count = all.filter(r => selected.has(r.id)).length;
      page = Math.min(page, Math.max(0, Math.ceil(all.length / 50) - 1));
      const visible = all.slice(page * 50, page * 50 + 50);
      const visibleColumns = columns.filter(c => c.display !== false);
      document.getElementById(`${id}-results`).innerHTML = `<div class="data-summary"><span>${all.length} résultat(s) sur ${rows.length} · ${count} sélectionné(s) dans les résultats</span><button class="btn btn--secondary btn--sm" id="${id}-select">Sélectionner les résultats</button><button class="btn btn--secondary btn--sm" id="${id}-clear">Effacer la sélection</button></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Sélection</th>${visibleColumns.map(c => `<th aria-sort="${sortKey === c.key ? direction === 1 ? 'ascending' : 'descending' : 'none'}"><button class="grid-sort" data-grid-sort="${c.key}">${escapeHtml(c.label)} ${sortKey === c.key ? direction === 1 ? '↑' : '↓' : '↕'}</button></th>`).join('')}</tr></thead><tbody>${visible.map(row => `<tr class="${selected.has(row.id) ? 'grid-selected' : ''}"><td><input type="checkbox" data-grid-id="${escapeHtml(String(row.id))}" ${selected.has(row.id) ? 'checked' : ''} aria-label="Sélectionner ${escapeHtml(String(row.name || row.id))}"></td>${visibleColumns.map(c => `<td data-label="${escapeHtml(c.label)}">${renderCell ? renderCell(row,c) : escapeHtml(String(row[c.key] ?? ''))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${visibleColumns.length + 1}">Aucune donnée ne correspond aux filtres.</td></tr>`}</tbody></table></div><div class="data-summary"><button class="btn btn--secondary btn--sm" id="${id}-prev" ${page === 0 ? 'disabled' : ''}>Précédent</button><span>Page ${page + 1} / ${Math.max(1, Math.ceil(all.length / 50))}</span><button class="btn btn--secondary btn--sm" id="${id}-next" ${(page + 1) * 50 >= all.length ? 'disabled' : ''}>Suivant</button></div>`;
      const host = document.getElementById(`${id}-results`);
      if (onRowClick) host.querySelectorAll('tbody tr').forEach(tr => {
        const rowId = tr.querySelector('[data-grid-id]')?.dataset.gridId;
        if (!rowId) return;
        const row = visible.find(item => item.id === rowId);
        tr.classList.add('grid-row-clickable'); tr.tabIndex = 0;
        tr.setAttribute('aria-label', `Ouvrir la fiche de ${row.name || row.id}`);
        tr.onclick = event => {
          if (event.target.closest('a,button,input,select,textarea,summary,details,label')) return;
          if (typeof window !== 'undefined' && window.getSelection?.()?.toString()) return;
          onRowClick(row);
        };
        tr.onkeydown = event => { if (event.target === tr && ['Enter',' '].includes(event.key)) { event.preventDefault(); onRowClick(row); } };
      });
      host.querySelectorAll('[data-grid-sort]').forEach(button => button.onclick = () => { direction = sortKey === button.dataset.gridSort ? -direction : 1; sortKey = button.dataset.gridSort; table(); });
      host.querySelectorAll('[data-grid-id]').forEach(input => input.onchange = () => { input.checked ? selected.add(input.dataset.gridId) : selected.delete(input.dataset.gridId); table(); });
      document.getElementById(`${id}-select`).onclick = () => { all.forEach(r => selected.add(r.id)); table(); };
      document.getElementById(`${id}-clear`).onclick = () => { selected.clear(); table(); };
      document.getElementById(`${id}-prev`).onclick = () => { page--; table(); };
      document.getElementById(`${id}-next`).onclick = () => { page++; table(); };
      onRowsRendered?.(host);
    }
    return { setRows(next, nextColumns) { rows = next.map(row => ({ ...row, id: String(row.id) })); if (nextColumns) columns = nextColumns; for (const key of selected) if (!rows.some(r => r.id === key)) selected.delete(key); render(); }, filtered, scopeRows };
  }
  return { create, exportRows, delimited };
})();
