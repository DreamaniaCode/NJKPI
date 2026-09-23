/** Studio de generation assistee pour Nidal et Nidal Junior. */
const AgentView = (() => {
  let _lastOutput = '';

  function render() {
    const view = document.getElementById('view-agent');
    if (!view) return;
    const online = NidalAPI.isOnline();
    const health = NidalAPI.getHealth();
    view.innerHTML = `
      <header class="view__header workspace-header"><div><span class="section-kicker">Studio contenu</span><h1 class="view__title">Agent IA</h1><p class="view__subtitle">Legendes, plans hebdomadaires et prompts photo ou video pour ${escapeHtml(getActiveBrandLabel())}</p></div><span class="connection-pill ${online ? 'connection-pill--ok' : 'connection-pill--off'}">${online ? (health?.integrations?.openai ? 'OpenAI connecte' : 'Mode demo') : 'Backend hors ligne'}</span></header>
      <section class="agent-layout">
        <form class="agent-brief" id="agent-form">
          <div><span class="section-kicker">Nouveau brief</span><h2>Que devons-nous preparer ?</h2></div>
          <div class="form-group"><label for="agent-task">Type de production</label><select id="agent-task" class="form-control"><option value="weekly_plan">Plan de la semaine</option><option value="post">Legende de publication</option><option value="photo_prompt">Prompt photo</option><option value="video_prompt">Prompt video</option><option value="insight_analysis">Analyse de performance</option></select></div>
          <div class="form-group"><label for="agent-brief">Brief</label><textarea id="agent-brief" class="form-control" rows="8" placeholder="Exemple : preparer la semaine des petites sections autour de Belle, Antonin et Camille..."></textarea></div>
          <div class="form-group"><label for="agent-context">Contexte ou chiffres disponibles</label><textarea id="agent-context" class="form-control" rows="4" placeholder="Facultatif"></textarea></div>
          <button class="btn btn--primary btn--block" type="submit" ${online ? '' : 'disabled'}>${online ? 'Generer' : 'Connecter le backend pour tester'}</button>
        </form>
        <section class="agent-output"><div class="agent-output__head"><div><span class="section-kicker">Proposition</span><h2>Contenu a valider</h2></div><div><button class="btn btn--secondary btn--sm" id="copy-agent" ${_lastOutput ? '' : 'disabled'}>Copier</button><button class="btn btn--secondary btn--sm" id="draft-agent" ${_lastOutput ? '' : 'disabled'}>Creer un brouillon</button></div></div><div id="agent-result" class="agent-result">${_lastOutput ? _formatOutput(_lastOutput) : '<p>La proposition de l’agent apparaitra ici. Elle restera toujours soumise a validation humaine.</p>'}</div></section>
      </section>`;
    document.getElementById('agent-form').onsubmit = _generate;
    document.getElementById('copy-agent').onclick = () => navigator.clipboard.writeText(_lastOutput).then(() => showToast('Contenu copie', 'success'));
    document.getElementById('draft-agent').onclick = _createDraft;
  }

  async function _generate(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const brief = document.getElementById('agent-brief').value.trim();
    if (!brief) return showToast('Ajoutez un brief', 'error');
    button.disabled = true; button.textContent = 'Generation en cours...';
    try {
      const response = await NidalAPI.generate({ brand: getActiveBrand(), task: document.getElementById('agent-task').value, brief, context: document.getElementById('agent-context').value.trim() });
      _lastOutput = response.output;
      render();
      showToast(response.isDemo ? 'Proposition de demonstration generee' : 'Proposition generee', 'success');
    } catch (error) { showToast(error.message, 'error'); button.disabled = false; button.textContent = 'Generer'; }
  }

  function _formatOutput(value) { return `<pre>${escapeHtml(value)}</pre>`; }
  function _createDraft() {
    NidalStore.create({ brand: getActiveBrand(), titre: 'Brouillon genere par l’agent', format: 'post', statut: 'brouillon', niveau: 'tous', classes: 'A definir', pilier: 'A definir', objectif: 'A valider', message: _lastOutput, datePublication: '', validation: 'a-valider' });
    showToast('Brouillon ajoute au planning', 'success');
    App.navigateTo('contents');
  }
  return { render };
})();
