/**
 * Nidal Junior — Pilotage éditorial
 * Vue Paramètres (Sauvegardes JSON, Démo, Réinitialisation)
 */

const SettingsView = (() => {
  function render() {
    const view = document.getElementById('view-settings');
    if (!view) return;

    view.innerHTML = `
      <header class="view__header">
        <div>
          <h1 class="view__title">⚙️ Paramètres</h1>
          <p class="view__subtitle">Gestion des données, sauvegardes et configuration de l'application</p>
        </div>
      </header>

      <div style="display:flex;flex-direction:column;gap:1.5rem;max-width:850px;">
        <!-- Sauvegarde et Restauration -->
        <div class="chart-container">
          <h2 class="chart-container__title">💾 Sauvegarde & Restauration</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Exportez l'intégralité de vos contenus éditoriaux dans un fichier JSON portable ou restaurez une précédente sauvegarde.
          </p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn btn--secondary" id="export-json-btn">📤 Exporter la sauvegarde (JSON)</button>
            <label class="btn btn--secondary" style="cursor:pointer;">
              📥 Restaurer un fichier JSON
              <input type="file" id="import-json-input" accept=".json" style="display:none;" aria-label="Importer un fichier JSON">
            </label>
          </div>
        </div>

        <!-- Données de démonstration -->
        <div class="chart-container">
          <h2 class="chart-container__title">🧪 Données de démonstration</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Remplissez automatiquement l'application avec des exemples représentatifs du magazine (les 7 types de contenus, divers statuts, dates passées et à venir).
          </p>
          <button class="btn btn--primary" id="load-demo-btn">Générer les données d’exemple</button>
        </div>

        <!-- Zone de danger / Reset -->
        <div class="chart-container" style="border-color:rgba(239, 68, 68, 0.3);">
          <h2 class="chart-container__title" style="color:var(--danger)">⚠️ Zone de réinitialisation</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">
            Cette action efface définitivement tous les contenus enregistrés dans votre navigateur (localStorage). Pensez à faire un export au préalable.
          </p>
          <button class="btn btn--danger" id="reset-all-btn">Effacer toutes les données</button>
        </div>

        <!-- À propos -->
        <div class="chart-container">
          <h2 class="chart-container__title">ℹ️ À propos</h2>
          <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;">
            <strong>Nidal Junior — Pilotage éditorial</strong> v1.0.0<br>
            Application monopage autonome (SPA) conçue pour la rédaction du magazine jeunesse.<br>
            100% exécutée côté client, conforme WCAG 2.1 AA et optimisée pour GitHub Pages.
          </p>
        </div>
      </div>
    `;

    document.getElementById('export-json-btn').onclick = () => {
      const blob = new Blob([NidalStore.exportData()], { type: 'application/json;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nidal-junior-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      showToast('Sauvegarde JSON téléchargée avec succès', 'success');
    };

    document.getElementById('import-json-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          NidalStore.importData(event.target.result);
          showToast('Données restaurées avec succès', 'success');
          App.navigateTo('dashboard');
        } catch (err) {
          showToast('Fichier JSON invalide ou corrompu', 'error');
        }
      };
      reader.readAsText(file);
    };

    document.getElementById('load-demo-btn').onclick = () => {
      NidalStore.loadDemoData();
      App.navigateTo('dashboard');
    };

    document.getElementById('reset-all-btn').onclick = () => {
      confirmAction('Attention ! Voulez-vous vraiment effacer TOUTES les données de l’application ?', () => {
        NidalStore.reset();
        showToast('Toutes les données ont été réinitialisées', 'success');
        App.navigateTo('dashboard');
      });
    };
  }

  return { render };
})();
