/**
 * Nidal Junior — Pilotage éditorial
 * Vue Paramètres (Sauvegardes JSON, Démo, Réinitialisation, Export, Utilisateurs)
 */

const SettingsView = (() => {
  function render() {
    const view = document.getElementById('view-settings');
    if (!view) return;

    const isAdmin = typeof NidalAuth !== 'undefined' && NidalAuth.canAdmin();
    const isEditor = typeof NidalAuth !== 'undefined' && NidalAuth.canEdit();
    const authEnabled = typeof NidalAuth !== 'undefined' && NidalAuth.isAuthEnabled();

    view.innerHTML = `
      <header class="view__header">
        <div>
          <h1 class="view__title">⚙️ Paramètres</h1>
          <p class="view__subtitle">Gestion des données, sauvegardes, export et configuration de l'application</p>
        </div>
      </header>

      <div style="display:flex;flex-direction:column;gap:1.5rem;max-width:850px;">
        <!-- Export multi-format -->
        <div class="chart-container">
          <h2 class="chart-container__title">📤 Exporter les données</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Exportez les contenus de <strong>${escapeHtml(getActiveBrandLabel())}</strong> dans le format de votre choix.
          </p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn btn--primary" id="export-csv-btn">📊 CSV</button>
            <button class="btn btn--primary" id="export-excel-btn">📗 Excel</button>
            <button class="btn btn--primary" id="export-pdf-btn">📕 PDF</button>
            <button class="btn btn--primary" id="export-md-btn">📝 Markdown</button>
            <button class="btn btn--secondary" id="export-json-btn">📦 JSON</button>
          </div>
        </div>

        <!-- Sauvegarde et Restauration -->
        <div class="chart-container">
          <h2 class="chart-container__title">💾 Sauvegarde & Restauration</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Exportez l'intégralité de vos contenus éditoriaux dans un fichier JSON portable ou restaurez une précédente sauvegarde.
          </p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn btn--secondary" id="backup-json-btn">📤 Exporter la sauvegarde (JSON)</button>
            <label class="btn btn--secondary" style="cursor:pointer;">
              📥 Restaurer un fichier JSON
              <input type="file" id="import-json-input" accept=".json" style="display:none;" aria-label="Importer un fichier JSON">
            </label>
          </div>
        </div>

        <!-- Import URL -->
        ${isEditor || !authEnabled ? `
        <div class="chart-container">
          <h2 class="chart-container__title">🔗 Importer depuis un lien</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Collez un lien Instagram, Facebook, TikTok, YouTube ou LinkedIn pour importer automatiquement le contenu.
          </p>
          <button class="btn btn--primary" id="import-url-btn">🔗 Importer depuis un lien</button>
        </div>
        ` : ''}

        ${isAdmin || !authEnabled ? `
        <!-- Données de démonstration -->
        <div class="chart-container">
          <h2 class="chart-container__title">🧪 Données de démonstration</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Remplissez automatiquement l'application avec des exemples représentatifs du magazine (les 7 types de contenus, divers statuts, dates passées et à venir).
          </p>
          <button class="btn btn--primary" id="load-demo-btn">Générer les données d'exemple</button>
        </div>

        <!-- Zone de danger / Reset -->
        <div class="chart-container" style="border-color:rgba(239, 68, 68, 0.3);">
          <h2 class="chart-container__title" style="color:var(--danger)">⚠️ Réinitialisation complète</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Cette action efface <strong>définitivement toutes les données</strong> (localStorage + serveur si connecté). Pensez à faire un export au préalable.
          </p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn btn--danger" id="reset-local-btn">Effacer les données locales</button>
            <button class="btn btn--danger" id="reset-all-btn" style="background:var(--red);">🗑️ Réinitialiser TOUT (local + serveur)</button>
          </div>
        </div>

        <!-- Gestion des utilisateurs (admin) -->
        ${authEnabled ? `
        <div class="chart-container">
          <h2 class="chart-container__title">👥 Gestion des utilisateurs</h2>
          <div id="user-management-container"></div>
        </div>
        ` : ''}
        ` : ''}

        <!-- À propos -->
        <div class="chart-container">
          <h2 class="chart-container__title">ℹ️ À propos</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;">
            <strong>Nidal Junior — Pilotage éditorial</strong> v2.0.0<br>
            Application monopage (SPA) pour la gestion des contenus sociaux et éditoriaux.<br>
            ${authEnabled ? `Connecté en tant que <strong>${escapeHtml(typeof NidalAuth !== 'undefined' ? NidalAuth.getUser()?.username || '—' : '—')}</strong> (${escapeHtml(typeof NidalAuth !== 'undefined' ? NidalAuth.getRole() : '—')})` : 'Authentification non activée'}
          </p>
        </div>
      </div>
    `;

    // Bind export buttons
    const contents = NidalStore.getAll();
    document.getElementById('export-csv-btn')?.addEventListener('click', () => NidalExport.exportCSV(contents));
    document.getElementById('export-excel-btn')?.addEventListener('click', () => NidalExport.exportExcel(contents));
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => NidalExport.exportPDF(contents));
    document.getElementById('export-md-btn')?.addEventListener('click', () => NidalExport.exportMarkdown(contents));
    document.getElementById('export-json-btn')?.addEventListener('click', () => NidalExport.exportJSON(contents));

    // Backup JSON
    document.getElementById('backup-json-btn')?.addEventListener('click', () => {
      const blob = new Blob([NidalStore.exportData()], { type: 'application/json;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nidal-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      showToast('Sauvegarde JSON téléchargée avec succès', 'success');
    });

    // Import JSON
    document.getElementById('import-json-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          NidalStore.importData(event.target.result);
          showToast('Données restaurées avec succès', 'success');
          App.navigateTo('dashboard');
        } catch {
          showToast('Fichier JSON invalide ou corrompu', 'error');
        }
      };
      reader.readAsText(file);
    });

    // Import URL
    document.getElementById('import-url-btn')?.addEventListener('click', () => {
      if (typeof NidalImport !== 'undefined') NidalImport.openImportModal();
      else showToast('Module d\'import non disponible', 'error');
    });

    // Demo data
    document.getElementById('load-demo-btn')?.addEventListener('click', () => {
      NidalStore.reset();
      showToast('Données de démonstration chargées', 'success');
      App.navigateTo('dashboard');
    });

    // Reset local
    document.getElementById('reset-local-btn')?.addEventListener('click', () => {
      confirmAction('Voulez-vous effacer les données locales (navigateur uniquement) ?', () => {
        localStorage.removeItem('nidal-content-hub-v3');
        NidalStore.init();
        showToast('Données locales effacées', 'success');
        App.navigateTo('dashboard');
      });
    });

    // Reset ALL (local + server)
    document.getElementById('reset-all-btn')?.addEventListener('click', () => {
      openModal('⚠️ Réinitialisation complète', `
        <p style="color:var(--danger);font-weight:bold;">Cette action est IRRÉVERSIBLE.</p>
        <p>Toutes les données locales ET serveur seront supprimées définitivement.</p>
        <p>Tapez <strong>RESET</strong> pour confirmer :</p>
        <input type="text" id="reset-confirm-input" class="form-control" placeholder="Tapez RESET" autocomplete="off">
      `, {
        footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--danger" id="confirm-reset-btn" disabled>Confirmer la suppression</button>`,
        onOpen: modal => {
          const input = modal.querySelector('#reset-confirm-input');
          const btn = modal.querySelector('#confirm-reset-btn');
          input.oninput = () => { btn.disabled = input.value !== 'RESET'; };
          btn.onclick = async () => {
            closeModal();
            // Reset local
            localStorage.removeItem('nidal-content-hub-v3');
            NidalStore.init();
            // Reset server
            if (NidalAPI.isOnline()) {
              try {
                await NidalAPI.request('/api/data/reset?confirm=RESET', { method: 'DELETE' });
                showToast('Toutes les données ont été supprimées (local + serveur)', 'success');
              } catch (e) {
                showToast('Données locales supprimées, erreur serveur : ' + e.message, 'error');
              }
            } else {
              showToast('Données locales supprimées (serveur hors ligne)', 'success');
            }
            App.navigateTo('dashboard');
          };
        }
      });
    });

    // User management (admin only)
    const userMgmt = document.getElementById('user-management-container');
    if (userMgmt && typeof NidalAuth !== 'undefined' && NidalAuth.canAdmin()) {
      _renderUserManagement(userMgmt);
    }
  }

  async function _renderUserManagement(container) {
    if (!NidalAPI.isOnline()) {
      container.innerHTML = '<p style="color:var(--text-muted);">Serveur hors ligne — gestion des utilisateurs indisponible.</p>';
      return;
    }
    container.innerHTML = '<p style="color:var(--text-muted);">Chargement...</p>';
    try {
      const users = await NidalAPI.request('/api/auth/users');
      const currentUser = NidalAuth.getUser();
      container.innerHTML = `
        <div class="table-responsive" style="margin-bottom:1rem;">
          <table class="data-table">
            <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr ${u.id === currentUser?.id ? 'style="background:var(--surface);"' : ''}>
                  <td><strong>${escapeHtml(u.display_name || u.username)}</strong></td>
                  <td>${escapeHtml(u.email || '—')}</td>
                  <td>
                    <select class="form-control" data-user-id="${u.id}" ${u.id === currentUser?.id ? 'disabled title="Vous ne pouvez pas modifier votre propre rôle"' : ''} style="width:120px;padding:4px 8px;">
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                      <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Éditeur</option>
                      <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Lecteur</option>
                    </select>
                  </td>
                  <td>
                    ${u.id !== currentUser?.id ? `<button class="btn btn--secondary btn--sm" data-save-role="${u.id}">Enregistrer</button>` : '<span style="color:var(--muted);font-size:12px;">Vous</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <button class="btn btn--primary" id="add-user-btn">+ Ajouter un utilisateur</button>
      `;

      // Save role events
      container.querySelectorAll('[data-save-role]').forEach(btn => {
        btn.onclick = async () => {
          const userId = btn.dataset.saveRole;
          const select = container.querySelector(`select[data-user-id="${userId}"]`);
          if (!select) return;
          try {
            await NidalAPI.request(`/api/auth/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: select.value }) });
            showToast('Rôle mis à jour', 'success');
          } catch (e) { showToast(e.message, 'error'); }
        };
      });

      // Add user button
      container.querySelector('#add-user-btn')?.addEventListener('click', () => {
        openModal('Ajouter un utilisateur', `
          <div class="form-group"><label for="new-username">Nom d'utilisateur *</label><input type="text" id="new-username" class="form-control" required></div>
          <div class="form-group"><label for="new-password">Mot de passe *</label><input type="password" id="new-password" class="form-control" required></div>
          <div class="form-group"><label for="new-email">Email</label><input type="email" id="new-email" class="form-control"></div>
          <div class="form-group"><label for="new-display-name">Nom affiché</label><input type="text" id="new-display-name" class="form-control"></div>
          <div class="form-group"><label for="new-role">Rôle</label>
            <select id="new-role" class="form-control"><option value="viewer">Lecteur</option><option value="editor">Éditeur</option><option value="admin">Admin</option></select>
          </div>
        `, {
          footer: `<button type="button" class="btn btn--secondary" data-close-modal>Annuler</button><button type="button" class="btn btn--primary" id="create-user-btn">Créer</button>`,
          onOpen: modal => {
            modal.querySelector('#create-user-btn').onclick = async () => {
              const username = modal.querySelector('#new-username').value.trim();
              const password = modal.querySelector('#new-password').value;
              const email = modal.querySelector('#new-email').value.trim();
              const display_name = modal.querySelector('#new-display-name').value.trim();
              const role = modal.querySelector('#new-role').value;
              if (!username || !password) return showToast('Nom et mot de passe requis', 'error');
              try {
                await NidalAPI.request('/api/auth/users', { method: 'POST', body: JSON.stringify({ username, password, email, display_name, role }) });
                showToast('Utilisateur créé', 'success');
                closeModal();
                _renderUserManagement(container);
              } catch (e) { showToast(e.message, 'error'); }
            };
          }
        });
      });
    } catch (e) {
      container.innerHTML = `<p style="color:var(--danger);">Erreur : ${escapeHtml(e.message)}</p>`;
    }
  }

  return { render };
})();
