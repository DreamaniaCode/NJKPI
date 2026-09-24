/** Studio éditorial Nidal : Studio Nidal Junior (Nounou) & Planning GS Nidal */
const AgentView = (() => {
  let _activeAgentKey = 'studio-junior';

  const AI_CONFIG_KEY = 'nidal_ai_settings';

  const DEFAULT_PROVIDERS = [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Multi-modèles (Llama 3.3, Gemini 2.0, DeepSeek R1, Claude, GPT...)',
      defaultModel: 'meta-llama/llama-3.3-70b-instruct',
      models: [
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct (Recommandé)', recommended: true },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Gratuit)', free: true },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Raisonnement (Gratuit)', free: true },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat V3 (Économique & rapide)' },
        { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct (Gratuit)', free: true },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Qualité supérieure)' },
        { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
        { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2411 (Français parfait)' }
      ],
      allowCustomModel: true
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'API officielle OpenAI (GPT-4o, GPT-4o-mini, o3-mini)',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Rapide et économique)', recommended: true },
        { id: 'gpt-4o', name: 'GPT-4o (Modèle phare multimodal)' },
        { id: 'o3-mini', name: 'o3-mini (Raisonnement avancé)' }
      ],
      allowCustomModel: true
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'API officielle Google Gemini (Gemini 2.0 Flash, 1.5 Pro)',
      defaultModel: 'gemini-2.0-flash',
      models: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Très rapide & récent)', recommended: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Équilibré)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Haute réflexion)' }
      ],
      allowCustomModel: true
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'API officielle Anthropic Claude',
      defaultModel: 'claude-3-5-sonnet-20241022',
      models: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Le plus créatif & soigné)', recommended: true },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Ultra-rapide)' }
      ],
      allowCustomModel: true
    },
    {
      id: 'groq',
      name: 'Groq',
      description: 'Inférence ultra-rapide (LPU)',
      defaultModel: 'llama-3.3-70b-versatile',
      models: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', recommended: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Instantané)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k' }
      ],
      allowCustomModel: true
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'API officielle DeepSeek',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', recommended: true },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
      ],
      allowCustomModel: true
    },
    {
      id: 'demo',
      name: 'Mode Démonstration',
      description: 'Générateur interne basé sur des archétypes stricts par format (aucune clé requise)',
      defaultModel: 'demo-template',
      models: [
        { id: 'demo-template', name: 'Modèles internes Nidal par format', recommended: true }
      ],
      allowCustomModel: false
    }
  ];

  let _aiProviders = DEFAULT_PROVIDERS;
  let _serverAiMeta = { currentServerProvider: 'none', hasServerKey: false };

  function getAiConfig() {
    try {
      const raw = localStorage.getItem(AI_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          provider: parsed.provider || 'openrouter',
          model: parsed.model || 'meta-llama/llama-3.3-70b-instruct',
          customModel: parsed.customModel || '',
          apiKey: parsed.apiKey || ''
        };
      }
    } catch {}
    return {
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct',
      customModel: '',
      apiKey: ''
    };
  }

  function saveAiConfig(cfg) {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
  }

  const _state = {
    'studio-junior': {
      brief: {
        topic: 'Le plaisir de lire avec Nounou',
        audience: 'Enfants de maternelle (3 à 6 ans) et familles',
        objective: 'Stimuler la curiosité et l’amour des livres',
        platform: 'Instagram Reel + Facebook Story',
        format: 'reel',
        duration: '30 secondes',
        slideCount: '5 slides',
        targetDate: '',
        requiredInfo: '',
        cta: 'Racontez-nous en commentaire le livre préféré de votre enfant !',
        assets: 'Mascotte officielle Nounou (assets/mascot.png)',
        includeNounou: true,
        includeStoryboard: true,
        language: 'Français',
        notes: ''
      },
      currentGeneration: null,
      history: [],
      activeTab: 'output',
      showRevision: false,
      revisionText: ''
    },
    'planning-nidal': {
      brief: {
        topic: 'Calendrier éditorial de 4 semaines',
        audience: 'Parents, futurs parents, élèves et communauté GS Nidal',
        objective: 'Équilibrer les piliers : pédagogie, vie scolaire, conseils et Nidal Junior',
        platform: 'Multi-plateformes (Instagram, Facebook, LinkedIn)',
        format: 'calendrier_mois',
        duration: '30 secondes',
        slideCount: '5 slides',
        targetDate: '',
        requiredInfo: '',
        cta: 'Découvrez notre projet éducatif sur gsnidal.ma',
        assets: 'Logo officiel Nidal, charte GS Nidal complète',
        includeNounou: false,
        includeStoryboard: false,
        language: 'Français',
        notes: ''
      },
      currentGeneration: null,
      history: [],
      activeTab: 'output',
      showRevision: false,
      revisionText: ''
    }
  };

  let _initialized = false;

  async function initData() {
    if (_initialized) return;
    try {
      const brand = getActiveBrand();
      _activeAgentKey = brand === 'nidal' ? 'planning-nidal' : 'studio-junior';

      if (NidalAPI.isOnline()) {
        const [genJunior, genPlanning, provData] = await Promise.all([
          NidalAPI.listEditorialGenerations('studio-junior').catch(() => []),
          NidalAPI.listEditorialGenerations('planning-nidal').catch(() => []),
          NidalAPI.listEditorialProviders().catch(() => null)
        ]);
        if (Array.isArray(genJunior) && genJunior.length) {
          _state['studio-junior'].history = genJunior;
          _state['studio-junior'].currentGeneration = _formatLoadedGen(genJunior[0]);
        }
        if (Array.isArray(genPlanning) && genPlanning.length) {
          _state['planning-nidal'].history = genPlanning;
          _state['planning-nidal'].currentGeneration = _formatLoadedGen(genPlanning[0]);
        }
        if (provData?.providers?.length) {
          _aiProviders = provData.providers;
          _serverAiMeta = {
            currentServerProvider: provData.currentServerProvider,
            hasServerKey: Boolean(provData.hasServerKey)
          };
        }
      }
      _initialized = true;
    } catch (e) {
      console.warn('Erreur chargement historique agents:', e.message);
    }
  }

  function _formatLoadedGen(gen) {
    if (!gen) return null;
    return {
      id: gen.id,
      agentKey: gen.agent_key,
      brand: gen.brand_slug,
      brief: gen.brief || {},
      output: gen.output || '',
      structuredData: gen.structured_data || {},
      storyboard: gen.storyboard || null,
      qualityCheck: gen.quality_check || null,
      status: gen.status || 'brouillon',
      contentId: gen.content_id || null,
      model: gen.model || '',
      provider: gen.provider || '',
      isDemo: Boolean(gen.is_demo),
      createdAt: gen.created_at || new Date().toISOString()
    };
  }

  async function render() {
    const view = document.getElementById('view-agent');
    if (!view) return;
    await initData();

    const online = NidalAPI.isOnline();
    const health = NidalAPI.getHealth();
    const aiConfig = getAiConfig();
    const providerObj = _aiProviders.find(p => p.id === aiConfig.provider) || _aiProviders[0];
    const effectiveModel = (aiConfig.model === 'custom' && aiConfig.customModel) ? aiConfig.customModel : aiConfig.model;
    const isCustomKey = Boolean(aiConfig.apiKey?.trim());
    const hasServer = _serverAiMeta.hasServerKey;
    const isDemo = aiConfig.provider === 'demo' || (!isCustomKey && !hasServer);

    const keyStatusText = isCustomKey
      ? '<span class="badge badge--green">Clé locale active</span>'
      : (hasServer
        ? '<span class="badge badge--blue">Clé serveur active</span>'
        : '<span class="badge badge--yellow">Mode démo</span>');

    const currentAgent = _state[_activeAgentKey];
    const gen = currentAgent.currentGeneration;
    const isJunior = _activeAgentKey === 'studio-junior';

    view.innerHTML = `
      <header class="view__header workspace-header">
        <div>
          <span class="section-kicker">Direction éditoriale assistée</span>
          <h1 class="view__title">Agents éditoriaux</h1>
          <p class="view__subtitle">Studio Nidal Junior (Nounou) & Planning stratégique GS Nidal</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn--secondary btn--sm" id="btn-open-ai-settings" title="Configurer l'IA et changer de modèle">
            ⚙️ Moteur IA & Modèles
          </button>
          <span class="connection-pill ${online ? (!isDemo ? 'connection-pill--ok' : 'connection-pill--pending') : 'connection-pill--off'}">
            ${online ? (!isDemo ? `${providerObj.name} connecté` : 'Mode démo actif') : 'Backend hors ligne'}
          </span>
        </div>
      </header>

      <!-- Barre d'état du moteur IA -->
      <section class="ai-engine-bar">
        <div class="ai-engine-bar__info">
          <span>🤖 Fournisseur IA : <strong>${escapeHtml(providerObj.name)}</strong></span>
          <span>·</span>
          <span>Modèle sélectionné : <code class="ai-engine-bar__badge">${escapeHtml(effectiveModel || 'Modèle standard')}</code></span>
          ${keyStatusText}
        </div>
        <div>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-open-ai-settings-inline">
            Changer de modèle / clé
          </button>
        </div>
      </section>

      <!-- Sélecteur d'agent -->
      <section class="agents-selector" role="tablist" aria-label="Sélecteur d'agent">
        <div class="agent-card agent-card--junior ${isJunior ? 'active' : ''}" id="select-agent-junior" role="tab" aria-selected="${isJunior}">
          <img src="./assets/mascot.png" alt="Nounou" class="agent-card__avatar">
          <div class="agent-card__info">
            <strong>Studio Nidal Junior</strong>
            <small>Création jeunesse · Mascotte Nounou · Storyboards, Posts & Quiz</small>
          </div>
        </div>

        <div class="agent-card ${!isJunior ? 'active' : ''}" id="select-agent-planning" role="tab" aria-selected="${!isJunior}">
          <img src="./assets/logo-cropped.png" alt="GS Nidal" class="agent-card__avatar">
          <div class="agent-card__info">
            <strong>Planning GS Nidal</strong>
            <small>Stratégie éditoriale · Calendriers équilibrés · Publications officielles</small>
          </div>
        </div>
      </section>

      <section class="agent-layout">
        <!-- Formulaire de brief -->
        <form class="agent-brief" id="editorial-form">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <span class="section-kicker">${isJunior ? 'Studio Créatif Jeunesse' : 'Stratégie & Calendrier'}</span>
              <h2>${isJunior ? 'Brief pour Studio Nidal Junior' : 'Brief pour Planning GS Nidal'}</h2>
            </div>
            <span class="badge ${isJunior ? 'badge--magenta' : 'badge--blue'}">
              ${isJunior ? 'Mascotte Nounou' : 'Groupe Scolaire Nidal'}
            </span>
          </div>

          <div class="form-group">
            <label for="brief-topic">Sujet principal / Thème *</label>
            <input type="text" id="brief-topic" class="form-control" required
              value="${escapeHtml(currentAgent.brief.topic)}"
              placeholder="${isJunior ? 'Ex : Le plaisir de lire avec Nounou' : 'Ex : Calendrier éditorial de 4 semaines'}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="brief-format">Format / Type de publication *</label>
              <select id="brief-format" class="form-control">
                ${_formatOptionsHtml(_activeAgentKey, currentAgent.brief.format)}
              </select>
            </div>
            <div class="form-group">
              <label for="brief-platform">Canal de diffusion</label>
              <select id="brief-platform" class="form-control">
                ${['Instagram Reel + Facebook Story', 'Instagram + Facebook', 'Story Instagram', 'Facebook', 'LinkedIn + Facebook', 'Magazine jeunesse', 'Multi-plateformes']
                  .map(p => `<option value="${p}" ${currentAgent.brief.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Options dynamiques selon format : Durée pour Reel, Slides pour Carrousel, Note pour Post -->
          <div id="format-duration-group" class="form-group" style="${/reel|vidéo|video/i.test(currentAgent.brief.format) ? '' : 'display:none;'}">
            <label for="brief-duration">Durée totale décidée du Reel / Vidéo *</label>
            <select id="brief-duration" class="form-control">
              <option value="15 secondes" ${currentAgent.brief.duration === '15 secondes' ? 'selected' : ''}>15 secondes (Flash / Rythme soutenu)</option>
              <option value="30 secondes" ${(!currentAgent.brief.duration || currentAgent.brief.duration === '30 secondes') ? 'selected' : ''}>30 secondes (Format standard recommandé)</option>
              <option value="45 secondes" ${currentAgent.brief.duration === '45 secondes' ? 'selected' : ''}>45 secondes (Démonstration pédagogique)</option>
              <option value="60 secondes" ${currentAgent.brief.duration === '60 secondes' ? 'selected' : ''}>60 secondes (Récit complet / Histoire)</option>
            </select>
          </div>

          <div id="format-slides-group" class="form-group" style="${/carrousel/i.test(currentAgent.brief.format) ? '' : 'display:none;'}">
            <label for="brief-slides">Nombre de slides du Carrousel *</label>
            <select id="brief-slides" class="form-control">
              <option value="4 slides" ${currentAgent.brief.slideCount === '4 slides' ? 'selected' : ''}>4 slides (Couverture + 2 étapes + Synthèse)</option>
              <option value="5 slides" ${(!currentAgent.brief.slideCount || currentAgent.brief.slideCount === '5 slides') ? 'selected' : ''}>5 slides (Format recommandé équilibré)</option>
              <option value="6 slides" ${currentAgent.brief.slideCount === '6 slides' ? 'selected' : ''}>6 slides (Approfondissement complet)</option>
              <option value="8 slides" ${currentAgent.brief.slideCount === '8 slides' ? 'selected' : ''}>8 slides (Guide détaillé / Tutoriel)</option>
            </select>
          </div>

          <div id="format-tip-box" class="format-tip" style="${/post/i.test(currentAgent.brief.format) ? '' : 'display:none;'}">
            📌 <strong>Format Post :</strong> Accroche percutante, visuel clair, corps de texte aéré de 2-3 courts paragraphes, CTA clair et <strong>STRICTEMENT 5 HASHTAGS</strong> (aucun storyboard superflu).
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="brief-audience">Public cible</label>
              <input type="text" id="brief-audience" class="form-control"
                value="${escapeHtml(currentAgent.brief.audience)}" placeholder="Enfants, parents...">
            </div>
            <div class="form-group">
              <label for="brief-target-date">Date souhaitée (laisser vide pour « Date à confirmer »)</label>
              <input type="date" id="brief-target-date" class="form-control"
                value="${escapeHtml(currentAgent.brief.targetDate)}">
            </div>
          </div>

          <div class="form-group">
            <label for="brief-objective">Objectif pédagogique / éditorial</label>
            <input type="text" id="brief-objective" class="form-control"
              value="${escapeHtml(currentAgent.brief.objective)}" placeholder="Valoriser l'effort, rassurer...">
          </div>

          <div class="form-group">
            <label for="brief-cta">Appel à l'action (CTA)</label>
            <input type="text" id="brief-cta" class="form-control"
              value="${escapeHtml(currentAgent.brief.cta)}" placeholder="Posez vos questions...">
          </div>

          <div class="form-group">
            <label for="brief-required-info">Informations obligatoires / Faits confirmés</label>
            <textarea id="brief-required-info" class="form-control" rows="2"
              placeholder="Préciser les horaires, lieux ou règles déjà arrêtées">${escapeHtml(currentAgent.brief.requiredInfo)}</textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="brief-assets">Ressources disponibles</label>
              <input type="text" id="brief-assets" class="form-control"
                value="${escapeHtml(currentAgent.brief.assets)}" placeholder="Ex: Mascotte officielle assets/mascot.png">
            </div>
            <div class="form-group">
              <label for="brief-language">Langue</label>
              <select id="brief-language" class="form-control">
                <option value="Français" ${currentAgent.brief.language === 'Français' ? 'selected' : ''}>Français (langue principale)</option>
                <option value="Bilingue FR/AR" ${currentAgent.brief.language === 'Bilingue FR/AR' ? 'selected' : ''}>Bilingue (Français & Arabe)</option>
                <option value="Arabe" ${currentAgent.brief.language === 'Arabe' ? 'selected' : ''}>Arabe</option>
              </select>
            </div>
          </div>

          <!-- Options spécifiques Nounou / Storyboard -->
          <div class="check-grid" style="margin: 12px 0;">
            <label class="check-item">
              <input type="checkbox" id="brief-include-nounou" ${currentAgent.brief.includeNounou ? 'checked' : ''}>
              <span>Présence de Nounou (Mascotte officielle)</span>
            </label>
            <label class="check-item">
              <input type="checkbox" id="brief-include-storyboard" ${currentAgent.brief.includeStoryboard ? 'checked' : ''}>
              <span>Storyboard minuté scène par scène</span>
            </label>
          </div>

          <button class="btn btn--primary btn--block" type="submit" ${online ? '' : 'disabled'}>
            ${online ? (isJunior ? '🎨 Générer avec Studio Nidal Junior' : '🏛️ Générer avec Planning GS Nidal') : 'Connecter le serveur pour générer'}
          </button>
        </form>

        <!-- Sortie et propositions -->
        <section class="agent-output">
          <div class="agent-output__head">
            <div>
              <span class="section-kicker">${isJunior ? 'Production Studio Junior' : 'Proposition Stratégique'}</span>
              <h2>${gen?.structuredData?.titre || 'Proposition éditoriale'}</h2>
              ${gen?.model ? `<small style="display:block;margin-top:3px;color:var(--muted);font-size:11px;">Moteur IA utilisé : <b>${escapeHtml(gen.provider || 'IA')}</b> (${escapeHtml(gen.model)})</small>` : ''}
            </div>
            <div>
              <button class="btn btn--secondary btn--sm" id="btn-copy-all" ${gen ? '' : 'disabled'}>Copier tout</button>
              <button class="btn btn--secondary btn--sm" id="btn-save-draft" ${gen ? '' : 'disabled'}>💾 Brouillon</button>
              <button class="btn btn--primary btn--sm" id="btn-save-planning" ${gen ? '' : 'disabled'}>📅 Au planning</button>
              <button class="btn btn--outline btn--sm" id="btn-transfer-agent" ${gen ? '' : 'disabled'}>
                ${isJunior ? '➡️ Vers Planning GS' : '➡️ Vers Studio Junior'}
              </button>
              <button class="btn btn--outline btn--sm" id="btn-toggle-revision" ${gen ? '' : 'disabled'}>✏️ Révision</button>
            </div>
          </div>

          <!-- Barre d'onglets du résultat -->
          <div class="agent-tabs">
            <button class="agent-tab-btn ${currentAgent.activeTab === 'output' ? 'active' : ''}" data-tab="output">📄 Texte complet</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'metadata' ? 'active' : ''}" data-tab="metadata">📋 Fiche planning</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'storyboard' ? 'active' : ''}" data-tab="storyboard">
              🎬 Storyboard ${gen?.storyboard ? `(${gen.storyboard.length})` : ''}
            </button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'social' ? 'active' : ''}" data-tab="social">📱 Légende & 5 Hashtags</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'quality' ? 'active' : ''}" data-tab="quality">🛡️ Contrôle qualité</button>
          </div>

          <!-- Panneau de révision rapide -->
          ${currentAgent.showRevision ? `
            <div class="revision-panel">
              <strong style="display:block;margin-bottom:6px;font-size:11px;color:var(--blue);">Demander un ajustement à l'agent :</strong>
              <textarea id="revision-prompt" class="form-control" rows="2" placeholder="Ex: Raccourcis l'accroche, change le rythme du Reel, accentue le rôle de Nounou..."></textarea>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button class="btn btn--secondary btn--sm" id="btn-cancel-revision">Annuler</button>
                <button class="btn btn--primary btn--sm" id="btn-submit-revision">Relancer la révision</button>
              </div>
            </div>
          ` : ''}

          <!-- Contenu de l'onglet actif -->
          <div id="agent-tab-content" class="agent-result">
            ${_renderTabContent(currentAgent)}
          </div>

          <!-- Historique des générations de l'agent actif -->
          ${_renderHistorySection(currentAgent)}
        </section>
      </section>`;

    _bindEvents();
  }

  function _formatOptionsHtml(agentKey, selected) {
    if (agentKey === 'studio-junior') {
      return `
        <option value="post" ${selected === 'post' ? 'selected' : ''}>Post réseaux sociaux (Accroche + Corps aéré + 5 hashtags)</option>
        <option value="reel" ${selected === 'reel' ? 'selected' : ''}>Reel vidéo avec Nounou (Script minuté & temps décidé)</option>
        <option value="carrousel" ${selected === 'carrousel' ? 'selected' : ''}>Carrousel d’éveil (Découpage slide par slide)</option>
        <option value="quiz" ${selected === 'quiz' ? 'selected' : ''}>Quiz ludo-éducatif interactif (3 questions avec Nounou)</option>
        <option value="story" ${selected === 'story' ? 'selected' : ''}>Série de Stories interactives (Sondages & stickers)</option>
        <option value="article" ${selected === 'article' ? 'selected' : ''}>Article pédagogique jeunesse</option>
        <option value="conte" ${selected === 'conte' ? 'selected' : ''}>Mini-conte ou histoire de Nounou</option>
        <option value="infographie" ${selected === 'infographie' ? 'selected' : ''}>Infographie par étapes</option>
      `;
    }
    return `
      <option value="post_institutionnel" ${selected === 'post_institutionnel' ? 'selected' : ''}>Publication institutionnelle officielle (5 hashtags ciblés)</option>
      <option value="reel_pedagogique" ${selected === 'reel_pedagogique' ? 'selected' : ''}>Vidéo institutionnelle / Reel (Script minuté)</option>
      <option value="carrousel_methode" ${selected === 'carrousel_methode' ? 'selected' : ''}>Carrousel méthodes pédagogiques (Slide par slide)</option>
      <option value="calendrier_mois" ${selected === 'calendrier_mois' ? 'selected' : ''}>Calendrier mensuel (4 semaines équilibrées)</option>
      <option value="planning_semaine" ${selected === 'planning_semaine' ? 'selected' : ''}>Planning hebdomadaire (7 jours détaillés)</option>
      <option value="infographie_conseils" ${selected === 'infographie_conseils' ? 'selected' : ''}>Infographie conseils aux familles</option>
      <option value="annonce_officielle" ${selected === 'annonce_officielle' ? 'selected' : ''}>Annonce administrative validée</option>
    `;
  }

  function _renderTabContent(agent) {
    const gen = agent.currentGeneration;
    if (!gen) {
      return `
        <div class="empty-state" style="padding:40px 20px;">
          <img src="./assets/mascot.png" alt="Nounou" style="width:70px;height:auto;opacity:0.85;">
          <div>
            <strong>Prêt à créer du contenu officiel Nidal</strong>
            <p>Remplissez le brief ci-contre et lancez la génération. Les résultats respecteront scrupuleusement la charte, les valeurs et la sécurité des données.</p>
          </div>
        </div>`;
    }

    const data = gen.structuredData || {};

    if (agent.activeTab === 'metadata') {
      return `
        <div style="background:var(--surface);padding:18px;border-radius:6px;font-size:12px;line-height:1.7;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><strong style="color:var(--muted);">TITRE :</strong><br><b style="font-size:14px;color:var(--ink);">${escapeHtml(data.titre || 'Sans titre')}</b></div>
            <div><strong style="color:var(--muted);">TYPE & STATUT :</strong><br><span class="badge badge--blue">${escapeHtml(data.format || 'article')}</span> <span class="badge badge--yellow">${escapeHtml(gen.status || 'brouillon')}</span></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><strong style="color:var(--muted);">DATE PROPOSÉE :</strong><br>${escapeHtml(data.datePublication || 'Date à confirmer')}</div>
            <div><strong style="color:var(--muted);">CANAL :</strong><br>${escapeHtml(data.canal || data.plateforme || 'Instagram + Facebook')}</div>
          </div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">PUBLIC CIBLE :</strong><br>${escapeHtml(data.publicCible || 'Enfants et familles')}</div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">OBJECTIF :</strong><br>${escapeHtml(data.objectif || 'Pédagogique et bienveillant')}</div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">ACCROCHE :</strong><br><em>« ${escapeHtml(data.accroche || data.titre)} »</em></div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">APPEL À L'ACTION :</strong><br>${escapeHtml(data.cta || 'Partagez vos impressions')}</div>
          <div><strong style="color:var(--muted);">TAGS :</strong><br>${(data.tags || []).map(t => `<span class="badge" style="margin-right:4px;">${escapeHtml(t)}</span>`).join('')}</div>
        </div>`;
    }

    if (agent.activeTab === 'storyboard') {
      if (!gen.storyboard || !gen.storyboard.length) {
        return `<p style="padding:20px;text-align:center;color:var(--muted);">Aucun storyboard détaillé détecté pour ce format. Cochez la case « Storyboard minuté » et choisissez un format Reel/Vidéo pour en générer un.</p>`;
      }
      return `
        <div class="storyboard-timeline">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:var(--blue);font-size:12px;">Storyboard minuté avec la mascotte Nounou (assets/mascot.png)</strong>
            <span class="badge badge--magenta">${gen.storyboard.length} Scènes</span>
          </div>
          ${gen.storyboard.map(s => `
            <div class="storyboard-card">
              <div class="storyboard-card__head">
                <span>SCÈNE ${s.scene}</span>
                <span class="storyboard-card__badge">${escapeHtml(s.duration || '0 à 3s')}</span>
              </div>
              <div class="storyboard-field"><strong>Cadrage :</strong> ${escapeHtml(s.cadrage || 'Plan moyen centré')}</div>
              <div class="storyboard-field"><strong>Visuel :</strong> ${escapeHtml(s.visuel || 'Charte bleu-magenta-jaune')}</div>
              <div class="storyboard-field"><strong>Action de Nounou :</strong> ${escapeHtml(s.actionNounou || 'Nounou sourit avec bienveillance')}</div>
              <div class="storyboard-field" style="background:#fff;padding:6px 10px;border-radius:4px;margin:6px 0;border-left:3px solid var(--blue);">
                <strong style="color:var(--blue);">Voix de Nounou :</strong> <em>« ${escapeHtml(s.voix || 'Bonjour les amis !')} »</em>
              </div>
              <div class="storyboard-field"><strong>Texte écran :</strong> ${escapeHtml(s.texteEcran || 'Titre épuré')}</div>
              <div style="display:flex;gap:12px;font-size:10px;color:var(--muted);margin-top:6px;">
                <span><b>Transition :</b> ${escapeHtml(s.transition || 'Fluide')}</span>
                <span><b>Son :</b> ${escapeHtml(s.son || 'Mélodie douce')}</span>
              </div>
            </div>
          `).join('')}
        </div>`;
    }

    if (agent.activeTab === 'social') {
      const tagsString = (data.tags || []).join(' ');
      return `
        <div style="background:var(--surface);padding:18px;border-radius:6px;font-size:12px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <strong style="color:var(--blue);">Légende prête à publier :</strong>
            <button class="btn btn--secondary btn--sm" id="btn-copy-caption">Copier la légende</button>
          </div>
          <div id="caption-body" style="background:#ffffff;padding:14px;border:1px solid var(--line);border-radius:4px;white-space:pre-wrap;font-family:inherit;">${escapeHtml(data.message || gen.output)}</div>
          <div style="margin-top:14px;">
            <strong style="color:var(--muted);display:block;margin-bottom:6px;">Hashtags optimisés (5 à 10) :</strong>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${(data.tags || []).map(t => `<span class="badge badge--blue">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }

    if (agent.activeTab === 'quality') {
      const q = gen.qualityCheck || {};
      return `
        <div style="background:var(--surface);padding:18px;border-radius:6px;font-size:12px;line-height:1.8;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <span class="badge badge--green" style="font-size:12px;padding:4px 10px;">✓ Contrôle qualité validé</span>
            <small style="color:var(--muted);">Vérification automatique de conformité éditoriale et visuelle</small>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="background:#fff;padding:12px;border:1px solid var(--line);border-radius:4px;">
              <strong style="color:var(--green);">✓ Informations vérifiées :</strong>
              <p style="margin:4px 0 0;color:var(--ink);">${escapeHtml(q.verified || 'Charte de marque, rôle de Nounou et logo officiel respectés.')}</p>
            </div>
            <div style="background:#fff;padding:12px;border:1px solid var(--line);border-radius:4px;">
              <strong style="color:#d97706;">⚠ Informations à confirmer :</strong>
              <p style="margin:4px 0 0;color:var(--ink);">${escapeHtml(q.toConfirm || 'Date finale à arrêter dans le calendrier.')}</p>
            </div>
          </div>
          <div style="margin-top:14px;background:#fff;padding:12px;border:1px solid var(--line);border-radius:4px;">
            <div><b>Conformité éditoriale :</b> <span style="color:var(--green);">✓ Conforme (ton positif, bienveillant et instructif)</span></div>
            <div><b>Conformité visuelle :</b> <span style="color:var(--green);">✓ Conforme (logo en haut à gauche, slogan PLUS QU’UNE ÉCOLE, UN AVENIR)</span></div>
            <div><b>Autorisation d’image nécessaire :</b> ${q.imageConsentRequired ? '<span style="color:var(--red);">Oui (accord parental requis)</span>' : '<span style="color:var(--green);">Non (Nounou / graphismes seuls)</span>'}</div>
            <div><b>Prêt à enregistrer :</b> <span style="color:var(--green);">✓ Oui (au statut brouillon)</span></div>
            <div><b>Prêt à publier :</b> <span style="color:var(--blue);">En attente de validation humaine (jamais automatique)</span></div>
          </div>
        </div>`;
    }

    // Default: full formatted output
    return `<pre style="white-space:pre-wrap;font-family:inherit;font-size:12.5px;line-height:1.65;margin:0;">${escapeHtml(gen.output)}</pre>`;
  }

  function _renderHistorySection(agent) {
    if (!agent.history || !agent.history.length) return '';
    return `
      <div class="history-strip">
        <strong style="display:block;margin-bottom:8px;font-size:11px;color:var(--muted);">HISTORIQUE DES PROPOSITIONS RÉCENTES</strong>
        <div>
          ${agent.history.slice(0, 6).map(item => `
            <div class="history-item" data-history-id="${item.id}">
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;">
                <strong>${escapeHtml(item.structured_data?.titre || item.brief?.topic || 'Proposition')}</strong>
                <small style="color:var(--muted);margin-left:6px;">${escapeHtml(item.structured_data?.format || 'article')}</small>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="badge ${item.status === 'publie' ? 'badge--green' : 'badge--yellow'}">${escapeHtml(item.status || 'brouillon')}</span>
                <button class="btn btn--icon btn--sm" data-delete-id="${item.id}" title="Supprimer" style="color:var(--red);">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  function _bindEvents() {
    // Open AI Settings Modal
    const btnOpenAi = document.getElementById('btn-open-ai-settings');
    const btnOpenAiInline = document.getElementById('btn-open-ai-settings-inline');
    if (btnOpenAi) btnOpenAi.onclick = showAiConfigModal;
    if (btnOpenAiInline) btnOpenAiInline.onclick = showAiConfigModal;

    // Format change listener for dynamic options (Duration for Reel, Slides for Carrousel, Tip for Post)
    const formatSelect = document.getElementById('brief-format');
    if (formatSelect) {
      formatSelect.onchange = () => {
        const fmt = formatSelect.value;
        const durGroup = document.getElementById('format-duration-group');
        const slidesGroup = document.getElementById('format-slides-group');
        const tipBox = document.getElementById('format-tip-box');
        if (durGroup) durGroup.style.display = /reel|vidéo|video/i.test(fmt) ? '' : 'none';
        if (slidesGroup) slidesGroup.style.display = /carrousel/i.test(fmt) ? '' : 'none';
        if (tipBox) tipBox.style.display = /post/i.test(fmt) ? '' : 'none';
      };
    }

    // Select agent
    const btnJunior = document.getElementById('select-agent-junior');
    const btnPlanning = document.getElementById('select-agent-planning');
    if (btnJunior) {
      btnJunior.onclick = () => {
        _activeAgentKey = 'studio-junior';
        render();
      };
    }
    if (btnPlanning) {
      btnPlanning.onclick = () => {
        _activeAgentKey = 'planning-nidal';
        render();
      };
    }

    // Tabs
    document.querySelectorAll('.agent-tab-btn').forEach(btn => {
      btn.onclick = () => {
        _state[_activeAgentKey].activeTab = btn.dataset.tab;
        render();
      };
    });

    // Form submit
    const form = document.getElementById('editorial-form');
    if (form) {
      form.onsubmit = _onGenerate;
    }

    // Actions
    const currentAgent = _state[_activeAgentKey];
    const gen = currentAgent.currentGeneration;

    const btnCopyAll = document.getElementById('btn-copy-all');
    if (btnCopyAll && gen) {
      btnCopyAll.onclick = () => navigator.clipboard.writeText(gen.output).then(() => showToast('Contenu copié dans le presse-papiers', 'success'));
    }

    const btnCopyCaption = document.getElementById('btn-copy-caption');
    if (btnCopyCaption && gen) {
      const captionText = gen.structuredData?.message || gen.output;
      btnCopyCaption.onclick = () => navigator.clipboard.writeText(captionText).then(() => showToast('Légende copiée', 'success'));
    }

    const btnSaveDraft = document.getElementById('btn-save-draft');
    if (btnSaveDraft && gen) {
      btnSaveDraft.onclick = () => _saveContent('brouillon');
    }

    const btnSavePlanning = document.getElementById('btn-save-planning');
    if (btnSavePlanning && gen) {
      btnSavePlanning.onclick = () => _saveContent('planifie');
    }

    const btnTransfer = document.getElementById('btn-transfer-agent');
    if (btnTransfer && gen) {
      btnTransfer.onclick = _onTransfer;
    }

    const btnToggleRev = document.getElementById('btn-toggle-revision');
    if (btnToggleRev) {
      btnToggleRev.onclick = () => {
        currentAgent.showRevision = !currentAgent.showRevision;
        render();
      };
    }

    const btnCancelRev = document.getElementById('btn-cancel-revision');
    if (btnCancelRev) {
      btnCancelRev.onclick = () => {
        currentAgent.showRevision = false;
        render();
      };
    }

    const btnSubmitRev = document.getElementById('btn-submit-revision');
    if (btnSubmitRev) {
      btnSubmitRev.onclick = _onSubmitRevision;
    }

    // History clicks
    document.querySelectorAll('.history-item').forEach(el => {
      el.onclick = (e) => {
        if (e.target.dataset.deleteId) return; // handled below
        const found = currentAgent.history.find(h => h.id === el.dataset.historyId);
        if (found) {
          currentAgent.currentGeneration = _formatLoadedGen(found);
          currentAgent.activeTab = 'output';
          render();
          showToast('Proposition rechargée', 'info');
        }
      };
    });

    // History delete button
    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette proposition ?');
        if (!confirmDelete) return;
        try {
          await NidalAPI.deleteEditorialGeneration(id);
          currentAgent.history = currentAgent.history.filter(h => h.id !== id);
          if (currentAgent.currentGeneration?.id === id) {
            currentAgent.currentGeneration = currentAgent.history[0] ? _formatLoadedGen(currentAgent.history[0]) : null;
          }
          render();
          showToast('Proposition supprimée', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });
  }

  function _readFormInputs() {
    const format = document.getElementById('brief-format').value;
    const durEl = document.getElementById('brief-duration');
    const slideEl = document.getElementById('brief-slides');

    return {
      topic: document.getElementById('brief-topic').value.trim(),
      format,
      duration: durEl ? durEl.value : undefined,
      slideCount: slideEl ? slideEl.value : undefined,
      platform: document.getElementById('brief-platform').value,
      audience: document.getElementById('brief-audience').value.trim(),
      targetDate: document.getElementById('brief-target-date').value,
      objective: document.getElementById('brief-objective').value.trim(),
      cta: document.getElementById('brief-cta').value.trim(),
      requiredInfo: document.getElementById('brief-required-info').value.trim(),
      assets: document.getElementById('brief-assets').value.trim(),
      language: document.getElementById('brief-language').value,
      includeNounou: document.getElementById('brief-include-nounou').checked,
      includeStoryboard: document.getElementById('brief-include-storyboard').checked
    };
  }

  async function _onGenerate(e) {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type="submit"]');
    const inputs = _readFormInputs();
    if (!inputs.topic) return showToast('Veuillez renseigner un sujet', 'error');

    _state[_activeAgentKey].brief = { ..._state[_activeAgentKey].brief, ...inputs };
    btn.disabled = true;
    btn.textContent = 'Création en cours par l’agent...';

    const aiConfig = getAiConfig();

    try {
      const response = await NidalAPI.generateEditorial({
        agentKey: _activeAgentKey,
        brand: _activeAgentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior',
        aiConfig,
        ...inputs
      });

      const loaded = _formatLoadedGen(response);
      _state[_activeAgentKey].currentGeneration = loaded;
      _state[_activeAgentKey].activeTab = 'output';
      _state[_activeAgentKey].showRevision = false;
      _state[_activeAgentKey].history.unshift(response);

      if (response.savedContent) {
        NidalStore.create(response.savedContent.data || response.savedContent);
        showToast('Proposition créée et enregistrée automatiquement dans l’application !', 'success');
      } else {
        showToast(response.isDemo ? 'Proposition de démonstration préparée' : 'Proposition officielle générée', 'success');
      }

      render();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Générer avec l’Agent';
    }
  }

  async function _onSubmitRevision() {
    const revText = document.getElementById('revision-prompt')?.value.trim();
    if (!revText) return showToast('Veuillez indiquer vos consignes de révision', 'error');

    const currentAgent = _state[_activeAgentKey];
    const gen = currentAgent.currentGeneration;
    const inputs = _readFormInputs();
    const aiConfig = getAiConfig();

    showToast('Révision en cours...', 'info');

    try {
      const response = await NidalAPI.generateEditorial({
        agentKey: _activeAgentKey,
        brand: _activeAgentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior',
        aiConfig,
        ...inputs,
        revisionOf: `Consignes de révision sur la proposition précédente (« ${gen?.structuredData?.titre || inputs.topic} ») :\n${revText}\n\nContenu précédent à ajuster :\n${gen?.output || ''}`
      });

      const loaded = _formatLoadedGen(response);
      currentAgent.currentGeneration = loaded;
      currentAgent.activeTab = 'output';
      currentAgent.showRevision = false;
      currentAgent.history.unshift(response);

      render();
      showToast('Révision générée avec succès', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function showAiConfigModal() {
    const existing = document.getElementById('modal-ai-config');
    if (existing) existing.remove();

    const aiConfig = getAiConfig();
    let currentProviderId = aiConfig.provider || 'openrouter';
    let currentModel = aiConfig.model || 'meta-llama/llama-3.3-70b-instruct';
    let customModel = aiConfig.customModel || '';
    let apiKey = aiConfig.apiKey || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-ai-config';

    const renderModalBody = () => {
      const provider = _aiProviders.find(p => p.id === currentProviderId) || _aiProviders[0];
      const models = provider.models || [];
      const isCustomSelected = currentModel === 'custom' || (!models.some(m => m.id === currentModel) && currentModel);

      return `
        <div class="modal" style="max-width: 620px;">
          <div class="modal__header">
            <div>
              <span class="section-kicker">Configuration IA</span>
              <h3 class="modal__title">Moteur d'IA & Choix des Modèles</h3>
            </div>
            <button class="modal__close" id="ai-modal-close" type="button">&times;</button>
          </div>
          <div class="modal__body">
            <p style="margin: 0 0 16px; font-size: 11.5px; color: var(--muted);">
              Personnalisez le fournisseur d'IA et le modèle utilisé par Studio Nidal Junior et Planning GS Nidal. Vos clés et choix sont conservés directement dans votre navigateur.
            </p>

            <div class="form-group">
              <label for="ai-select-provider">Fournisseur d'IA *</label>
              <select id="ai-select-provider" class="form-control">
                ${_aiProviders.map(p => `
                  <option value="${p.id}" ${p.id === currentProviderId ? 'selected' : ''}>
                    ${escapeHtml(p.name)} — ${escapeHtml(p.description)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" id="ai-model-select-group" style="${currentProviderId === 'demo' ? 'display:none;' : ''}">
              <label for="ai-select-model">Modèle de langage *</label>
              <select id="ai-select-model" class="form-control">
                ${models.map(m => `
                  <option value="${m.id}" ${(!isCustomSelected && m.id === currentModel) ? 'selected' : ''}>
                    ${escapeHtml(m.name)}${m.free ? ' [Gratuit]' : ''}${m.recommended ? ' ⭐' : ''}
                  </option>
                `).join('')}
                ${provider.allowCustomModel ? `<option value="custom" ${isCustomSelected ? 'selected' : ''}>✏️ Autre modèle (saisir manuellement)...</option>` : ''}
              </select>
            </div>

            <div class="form-group" id="ai-custom-model-group" style="${(isCustomSelected && currentProviderId !== 'demo') ? '' : 'display:none;'}">
              <label for="ai-input-custom-model">Slug du modèle personnalisé *</label>
              <input type="text" id="ai-input-custom-model" class="form-control"
                value="${escapeHtml(customModel || (isCustomSelected ? currentModel : ''))}"
                placeholder="${currentProviderId === 'openrouter' ? 'Ex: meta-llama/llama-3.3-70b-instruct' : 'Ex: gpt-4o ou gemini-2.0-flash'}">
              <small style="color:var(--muted);font-size:10px;margin-top:4px;display:block;">
                Saisissez le slug exact du modèle (ex: meta-llama/llama-3.3-70b-instruct pour OpenRouter).
              </small>
            </div>

            <div class="form-group" style="${currentProviderId === 'demo' ? 'display:none;' : ''}">
              <label for="ai-input-api-key">Clé d'API ${escapeHtml(provider.name)}</label>
              <div style="display:flex;gap:6px;">
                <input type="password" id="ai-input-api-key" class="form-control" style="flex:1;"
                  value="${escapeHtml(apiKey)}"
                  placeholder="Laisser vide si configurée côté serveur">
                <button type="button" class="btn btn--secondary btn--sm" id="ai-toggle-key-visibility" title="Afficher/masquer">👁️</button>
              </div>
              <small style="color:var(--muted);font-size:10.5px;margin-top:5px;display:block;">
                🔒 Votre clé est stockée dans votre navigateur (localStorage) et transmise lors des requêtes au serveur.
              </small>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" id="ai-modal-cancel">Annuler</button>
            <button type="button" class="btn btn--primary" id="ai-modal-save">Enregistrer la configuration</button>
          </div>
        </div>
      `;
    };

    overlay.innerHTML = renderModalBody();
    document.body.appendChild(overlay);

    const bindModalEvents = () => {
      const closeBtn = document.getElementById('ai-modal-close');
      const cancelBtn = document.getElementById('ai-modal-cancel');
      const saveBtn = document.getElementById('ai-modal-save');
      const providerSelect = document.getElementById('ai-select-provider');
      const modelSelect = document.getElementById('ai-select-model');
      const toggleKeyBtn = document.getElementById('ai-toggle-key-visibility');
      const keyInput = document.getElementById('ai-input-api-key');

      const closeModal = () => overlay.remove();
      if (closeBtn) closeBtn.onclick = closeModal;
      if (cancelBtn) cancelBtn.onclick = closeModal;

      if (toggleKeyBtn && keyInput) {
        toggleKeyBtn.onclick = () => {
          keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
        };
      }

      if (providerSelect) {
        providerSelect.onchange = () => {
          currentProviderId = providerSelect.value;
          const prov = _aiProviders.find(p => p.id === currentProviderId) || _aiProviders[0];
          currentModel = prov.defaultModel || (prov.models?.[0]?.id || 'custom');
          overlay.innerHTML = renderModalBody();
          bindModalEvents();
        };
      }

      if (modelSelect) {
        modelSelect.onchange = () => {
          currentModel = modelSelect.value;
          const customGroup = document.getElementById('ai-custom-model-group');
          if (customGroup) {
            customGroup.style.display = currentModel === 'custom' ? '' : 'none';
          }
        };
      }

      if (saveBtn) {
        saveBtn.onclick = () => {
          const selectedProv = document.getElementById('ai-select-provider')?.value || 'openrouter';
          const selectedMod = document.getElementById('ai-select-model')?.value || 'meta-llama/llama-3.3-70b-instruct';
          const customModInput = document.getElementById('ai-input-custom-model')?.value?.trim() || '';
          const keyVal = document.getElementById('ai-input-api-key')?.value?.trim() || '';

          const finalModel = selectedMod === 'custom' && customModInput ? customModInput : selectedMod;

          saveAiConfig({
            provider: selectedProv,
            model: finalModel,
            customModel: customModInput,
            apiKey: keyVal
          });

          showToast('Configuration IA enregistrée avec succès !', 'success');
          closeModal();
          render();
        };
      }
    };

    bindModalEvents();
  }

  async function _saveContent(status = 'brouillon') {
    const currentAgent = _state[_activeAgentKey];
    const gen = currentAgent.currentGeneration;
    if (!gen || !gen.structuredData) return showToast('Aucun contenu à enregistrer', 'error');

    const brand = _activeAgentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior';
    const structured = {
      ...gen.structuredData,
      brand,
      statut: status,
      validation: status === 'publie' ? 'approuve' : 'a-valider'
    };

    try {
      if (NidalAPI.isOnline()) {
        const result = await NidalAPI.saveToPlanning({
          generationId: gen.id,
          structuredData: structured,
          brand,
          targetStatus: status
        });
        if (result?.content) {
          NidalStore.create(result.content.data || result.content);
        } else {
          NidalStore.create(structured);
        }
      } else {
        NidalStore.create(structured);
      }

      gen.status = status;
      showToast(status === 'planifie' ? 'Contenu ajouté au planning !' : 'Contenu enregistré comme brouillon !', 'success');
      render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function _onTransfer() {
    const fromAgent = _activeAgentKey;
    const toAgent = fromAgent === 'studio-junior' ? 'planning-nidal' : 'studio-junior';
    const gen = _state[fromAgent].currentGeneration;
    if (!gen) return;

    const sourceTitle = gen.structuredData?.titre || gen.brief?.topic || 'Contenu';

    if (NidalAPI.isOnline() && gen.id) {
      NidalAPI.transferEditorial({
        fromAgent,
        toAgent,
        sourceGenerationId: gen.id,
        notes: `Transfert depuis ${fromAgent}`
      }).catch(() => {});
    }

    // Switch to target agent and pre-fill its brief
    _activeAgentKey = toAgent;
    if (toAgent === 'planning-nidal') {
      _state['planning-nidal'].brief.topic = `Planification : ${sourceTitle}`;
      _state['planning-nidal'].brief.requiredInfo = `Contenu produit par Studio Nidal Junior avec Nounou. Storyboard et légende prêts pour intégration au calendrier.`;
      showToast('Sujet transmis à Planning GS Nidal pour intégration au calendrier', 'success');
    } else {
      _state['studio-junior'].brief.topic = sourceTitle;
      _state['studio-junior'].brief.objective = gen.structuredData?.objectif || 'Animation pédagogique avec Nounou';
      _state['studio-junior'].brief.includeNounou = true;
      _state['studio-junior'].brief.includeStoryboard = true;
      showToast('Sujet jeunesse transmis à Studio Nidal Junior pour script et storyboard avec Nounou', 'success');
    }

    render();
  }

  return { render };
})();
