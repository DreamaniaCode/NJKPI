/** Studio de generation assistee pour Nidal et Nidal Junior. */
const AgentView = (() => {
  let _lastOutput = '';
  let _lastAction = null;

  function render() {
    const view = document.getElementById('view-agent');
    if (!view) return;
    const online = NidalAPI.isOnline();
    const health = NidalAPI.getHealth();
    const aiReady = Boolean(health?.integrations?.ai || health?.integrations?.openai);
    const aiProvider = health?.integrations?.aiProvider;
    const aiLabel = aiReady ? (aiProvider === 'openrouter' ? 'OpenRouter connecté' : 'IA connectée') : 'Mode démo';

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Studio éditorial</span>
          <h1 class="view__title">Agent IA</h1>
          <p class="view__subtitle">Création, planification et rédaction assistée pour ${escapeHtml(getActiveBrandLabel())}</p>
        </div>
        <span class="connection-pill ${online ? (aiReady ? 'connection-pill--ok' : 'connection-pill--pending') : 'connection-pill--off'}">
          ${online ? aiLabel : 'Backend hors ligne'}
        </span>
      </header>

      <section class="agent-layout">
        <form class="agent-brief" id="agent-form">
          <div>
            <span class="section-kicker">Nouveau brief</span>
            <h2>Que devons-nous préparer ?</h2>
          </div>
          <div class="form-group">
            <label for="agent-task">Type de contenu ou production</label>
            <select id="agent-task" class="form-control">
              <optgroup label="Magazine Nidal Junior (Types autorisés)">
                <option value="article">Article</option>
                <option value="interview">Interview</option>
                <option value="dossier">Dossier</option>
                <option value="breve">Brève</option>
                <option value="chronique">Chronique</option>
                <option value="infographie">Infographie</option>
                <option value="quiz">Quiz</option>
              </optgroup>
              <optgroup label="Réseaux sociaux & Planning">
                <option value="social">Contenu réseaux sociaux complet (Story + Facebook)</option>
                <option value="post">Légende prête à publier</option>
                <option value="weekly_plan">Planning éditorial hebdomadaire</option>
                <option value="photo_prompt">Prompt photo / visuel (charte Nidal)</option>
                <option value="video_prompt">Prompt vidéo / Reel</option>
                <option value="insight_analysis">Analyse de performance</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label for="agent-brief">Brief</label>
            <textarea id="agent-brief" class="form-control" rows="8" placeholder="Exemple : Ajoute un article sur les apprentissages en petite section autour de l'album Belle, Antonin et Camille..."></textarea>
          </div>
          <div class="form-group">
            <label for="agent-context">Contexte ou précisions</label>
            <textarea id="agent-context" class="form-control" rows="3" placeholder="Public, date souhaitée, canal, informations à vérifier (facultatif)"></textarea>
          </div>
          <button class="btn btn--primary btn--block" type="submit" ${online ? '' : 'disabled'}>
            ${online ? 'Générer avec l’Agent' : 'Connecter le backend pour tester'}
          </button>
        </form>

        <section class="agent-output">
          <div class="agent-output__head">
            <div>
              <span class="section-kicker">Proposition</span>
              <h2>Contenu éditorial</h2>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn--secondary btn--sm" id="copy-agent" ${_lastOutput ? '' : 'disabled'}>Copier</button>
              <button class="btn btn--primary btn--sm" id="draft-agent" ${_lastOutput ? '' : 'disabled'}>Enregistrer dans l’application</button>
            </div>
          </div>

          ${_lastAction ? _actionBannerHtml(_lastAction) : ''}

          <div id="agent-result" class="agent-result">
            ${_lastOutput ? _formatOutput(_lastOutput) : '<p>La proposition de l’agent apparaîtra ici selon les règles éditoriales officielles (Titre, Type, Statut, Accroche, Description, Tags, Appel à l’action...).</p>'}
          </div>
        </section>
      </section>`;

    document.getElementById('agent-form').onsubmit = _generate;
    document.getElementById('copy-agent').onclick = () => navigator.clipboard.writeText(_lastOutput).then(() => showToast('Contenu copié dans le presse-papiers', 'success'));
    document.getElementById('draft-agent').onclick = _saveToApp;
  }

  function _actionBannerHtml(action) {
    return `
      <div style="margin-bottom:14px;padding:12px 16px;background:var(--soft-blue);border-left:4px solid var(--blue);border-radius:4px;font-size:12px;line-height:1.6;">
        <strong style="color:var(--blue);display:block;margin-bottom:4px;">Compte rendu d'action</strong>
        <div><b>Action effectuée :</b> ${escapeHtml(action.action)}</div>
        <div><b>Contenu concerné :</b> ${escapeHtml(action.titre)}</div>
        <div><b>Statut :</b> ${escapeHtml(action.statut)} | <b>Date planifiée :</b> ${escapeHtml(action.date || 'Non définie')}</div>
        <div><b>Résultat :</b> ${escapeHtml(action.resultat)}</div>
        <div><b>Élément restant à valider :</b> ${escapeHtml(action.validation)}</div>
        <div style="margin-top:6px;"><button class="btn btn--secondary btn--sm" onclick="App.navigateTo('contents')">Voir dans les contenus →</button></div>
      </div>`;
  }

  async function _generate(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const brief = document.getElementById('agent-brief').value.trim();
    if (!brief) return showToast('Veuillez saisir un brief', 'error');
    button.disabled = true;
    button.textContent = 'Génération en cours...';
    try {
      const response = await NidalAPI.generate({
        brand: getActiveBrand(),
        task: document.getElementById('agent-task').value,
        brief,
        context: document.getElementById('agent-context').value.trim()
      });
      _lastOutput = response.output;

      if (response.savedContent) {
        const item = response.savedContent.data || response.savedContent;
        NidalStore.create(item);
        _lastAction = {
          action: 'Création et enregistrement automatique',
          titre: item.titre || 'Contenu éditorial',
          statut: item.statut || 'brouillon',
          date: item.datePublication || 'Non définie',
          resultat: 'Enregistré avec succès dans l’application',
          validation: 'Relecture et validation humaine'
        };
        showToast('Contenu créé et enregistré dans l’application !', 'success');
      } else {
        _lastAction = null;
        showToast(response.isDemo ? 'Proposition de démonstration préparée' : 'Proposition préparée', 'success');
      }

      render();
    } catch (error) {
      showToast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Générer avec l’Agent';
    }
  }

  function _formatOutput(value) {
    return `<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.6;">${escapeHtml(value)}</pre>`;
  }

  function _parseStructuredOutput(text) {
    if (!text) return null;
    const find = (re) => {
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };

    const titre = find(/(?:^|\n)Titre\s*:\s*(.+)/i) || 'Brouillon généré par l’agent';
    const typeRaw = find(/(?:^|\n)Type\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
    const statutRaw = find(/(?:^|\n)Statut\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
    const objectif = find(/(?:^|\n)Objectif\s*:\s*(.+)/i);
    const accroche = find(/(?:^|\n)Accroche\s*:\s*(.+)/i);
    const description = find(/(?:^|\n)Description\s*:\s*(.+)/i);
    const auteur = find(/(?:^|\n)Auteur\s*:\s*(.+)/i) || 'Équipe Nidal';
    const datePub = find(/(?:^|\n)Date de publication\s*:\s*(.+)/i);
    const tagsRaw = find(/(?:^|\n)Tags\s*:\s*(.+)/i);
    const cta = find(/(?:^|\n)Appel à l’action\s*:\s*(.+)/i);

    const type = CONTENT_TYPES.some(t => t.id === typeRaw) ? typeRaw : 'article';
    const statut = STATUSES.some(s => s.id === statutRaw) ? statutRaw : 'brouillon';
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(datePub) ? datePub : '';

    return {
      brand: getActiveBrand(),
      titre: titre.slice(0, 180),
      format: type,
      statut: statut,
      niveau: 'tous',
      classes: 'Toutes les classes',
      pilier: 'Pédagogie & Valeurs',
      objectif: objectif || description || 'Valoriser les apprentissages',
      accroche: accroche || titre,
      message: text,
      cta: cta || '',
      livrable: 'Contenu éditorial',
      auteur: auteur,
      responsable: auteur,
      tags: tagsRaw ? tagsRaw.split(/[,#\s]+/).filter(Boolean) : [],
      datePublication: validDate,
      validation: statut === 'publie' ? 'approuve' : 'a-valider'
    };
  }

  function _saveToApp() {
    if (!_lastOutput) return showToast('Aucun contenu à enregistrer', 'error');
    const parsed = _parseStructuredOutput(_lastOutput);
    NidalStore.create(parsed);
    _lastAction = {
      action: 'Enregistrement dans l’application',
      titre: parsed.titre,
      statut: parsed.statut,
      date: parsed.datePublication || 'Non définie',
      resultat: 'Contenu enregistré avec succès',
      validation: 'Relecture et validation humaine'
    };
    render();
    showToast(`Contenu « ${parsed.titre.slice(0, 25)}... » enregistré dans l'application !`, 'success');
  }

  return { render };
})();
