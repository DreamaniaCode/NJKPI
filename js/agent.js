/** Studio éditorial Nidal : Studio Nidal Junior (Nounou) & Planning GS Nidal */
const AgentView = (() => {
  const ACTIVE_AGENT_KEY = 'nidal_active_agent';
  let _activeAgentKey = (() => {
    const saved = localStorage.getItem(ACTIVE_AGENT_KEY);
    return ['studio-junior', 'planning-nidal'].includes(saved) ? saved : 'studio-junior';
  })();

  const AI_CONFIG_KEY = 'nidal_ai_settings';

  function _selectAgent(agentKey, { renderNow = true } = {}) {
    if (!['studio-junior', 'planning-nidal'].includes(agentKey)) return;
    _activeAgentKey = agentKey;
    localStorage.setItem(ACTIVE_AGENT_KEY, agentKey);

    const brand = agentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior';
    if (typeof setActiveBrand === 'function' && getActiveBrand() !== brand) {
      setActiveBrand(brand);
      const switcher = document.getElementById('brand-switch');
      if (switcher) switcher.value = brand;
    }

    if (renderNow) render();
  }

  const DEFAULT_PROVIDERS = [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Routeur multi-modèles avec sélection gratuite automatique',
      defaultModel: 'openrouter/free',
      models: [
        { id: 'openrouter/free', name: 'OpenRouter Free Router', recommended: true, free: true }
      ],
      allowCustomModel: true
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'API officielle OpenAI',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', recommended: true },
        { id: 'gpt-4o', name: 'GPT-4o' }
      ],
      allowCustomModel: true
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'API officielle Google Gemini',
      defaultModel: 'gemini-3.8-flash',
      models: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (GA)', recommended: true }
      ],
      allowCustomModel: true
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'API officielle Anthropic',
      defaultModel: 'claude-3-5-sonnet-20241022',
      models: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude Sonnet' }
      ],
      allowCustomModel: true
    },
    {
      id: 'groq',
      name: 'Groq',
      description: 'Inférence rapide',
      defaultModel: 'llama-3.3-70b-versatile',
      models: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', recommended: true }
      ],
      allowCustomModel: true
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'API officielle DeepSeek',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', recommended: true },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' }
      ],
      allowCustomModel: true
    },
    {
      id: 'alibaba',
      name: 'Alibaba Cloud Model Studio',
      description: 'Qwen via API OpenAI-compatible',
      defaultModel: 'qwen3.8-flash',
      models: [
        { id: 'qwen3.8-flash', name: 'Qwen 3.8 Flash', recommended: true },
        { id: 'qwen3.8-max', name: 'Qwen 3.8 Max' },
        { id: 'qwen3.7-plus', name: 'Qwen 3.7 Plus' }
      ],
      allowCustomModel: true
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      description: 'Workers AI OpenAI-compatible',
      defaultModel: '@cf/qwen/qwen3.8-27b',
      models: [
        { id: '@cf/qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', recommended: true },
        { id: '@cf/zai-org/glm-5.2', name: 'GLM 5.2' },
        { id: '@cf/meta/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout' }
      ],
      allowCustomModel: true
    },
    {
      id: 'demo',
      name: 'Mode Démonstration',
      description: 'Générateur interne sans clé API',
      defaultModel: 'demo-template',
      models: [{ id: 'demo-template', name: 'Modèles internes Nidal', recommended: true }],
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
        const provider = parsed.provider || 'gemini';
        let model = parsed.model || 'gemini-3.8-flash';
        if (provider === 'gemini' && /^gemini-2\./i.test(model)) {
          model = 'gemini-3.8-flash';
          localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ ...parsed, provider, model }));
        }
        return {
          provider,
          model,
          customModel: parsed.customModel || '',
          apiKey: parsed.apiKey || ''
        };
      }
    } catch {}
    return {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
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
        platform: 'Instagram + Facebook',
        format: 'post',
        duration: '30 secondes',
        slideCount: '5 slides',
        targetDate: '',
        requiredInfo: '',
        cta: 'Quel est le livre préféré de votre enfant en ce moment ? Dites-le-nous en commentaire !',
        assets: 'Mascotte officielle Nounou (assets/mascot.png)',
        includeNounou: true,
        includeStoryboard: false,
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
        topic: 'La méthode Active Learning : Favoriser l\'engagement des élèves',
        audience: 'Parents, futurs parents, élèves et communauté GS Nidal',
        objective: 'Valoriser l\'apprentissage actif, la motivation et l\'excellence pédagogique',
        platform: 'Instagram + Facebook',
        format: 'post_institutionnel',
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
      const savedAgent = localStorage.getItem(ACTIVE_AGENT_KEY);
      if (!['studio-junior', 'planning-nidal'].includes(savedAgent)) {
        _activeAgentKey = brand === 'nidal' ? 'planning-nidal' : 'studio-junior';
        localStorage.setItem(ACTIVE_AGENT_KEY, _activeAgentKey);
      }

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

  function render() {
    const view = document.getElementById('view-agent');
    if (!view) return;
    if (!_initialized) {
      initData().then(() => render());
    }

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

      <section class="pro-strategy-panel">
        <div class="pro-strategy-panel__copy">
          <span class="section-kicker">Agent Social Media Senior</span>
          <h2>Plan professionnel basé sur vos vraies données</h2>
          <p>
            L'agent analyse les publications collectées, les formats utilisés, les meilleurs contenus,
            les KPI, l'audience et les campagnes disponibles. Il détecte ce qui manque puis construit
            un plan opérationnel Posts + Carrousels + Reels + Stories + Vidéos.
          </p>
        </div>
        <div class="pro-strategy-panel__controls">
          <label>
            Horizon
            <select id="pro-plan-days" class="form-control">
              <option value="7">7 jours</option>
              <option value="14">14 jours</option>
              <option value="30" selected>30 jours</option>
            </select>
          </label>
          <label>
            Priorité
            <select id="pro-plan-objective" class="form-control">
              <option value="croissance, engagement et inscriptions">Croissance + engagement + inscriptions</option>
              <option value="inscriptions et génération de leads">Inscriptions / leads</option>
              <option value="notoriété et visibilité locale">Notoriété locale</option>
              <option value="engagement et communauté">Engagement communauté</option>
              <option value="valorisation pédagogique et confiance des parents">Confiance / pédagogie</option>
            </select>
          </label>
          <button type="button" class="btn btn--primary" id="btn-pro-plan">✨ Analyser & créer le plan</button>
        </div>
        <div class="pro-strategy-panel__features">
          <span>✓ Audit des contenus</span>
          <span>✓ Détection des manques</span>
          <span>✓ Mix formats</span>
          <span>✓ Planning exécutable</span>
          <span>✓ KPI à suivre</span>
        </div>
      </section>

      <section class="agent-layout">
        <!-- Formulaire de brief -->
        <form class="agent-brief agent-brief--simple" id="editorial-form">
          <div class="agent-simple-head">
            <div>
              <span class="section-kicker">${isJunior ? 'Studio Nidal Junior' : 'Planning GS Nidal'}</span>
              <h2>Que voulez-vous créer ?</h2>
              <p>Donnez simplement le sujet. Vous pouvez aussi mettre plusieurs sujets, un par ligne.</p>
            </div>
            <span class="badge ${isJunior ? 'badge--magenta' : 'badge--blue'}">${isJunior ? 'Nounou' : 'GS Nidal'}</span>
          </div>

          <div class="form-group agent-topic-group">
            <div class="agent-topic-toolbar">
              <label for="brief-topic">Sujet(s) *</label>
              <select id="brief-topic-mode" class="compact-select">
                <option value="single" ${(currentAgent.brief.topicMode || 'single') === 'single' ? 'selected' : ''}>1 sujet</option>
                <option value="multiple" ${currentAgent.brief.topicMode === 'multiple' ? 'selected' : ''}>Plusieurs sujets</option>
              </select>
            </div>
            <textarea id="brief-topic" class="form-control agent-topic-input" rows="7" required
              placeholder="${isJunior ? 'Ex : Le plaisir de lire avec Nounou' : 'Ex : Active Learning\nPortes ouvertes\nVie scolaire et projets élèves'}">${escapeHtml(currentAgent.brief.topic)}</textarea>
            <small>Pour plusieurs sujets : écrivez un sujet par ligne. L’IA les traitera séparément.</small>
          </div>

          <div class="agent-quick-options">
            <div class="form-group">
              <label for="brief-format">Type de contenu</label>
              <select id="brief-format" class="form-control">${_formatOptionsHtml(_activeAgentKey, currentAgent.brief.format)}</select>
            </div>
            <div class="form-group">
              <label for="brief-platform">Plateforme</label>
              <select id="brief-platform" class="form-control">
                ${['Instagram + Facebook (IG + FB)', 'Instagram (IG)', 'Facebook (FB)', 'Instagram Reel + Facebook Story', 'Instagram Story', 'Facebook Reel', 'LinkedIn + Facebook', 'TikTok', 'Multi-plateformes']
                  .map(p => `<option value="${p}" ${currentAgent.brief.platform === p || (!currentAgent.brief.platform && p.startsWith('Instagram + Facebook')) ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>

          <div id="format-duration-group" class="form-group" style="${/reel|vidéo|video/i.test(currentAgent.brief.format) ? '' : 'display:none;'}">
            <label for="brief-duration">Durée</label>
            <select id="brief-duration" class="form-control">
              <option value="15 secondes" ${currentAgent.brief.duration === '15 secondes' ? 'selected' : ''}>15 s</option>
              <option value="30 secondes" ${(!currentAgent.brief.duration || currentAgent.brief.duration === '30 secondes') ? 'selected' : ''}>30 s</option>
              <option value="45 secondes" ${currentAgent.brief.duration === '45 secondes' ? 'selected' : ''}>45 s</option>
              <option value="60 secondes" ${currentAgent.brief.duration === '60 secondes' ? 'selected' : ''}>60 s</option>
            </select>
          </div>

          <div id="format-slides-group" class="form-group" style="${/carrousel/i.test(currentAgent.brief.format) ? '' : 'display:none;'}">
            <label for="brief-slides">Nombre de slides</label>
            <select id="brief-slides" class="form-control">
              <option value="4 slides" ${currentAgent.brief.slideCount === '4 slides' ? 'selected' : ''}>4 slides</option>
              <option value="5 slides" ${(!currentAgent.brief.slideCount || currentAgent.brief.slideCount === '5 slides') ? 'selected' : ''}>5 slides</option>
              <option value="6 slides" ${currentAgent.brief.slideCount === '6 slides' ? 'selected' : ''}>6 slides</option>
              <option value="8 slides" ${currentAgent.brief.slideCount === '8 slides' ? 'selected' : ''}>8 slides</option>
            </select>
          </div>
          <div id="format-tip-box" hidden></div>

          <details class="agent-advanced">
            <summary>Options avancées <span>facultatif</span></summary>
            <div class="agent-advanced__body">
              <div class="form-row">
                <div class="form-group"><label for="brief-audience">Public cible</label><input type="text" id="brief-audience" class="form-control" value="${escapeHtml(currentAgent.brief.audience)}" placeholder="Parents, élèves, enfants…"></div>
                <div class="form-group"><label for="brief-target-date">Date souhaitée</label><input type="date" id="brief-target-date" class="form-control" value="${escapeHtml(currentAgent.brief.targetDate)}"></div>
              </div>
              <div class="form-group"><label for="brief-objective">Objectif</label><input type="text" id="brief-objective" class="form-control" value="${escapeHtml(currentAgent.brief.objective)}" placeholder="Informer, engager, convertir…"></div>
              <div class="form-group"><label for="brief-cta">CTA</label><input type="text" id="brief-cta" class="form-control" value="${escapeHtml(currentAgent.brief.cta)}" placeholder="Contactez-nous, inscrivez-vous…"></div>
              <div class="form-group"><label for="brief-required-info">Informations obligatoires</label><textarea id="brief-required-info" class="form-control" rows="2" placeholder="Horaires, lieu, détails à respecter…">${escapeHtml(currentAgent.brief.requiredInfo)}</textarea></div>
              <div class="form-row">
                <div class="form-group"><label for="brief-assets">Ressources</label><input type="text" id="brief-assets" class="form-control" value="${escapeHtml(currentAgent.brief.assets)}" placeholder="Logo, photo, mascotte…"></div>
                <div class="form-group"><label for="brief-language">Langue</label><select id="brief-language" class="form-control">
                  <option value="Français" ${currentAgent.brief.language === 'Français' ? 'selected' : ''}>Français</option>
                  <option value="Bilingue FR/AR" ${currentAgent.brief.language === 'Bilingue FR/AR' ? 'selected' : ''}>Bilingue FR/AR</option>
                  <option value="Arabe" ${currentAgent.brief.language === 'Arabe' ? 'selected' : ''}>Arabe</option>
                </select></div>
              </div>
              <div class="check-grid">
                <label class="check-item"><input type="checkbox" id="brief-include-nounou" ${currentAgent.brief.includeNounou ? 'checked' : ''}><span>Inclure Nounou</span></label>
                <label class="check-item"><input type="checkbox" id="brief-include-storyboard" ${currentAgent.brief.includeStoryboard ? 'checked' : ''}><span>Créer un storyboard</span></label>
              </div>
            </div>
          </details>

          <button class="btn btn--primary btn--block agent-generate-btn" type="submit" ${online ? '' : 'disabled'}>
            ${online ? '✨ Générer le contenu' : 'Connecter le serveur pour générer'}
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
            <button class="agent-tab-btn ${currentAgent.activeTab === 'output' ? 'active' : ''}" data-tab="output">📱 Post & Prompt Image</button>
            ${gen?.structuredData?.strategyPlan || gen?.dataAudit ? `<button class="agent-tab-btn ${currentAgent.activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">📊 Analyse & Plan</button>` : ''}
            <button class="agent-tab-btn ${currentAgent.activeTab === 'image' ? 'active' : ''}" data-tab="image">🎨 Prompt Image IA</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'metadata' ? 'active' : ''}" data-tab="metadata">📋 Fiche planning</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'storyboard' ? 'active' : ''}" data-tab="storyboard">
              🎬 Storyboard ${gen?.storyboard ? `(${gen.storyboard.length})` : ''}
            </button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'quality' ? 'active' : ''}" data-tab="quality">🛡️ Contrôle qualité</button>
            <button class="agent-tab-btn ${currentAgent.activeTab === 'raw' ? 'active' : ''}" data-tab="raw">📄 Texte brut</button>
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
        <option value="post" ${selected === 'post' ? 'selected' : ''}>Post réseaux sociaux (Accroche + Corps aéré + Prompt Image IA + 5 hashtags)</option>
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
      <option value="post_institutionnel" ${selected === 'post_institutionnel' ? 'selected' : ''}>Publication institutionnelle officielle (Post + Prompt Image IA + 5 hashtags)</option>
      <option value="reel_pedagogique" ${selected === 'reel_pedagogique' ? 'selected' : ''}>Vidéo institutionnelle / Reel (Script minuté)</option>
      <option value="carrousel_methode" ${selected === 'carrousel_methode' ? 'selected' : ''}>Carrousel méthodes pédagogiques (Slide par slide)</option>
      <option value="calendrier_mois" ${selected === 'calendrier_mois' ? 'selected' : ''}>Calendrier mensuel (Posts complets & prompts images par semaine)</option>
      <option value="planning_semaine" ${selected === 'planning_semaine' ? 'selected' : ''}>Planning hebdomadaire (7 jours détaillés)</option>
      <option value="infographie_conseils" ${selected === 'infographie_conseils' ? 'selected' : ''}>Infographie conseils aux familles</option>
      <option value="annonce_officielle" ${selected === 'annonce_officielle' ? 'selected' : ''}>Annonce administrative validée</option>
    `;
  }

  function _extractPostAndPrompt(gen, agentKey) {
    if (!gen) return { postText: '', imagePrompt: '', tags: [] };
    const data = gen.structuredData || {};
    let postText = data.postComplet || data.message || '';
    let imagePrompt = data.imagePrompt || data.promptImage || '';
    let tags = Array.isArray(data.tags) ? data.tags : [];

    const raw = gen.output || '';
    const clean = raw
      .replace(/^[\t >*#-]*\*\*([^*:\n]+?)\s*:?\*\*\s*:?[ \t]*/gm, '$1 : ')
      .replace(/^[\t >*#-]+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ0-9 ’'\-_/]+?)\s*:[ \t]*/gm, '$1 : ');

    const STOP = 'Concept créatif|Titre|Prompt image|Idée visuelle|Accroche|Post prêt à publier|Texte principal|Message principal|Information pratique|Appel à l’action|Appel à l\'action|Type|Canal|Plateforme|Statut|Date|Auteur|Tags|Hashtags|STORYBOARD|SCRIPT MINUTÉ|FORMATS VISUELS|CONTRÔLE QUALITÉ';

    // Extraction propre du post
    if (!postText || /CONTRÔLE QUALITÉ|Statut\s*:|Type de contenu\s*:/i.test(postText)) {
      const mPost = clean.match(new RegExp(`(?:^|\\n)Post prêt à publier\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${STOP})\\s*:|\\n===|$)`, 'i'));
      if (mPost && mPost[1].trim()) {
        postText = mPost[1].trim();
      } else {
        const mTexte = clean.match(new RegExp(`(?:^|\\n)(?:Texte principal|Légende sociale d'accompagnement|Légende sociale|Résumé)\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${STOP})\\s*:|\\n===|$)`, 'i'));
        if (mTexte && mTexte[1].trim()) {
          postText = mTexte[1].trim();
        }
      }
    }

    // Extraction propre du prompt image
    if (!imagePrompt || /CONTRÔLE QUALITÉ|Statut\s*:/i.test(imagePrompt)) {
      const mImg = clean.match(new RegExp(`(?:^|\\n)(?:Prompt image IA|Prompt image|Prompt Midjourney|Image prompt)\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${STOP})\\s*:|\\n===|$)`, 'i'));
      if (mImg && mImg[1].trim()) {
        imagePrompt = mImg[1].trim();
      } else {
        const mVis = clean.match(new RegExp(`(?:^|\\n)Idée visuelle\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${STOP})\\s*:|\\n===|$)`, 'i'));
        if (mVis && mVis[1].trim()) {
          imagePrompt = mVis[1].trim();
        }
      }
    }

    const title = data.titre || gen.brief?.topic || 'Groupe Scolaire Nidal';
    if (!imagePrompt) {
      imagePrompt = agentKey === 'studio-junior'
        ? `A modern cheerful Moroccan kindergarten classroom corner, Nounou the friendly 5-year-old boy mascot illustrating "${title}", warm golden sunlight, royal blue #1746d1, magenta #d91b5c and bright yellow #ffc928, clean 3D Disney/Pixar editorial illustration, high quality, 8k resolution --ar 4:5`
        : `A prestigious modern private school in Morocco, students collaborating with an inspiring teacher, "${title}", bright state-of-the-art classroom, Canon EOS R5 50mm f/1.8 editorial photography, warm sunlight, royal blue #1746d1 and gold accents, 8k resolution --ar 4:5`;
    }

    if (!postText) {
      postText = raw.split(/CONTRÔLE QUALITÉ|FORMATS VISUELS/i)[0].trim();
    }

    if (!tags.length) {
      const mTags = clean.match(/(?:^|\n)(?:Tags|Hashtags)\s*:\s*(.+)/i);
      if (mTags) {
        tags = mTags[1].split(/[,#\s]+/).filter(t => t.length > 1).map(t => t.startsWith('#') ? t : `#${t}`).slice(0, 5);
      }
      if (!tags.length) {
        tags = agentKey === 'studio-junior'
          ? ['#GSNidal', '#NidalJunior', '#MaternelleMaroc', '#PlaisirDeLire', '#GrandirEnsemble']
          : ['#GSNidal', '#GroupeScolaireNidal', '#ExcellenceEducative', '#ReussiteScolaire', '#AvenirDesEleves'];
      }
    }

    return { postText, imagePrompt, tags };
  }

  function _extractCalendarItems(rawText, agentKey) {
    if (!rawText) return [];
    const items = [];

    // Pattern 1: Entries with 📌 POST ...
    if (/📌\s*POST/i.test(rawText)) {
      const parts = rawText.split(/📌\s*POST/i).slice(1);
      for (const p of parts) {
        const titleMatch = p.match(/^([^\n]+)/);
        const title = titleMatch ? titleMatch[1].replace(/^[—\-:\s]+/, '').trim() : 'Publication';
        const postMatch = p.match(/📱\s*Post prêt à publier\s*:\s*([\s\S]*?)(?=🎨\s*Prompt image IA|📌|$)/i);
        const imgMatch = p.match(/🎨\s*Prompt image IA\s*:\s*([\s\S]*?)(?=📌|CONTRÔLE QUALITÉ|$)/i);
        items.push({
          title,
          post: postMatch ? postMatch[1].trim() : '',
          imagePrompt: imgMatch ? imgMatch[1].trim() : ''
        });
      }
      return items;
    }

    // Pattern 2: Entries with Date : ... Titre : ...
    const entryRegex = /(?:^|\n)(?:(?:\*\*\d+\.\s*)?Date\s*:\s*([^\n]+))([\s\S]*?)(?=(?:\n(?:\*\*\d+\.\s*)?Date\s*:)|CONTRÔLE QUALITÉ|$)/gi;
    let m;
    while ((m = entryRegex.exec(rawText)) !== null) {
      const dateVal = m[1].replace(/\*\*/g, '').trim();
      const body = m[2];
      const titleM = body.match(/(?:Titre|Concept créatif)\s*:\s*([^\n]+)/i);
      const resumeM = body.match(/(?:Post prêt à publier|Résumé|Message principal|Texte principal)\s*:\s*([^\n]+(?:\n(?![A-ZÀ-Ÿ\*\-][a-zA-ZÀ-ÿ0-9 ’'\-_/]+:)[^\n]+)*)/i);
      const ctaM = body.match(/Appel à l[’']action\s*:\s*([^\n]+)/i);
      const tagsM = body.match(/(?:Tags|Hashtags)\s*:\s*([^\n]+)/i);
      const imgM = body.match(/(?:Prompt image IA|Prompt image)\s*:\s*([^\n]+(?:\n(?![A-ZÀ-Ÿ\*\-][a-zA-ZÀ-ÿ0-9 ’'\-_/]+:)[^\n]+)*)/i);

      const title = titleM ? titleM[1].replace(/["«»\*]/g, '').trim() : `Publication du ${dateVal}`;
      const resume = resumeM ? resumeM[1].trim() : '';
      const cta = ctaM ? ctaM[1].trim() : 'Découvrez notre projet sur gsnidal.ma';
      const tags = tagsM ? tagsM[1].trim() : '#GSNidal #GroupeScolaireNidal #ExcellenceEducative #AvenirDesEleves #ReussiteScolaire';

      const post = `${title} 🏛️✨\n\n${resume}\n\n👉 ${cta}\n\n${tags}`;
      const img = imgM ? imgM[1].trim() : `A modern prestigious private school in Morocco, students engaged in "${title}", bright classroom, Canon EOS R5 editorial photography, warm sunlight, royal blue and gold accents, 8k --ar 4:5`;

      items.push({
        title: `${title} (${dateVal})`,
        post,
        imagePrompt: img
      });
    }

    return items;
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
    const { postText, imagePrompt, tags } = _extractPostAndPrompt(gen, _activeAgentKey);
    const isJunior = _activeAgentKey === 'studio-junior';

    if (agent.activeTab === 'analysis') {
      const audit = gen.dataAudit || data.dataAudit || {};
      const inv = audit.contentInventory || {};
      const formats = inv.formats || {};
      const ig = audit.social?.instagram || null;
      const fb = audit.social?.facebook || null;
      const paid = audit.paidMedia?.totals || {};
      const planItems = Array.isArray(data.planItems) ? data.planItems : [];
      const humanAnalysis = String(gen.output || '').split('===PLAN_JSON===')[0].trim();

      return `
        <div class="strategy-analysis-view">
          <div class="strategy-analysis-hero">
            <span class="section-kicker">Diagnostic NJKPI + Meta Ads</span>
            <h3>Analyse profonde & plan de travail prêt à exécuter</h3>
            <p>L'agent croise contenus organiques, KPI, audience, conversions et campagnes Meta disponibles. Vous validez ensuite chaque contenu pour l'ajouter au planning.</p>
          </div>

          <div class="strategy-audit-grid">
            <div class="strategy-audit-card"><small>Contenus</small><strong>${formatNumber(inv.total || 0)}</strong><span>${formatNumber(inv.published || 0)} publiés</span></div>
            <div class="strategy-audit-card"><small>Posts</small><strong>${formatNumber(formats.post || 0)}</strong><span>inventaire</span></div>
            <div class="strategy-audit-card"><small>Reels</small><strong>${formatNumber(formats.reel || 0)}</strong><span>inventaire</span></div>
            <div class="strategy-audit-card"><small>Stories</small><strong>${formatNumber(formats.story || 0)}</strong><span>inventaire</span></div>
            <div class="strategy-audit-card"><small>Vidéos</small><strong>${formatNumber(formats.video || 0)}</strong><span>inventaire</span></div>
            <div class="strategy-audit-card"><small>Carrousels</small><strong>${formatNumber(formats.carrousel || 0)}</strong><span>inventaire</span></div>
          </div>

          <div class="strategy-social-grid">
            <div class="strategy-social-card">
              <strong>Instagram</strong>
              <div>Followers : <b>${ig?.followers ?? '—'}</b></div>
              <div>Reach : <b>${ig?.reach ?? '—'}</b></div>
              <div>Comptes engagés : <b>${ig?.accountsEngaged ?? '—'}</b></div>
            </div>
            <div class="strategy-social-card">
              <strong>Facebook</strong>
              <div>Followers : <b>${fb?.followers ?? '—'}</b></div>
              <div>Reach : <b>${fb?.reach ?? '—'}</b></div>
              <div>Interactions : <b>${fb?.interactions ?? '—'}</b></div>
            </div>
            <div class="strategy-social-card strategy-social-card--ads">
              <strong>Meta Ads</strong>
              <div>Dépense : <b>${paid.spend != null ? formatNumber(paid.spend) : '—'}</b></div>
              <div>Reach : <b>${paid.reach != null ? formatNumber(paid.reach) : '—'}</b></div>
              <div>Impressions : <b>${paid.impressions != null ? formatNumber(paid.impressions) : '—'}</b></div>
              <div>Clics : <b>${paid.clicks != null ? formatNumber(paid.clicks) : '—'}</b></div>
              <div>CTR : <b>${paid.ctr != null ? paid.ctr + '%' : '—'}</b></div>
              <div>CPC : <b>${paid.cpc != null ? paid.cpc : '—'}</b></div>
            </div>
          </div>

          <div class="strategy-plan-output">
            <div class="strategy-plan-output__head">
              <div><span class="section-kicker">Diagnostic & solutions</span><h3>Ce qui manque, pourquoi et quoi faire</h3></div>
              <button class="btn btn--secondary btn--sm" id="btn-copy-all" type="button">📋 Copier l'analyse</button>
            </div>
            <pre>${escapeHtml(humanAnalysis || 'Analyse non disponible.')}</pre>
          </div>

          <div class="strategy-calendar-head">
            <div>
              <span class="section-kicker">Calendrier exécutable</span>
              <h3>${planItems.length ? `${planItems.length} jours de contenu prêt à valider` : 'Plan détaillé'}</h3>
              <p>Titre, caption, photo ou script vidéo, storyboard, CTA, hashtags et KPI pour chaque jour.</p>
            </div>
            <div class="strategy-calendar-actions">
              ${planItems.length ? '<button class="btn btn--primary" id="btn-validate-all-plan">✓ Valider tout & ajouter au planning</button>' : ''}
              <button class="btn btn--secondary" id="btn-open-planning">📅 Ouvrir le planning</button>
              <button class="btn btn--secondary" id="btn-open-publisher">🚀 Programmer / publier</button>
            </div>
          </div>

          ${planItems.length ? `<div class="strategy-day-list">
            ${planItems.map((item, idx) => {
              const video = /reel|video|vidéo/i.test(item.format || '');
              const story = /story/i.test(item.format || '');
              const carousel = /carrousel|carousel/i.test(item.format || '');
              const storyboard = Array.isArray(item.storyboard) ? item.storyboard : [];
              const companion = item.companionStory || null;
              return `
                <article class="strategy-day-card" data-plan-index="${idx}">
                  <div class="strategy-day-card__head">
                    <div>
                      <span class="strategy-day-number">Jour ${escapeHtml(String(item.dayNumber || idx + 1))}</span>
                      <h3 contenteditable="true" data-plan-edit="title" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.title || item.topic || 'Contenu')}</h3>
                      <div class="strategy-day-meta">
                        <span>${escapeHtml(item.date || 'Date à confirmer')}</span>
                        <span>${escapeHtml(item.publishTime || '18:30')}</span>
                        <span>${escapeHtml(item.format || 'post')}</span>
                        <span>${escapeHtml(item.platform || 'Instagram + Facebook')}</span>
                      </div>
                    </div>
                    <button class="btn btn--primary btn--sm btn-validate-plan-item" data-plan-index="${idx}" type="button">✓ Valider & ajouter</button>
                  </div>

                  <div class="strategy-day-grid">
                    <div><small>Objectif</small><p>${escapeHtml(item.objective || '—')}</p></div>
                    <div><small>Tunnel</small><p>${escapeHtml(item.funnelStage || '—')}</p></div>
                    <div><small>KPI principal</small><p>${escapeHtml(item.primaryKpi || '—')}</p></div>
                    <div><small>Pourquoi ce contenu ?</small><p>${escapeHtml(item.rationale || '—')}</p></div>
                  </div>

                  <div class="strategy-content-block"><small>Hook</small><strong contenteditable="true" data-plan-edit="hook" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.hook || '—')}</strong></div>
                  <div class="strategy-content-block"><small>Caption prête à publier</small><div class="strategy-caption" contenteditable="true" data-plan-edit="caption" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.caption || '—')}</div></div>

                  ${video ? `<div class="strategy-content-block strategy-content-block--video">
                    <small>🎬 Script vidéo complet</small>
                    <div class="strategy-caption" contenteditable="true" data-plan-edit="videoScript" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.videoScript || 'Script à compléter')}</div>
                    ${storyboard.length ? `<div class="strategy-storyboard-mini">${storyboard.map(scene => `
                      <div><b>${escapeHtml(scene.time || '')}</b> · ${escapeHtml(scene.visual || '')}<br><span>${escapeHtml(scene.voiceOrText || scene.action || '')}</span></div>
                    `).join('')}</div>` : ''}
                  </div>` : ''}

                  ${!video ? `<div class="strategy-content-block">
                    <small>${carousel ? '🖼️ Concept carrousel / Prompt visuel' : '📷 Prompt photo / visuel'}</small>
                    <div class="strategy-prompt" contenteditable="true" data-plan-edit="imagePrompt" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.imagePrompt || 'Prompt visuel à compléter')}</div>
                  </div>` : ''}

                  ${story && item.companionStory ? `<div class="strategy-content-block"><small>📲 Story</small><div class="strategy-caption">${escapeHtml(JSON.stringify(item.companionStory, null, 2))}</div></div>` : ''}
                  ${!story && companion ? `<div class="strategy-content-block"><small>📲 Story d'accompagnement</small><div class="strategy-caption">${escapeHtml((companion.frames || []).join(' → '))}<br>${escapeHtml(companion.interaction || '')}</div></div>` : ''}

                  <div class="strategy-day-footer">
                    <span>${(item.hashtags || []).map(tag => escapeHtml(tag)).join(' ')}</span>
                    <span>CTA : <b contenteditable="true" data-plan-edit="cta" data-plan-index="${idx}" spellcheck="true">${escapeHtml(item.cta || '—')}</b></span>
                  </div>
                </article>`;
            }).join('')}
          </div>` : `<div class="empty-state"><div><strong>Le modèle n'a pas renvoyé le planning structuré.</strong><p>L'analyse humaine reste disponible ci-dessus. Relancez le plan avec un modèle récent.</p></div></div>`}
        </div>`;
    }

    // 1. ONGLET PRINCIPAL : POST PRÊT À PUBLIER & PROMPT IMAGE IA
    if (agent.activeTab === 'output') {
      const fullCopyPayload = `${postText}\n\n${tags.join(' ')}`;
      const calendarItems = _extractCalendarItems(gen.output, _activeAgentKey);

      return `
        <div class="post-preview-container">
          <!-- Carte 1 : Post prêt à publier -->
          <div class="post-preview-card">
            <div class="post-preview-card__head">
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="post-preview-icon">📱</span>
                <div>
                  <h3 class="post-preview-title">Post prêt à publier</h3>
                  <p class="post-preview-subtitle">Texte rédigé prêt à copier-coller sur Instagram, Facebook et LinkedIn</p>
                </div>
              </div>
              <button class="btn btn--primary btn--sm" id="btn-copy-post" type="button" title="Copier le post et ses 5 hashtags">
                📋 Copier le post
              </button>
            </div>

            <div class="generated-edit-head">
              <span>✏️ Texte modifiable — vos changements seront utilisés pour l’enregistrement et la publication.</span>
              <span class="generated-edit-status" id="generated-edit-status">Modifications locales</span>
            </div>
            <div class="form-group generated-title-field">
              <label for="generated-title-edit">Titre interne</label>
              <input id="generated-title-edit" class="form-control" value="${escapeHtml(data.titre || gen.brief?.topic || '')}" placeholder="Titre du contenu">
            </div>
            <textarea class="post-caption-box post-caption-box--editable form-control" id="post-caption-content" rows="12">${escapeHtml(postText)}</textarea>

            <div class="post-preview-card__tags">
              <span class="post-tags-label">5 Hashtags officiels :</span>
              <input id="generated-tags-edit" class="form-control generated-tags-edit"
                value="${escapeHtml(tags.join(' '))}"
                placeholder="#GSNidal #Education #Marrakech #Ecole #Parents">
            </div>
          </div>

          <!-- Carte 2 : Prompt Image IA -->
          <div class="image-prompt-card">
            <div class="image-prompt-card__head">
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="image-prompt-icon">🎨</span>
                <div>
                  <h3 class="image-prompt-title">Prompt Image IA (Midjourney / DALL-E / Canva)</h3>
                  <p class="image-prompt-subtitle">Copiez ce prompt pour générer le visuel officiel dans votre générateur d'image</p>
                </div>
              </div>
              <button class="btn btn--secondary btn--sm" id="btn-copy-image-prompt" type="button" title="Copier le prompt pour Midjourney / DALL-E 3">
                📋 Copier le prompt image
              </button>
            </div>

            <textarea class="image-prompt-box image-prompt-box--editable form-control" id="image-prompt-content" rows="8">${escapeHtml(imagePrompt)}</textarea>

            <div class="image-prompt-footer">
              <div class="image-prompt-tips">
                💡 <b>Conseil rendu :</b> ${isJunior ? 'Style 3D Pixar mignon ou photo d’éveil chaleureuse avec Nounou' : 'Photo éditoriale haut de gamme Canon EOS R5 50mm, lumière naturelle dorée'} · Ratio : <b>--ar 4:5</b> (feed) ou <b>--ar 9:16</b> (Reel/Story)
              </div>
            </div>
          </div>

          <!-- Si plusieurs publications ont été générées (Calendrier) -->
          ${calendarItems.length > 1 ? `
            <div class="calendar-posts-section">
              <div class="calendar-posts-header">
                <span class="section-kicker">Publications du planning</span>
                <h3>📅 Toutes les publications générées (${calendarItems.length} posts complets)</h3>
              </div>
              <div class="calendar-posts-grid">
                ${calendarItems.map((item, idx) => `
                  <div class="calendar-post-item">
                    <div class="calendar-post-item__head">
                      <strong>${idx + 1}. ${escapeHtml(item.title)}</strong>
                      <button class="btn btn--secondary btn--sm btn-copy-inline" data-copy-text="${escapeHtml(item.post)}" type="button">
                        📋 Copier ce post
                      </button>
                    </div>
                    <div class="calendar-post-item__body">${escapeHtml(item.post)}</div>
                    ${item.imagePrompt ? `
                      <div class="calendar-post-item__prompt">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                          <strong style="color:var(--magenta);font-size:11px;">🎨 Prompt Image IA :</strong>
                          <button class="btn btn--outline btn--sm btn-copy-inline" data-copy-text="${escapeHtml(item.imagePrompt)}" type="button" style="padding:2px 6px;font-size:10px;">
                            Copier prompt
                          </button>
                        </div>
                        <code>${escapeHtml(item.imagePrompt)}</code>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>`;
    }

    // 2. ONGLET PROMPT IMAGE IA DÉDIÉ
    if (agent.activeTab === 'image') {
      return `
        <div class="image-prompt-studio">
          <div class="image-prompt-card" style="margin-top:0;">
            <div class="image-prompt-card__head">
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="image-prompt-icon">🎨</span>
                <div>
                  <h3 class="image-prompt-title">Générateur de visuels IA</h3>
                  <p class="image-prompt-subtitle">Prompt optimisé pour Midjourney v6, DALL-E 3, Flux 1.1 Pro et Canva Magic Media</p>
                </div>
              </div>
              <button class="btn btn--primary btn--sm" id="btn-copy-image-prompt" type="button">
                📋 Copier le prompt image
              </button>
            </div>

            <div class="image-prompt-box" style="font-size:13px;line-height:1.7;">${escapeHtml(imagePrompt)}</div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;font-size:11.5px;">
              <div style="background:#fff;padding:12px;border:1px solid var(--line);border-radius:6px;">
                <strong style="color:var(--blue);display:block;margin-bottom:6px;">📐 Paramètres recommandés</strong>
                <div>• Format Feed : <code>--ar 4:5</code> (1080 × 1350 px)</div>
                <div>• Format Story / Reel : <code>--ar 9:16</code> (1080 × 1920 px)</div>
                <div>• Format Carré : <code>--ar 1:1</code> (1080 × 1080 px)</div>
              </div>
              <div style="background:#fff;padding:12px;border:1px solid var(--line);border-radius:6px;">
                <strong style="color:var(--magenta);display:block;margin-bottom:6px;">🎨 Palette & Identité GS Nidal</strong>
                <div>• Bleu Roi officiel : <code>#1746d1</code></div>
                <div>• Magenta vif : <code>#d91b5c</code></div>
                <div>• Jaune soleil : <code>#ffc928</code></div>
              </div>
            </div>
          </div>
        </div>`;
    }

    // 3. ONGLET FICHE PLANNING (METADATA)
    if (agent.activeTab === 'metadata') {
      return `
        <div style="background:var(--surface);padding:18px;border-radius:6px;font-size:12px;line-height:1.7;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><strong style="color:var(--muted);">TITRE :</strong><br><b style="font-size:14px;color:var(--ink);">${escapeHtml(data.titre || 'Sans titre')}</b></div>
            <div><strong style="color:var(--muted);">TYPE & STATUT :</strong><br><span class="badge badge--blue">${escapeHtml(data.format || 'post')}</span> <span class="badge badge--yellow">${escapeHtml(gen.status || 'brouillon')}</span></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><strong style="color:var(--muted);">DATE PROPOSÉE :</strong><br>${escapeHtml(data.datePublication || 'Date à confirmer')}</div>
            <div><strong style="color:var(--muted);">CANAL :</strong><br>${escapeHtml(data.canal || data.plateforme || 'Instagram + Facebook')}</div>
          </div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">PUBLIC CIBLE :</strong><br>${escapeHtml(data.publicCible || 'Enfants et familles')}</div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">OBJECTIF :</strong><br>${escapeHtml(data.objectif || 'Pédagogique et bienveillant')}</div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">ACCROCHE :</strong><br><em>« ${escapeHtml(data.accroche || data.titre)} »</em></div>
          <div style="margin-bottom:12px;"><strong style="color:var(--muted);">APPEL À L'ACTION :</strong><br>${escapeHtml(data.cta || 'Partagez vos impressions')}</div>
          <div><strong style="color:var(--muted);">TAGS (5) :</strong><br>${tags.map(t => `<span class="badge" style="margin-right:4px;">${escapeHtml(t)}</span>`).join('')}</div>
        </div>`;
    }

    // 4. ONGLET STORYBOARD (POUR REELS / VIDÉOS)
    if (agent.activeTab === 'storyboard') {
      if (!gen.storyboard || !gen.storyboard.length) {
        return `<p style="padding:20px;text-align:center;color:var(--muted);">Aucun storyboard détaillé détecté pour ce format. Choisissez le format Reel/Vidéo pour générer un script minuté scène par scène.</p>`;
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

    // 5. ONGLET CONTRÔLE QUALITÉ
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

    // 6. ONGLET TEXTE BRUT
    return `<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.65;margin:0;background:var(--surface);padding:16px;border-radius:6px;border:1px solid var(--line);">${escapeHtml(gen.output)}</pre>`;
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
    if (btnJunior) btnJunior.onclick = () => _selectAgent('studio-junior');
    if (btnPlanning) btnPlanning.onclick = () => _selectAgent('planning-nidal');

    // Tabs
    document.querySelectorAll('.agent-tab-btn').forEach(btn => {
      btn.onclick = () => {
        _state[_activeAgentKey].activeTab = btn.dataset.tab;
        render();
      };
    });

    const btnProPlan = document.getElementById('btn-pro-plan');
    if (btnProPlan) {
      btnProPlan.onclick = _onGenerateProfessionalPlan;
    }

    // Form submit
    const form = document.getElementById('editorial-form');
    if (form) {
      form.onsubmit = _onGenerate;
      const persistBrief = () => {
        try {
          _state[_activeAgentKey].brief = {
            ..._state[_activeAgentKey].brief,
            ..._readFormInputs()
          };
        } catch {}
      };
      form.addEventListener('input', persistBrief);
      form.addEventListener('change', persistBrief);
    }

    // Actions
    const currentAgent = _state[_activeAgentKey];
    const gen = currentAgent.currentGeneration;

    const titleEdit = document.getElementById('generated-title-edit');
    const captionEdit = document.getElementById('post-caption-content');
    const tagsEdit = document.getElementById('generated-tags-edit');
    const imagePromptEdit = document.getElementById('image-prompt-content');
    const editStatus = document.getElementById('generated-edit-status');

    const persistGeneratedEdits = () => {
      if (!gen) return;
      if (!gen.structuredData) gen.structuredData = {};
      if (titleEdit) gen.structuredData.titre = titleEdit.value.trim();
      if (captionEdit) {
        gen.structuredData.message = captionEdit.value;
        gen.structuredData.postComplet = captionEdit.value;
      }
      if (imagePromptEdit) {
        gen.structuredData.imagePrompt = imagePromptEdit.value;
        gen.structuredData.promptImage = imagePromptEdit.value;
      }
      if (tagsEdit) {
        gen.structuredData.tags = tagsEdit.value
          .split(/[\s,]+/)
          .map(tag => tag.trim())
          .filter(Boolean)
          .map(tag => tag.startsWith('#') ? tag : '#' + tag)
          .slice(0, 5);
      }
      if (editStatus) editStatus.textContent = '✓ Modifié';
    };

    [titleEdit, captionEdit, tagsEdit, imagePromptEdit].forEach(el => {
      el?.addEventListener('input', persistGeneratedEdits);
      el?.addEventListener('change', persistGeneratedEdits);
    });
    const btnCopyAll = document.getElementById('btn-copy-all');
    if (btnCopyAll && gen) {
      btnCopyAll.onclick = () => navigator.clipboard.writeText(gen.output).then(() => showToast('Contenu complet copié dans le presse-papiers', 'success'));
    }

    const btnCopyPost = document.getElementById('btn-copy-post');
    if (btnCopyPost && gen) {
      btnCopyPost.onclick = () => {
        persistGeneratedEdits();
        const { postText, tags } = _extractPostAndPrompt(gen, _activeAgentKey);
        const fullPost = `${postText}\n\n${tags.join(' ')}`.trim();
        navigator.clipboard.writeText(fullPost).then(() => showToast('Post et hashtags copiés dans le presse-papiers !', 'success'));
      };
    }

    const btnCopyImgPrompt = document.getElementById('btn-copy-image-prompt');
    if (btnCopyImgPrompt && gen) {
      btnCopyImgPrompt.onclick = () => {
        persistGeneratedEdits();
        const { imagePrompt } = _extractPostAndPrompt(gen, _activeAgentKey);
        navigator.clipboard.writeText(imagePrompt).then(() => showToast('Prompt Image IA copié ! Collez-le dans Midjourney / DALL-E / Canva.', 'success'));
      };
    }

    document.querySelectorAll('.btn-copy-inline').forEach(btn => {
      btn.onclick = () => {
        const txt = btn.dataset.copyText || '';
        if (txt) {
          navigator.clipboard.writeText(txt).then(() => showToast('Copié dans le presse-papiers !', 'success'));
        }
      };
    });

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
    const get = id => document.getElementById(id);
    const format = get('brief-format')?.value || 'post';
    const topic = get('brief-topic')?.value.trim() || '';
    const topicMode = get('brief-topic-mode')?.value || 'single';
    return {
      topic,
      topicMode,
      format,
      duration: get('brief-duration')?.value || undefined,
      slideCount: get('brief-slides')?.value || undefined,
      platform: get('brief-platform')?.value || 'Instagram + Facebook (IG + FB)',
      audience: get('brief-audience')?.value.trim() || '',
      targetDate: get('brief-target-date')?.value || '',
      objective: get('brief-objective')?.value.trim() || '',
      cta: get('brief-cta')?.value.trim() || '',
      requiredInfo: get('brief-required-info')?.value.trim() || '',
      assets: get('brief-assets')?.value.trim() || '',
      language: get('brief-language')?.value || 'Français',
      includeNounou: Boolean(get('brief-include-nounou')?.checked),
      includeStoryboard: Boolean(get('brief-include-storyboard')?.checked)
    };
  }

  function _topicForRequest(inputs) {
    if (inputs.topicMode !== 'multiple') return inputs.topic;
    const subjects = inputs.topic.split(/\n+/).map(item => item.trim()).filter(Boolean);
    if (subjects.length <= 1) return inputs.topic;
    return [
      'Créer une publication DISTINCTE pour chacun des sujets suivants. Ne fusionne pas les sujets. Chaque publication doit avoir son propre texte, ses 5 hashtags et son prompt image IA unique.',
      '',
      ...subjects.map((subject, index) => `${index + 1}. ${subject}`)
    ].join('\n');
  }

  async function _onGenerateProfessionalPlan() {
    const button = document.getElementById('btn-pro-plan');
    if (!button) return;

    const days = Number(document.getElementById('pro-plan-days')?.value || 30);
    const objective = document.getElementById('pro-plan-objective')?.value || 'croissance, engagement et inscriptions';
    const brand = getActiveBrand();
    const aiConfig = getAiConfig();

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Analyse des données en cours…';

    try {
      const response = await NidalAPI.generateProfessionalPlan({
        brand,
        days,
        objective,
        aiConfig
      });

      const agentKey = brand === 'nidal' ? 'planning-nidal' : 'studio-junior';
      _activeAgentKey = agentKey;
      const loaded = _formatLoadedGen(response);
      loaded.output = response.output || '';
      loaded.structuredData = response.structuredData || response.structured_data || {};
      loaded.dataAudit = response.dataAudit || response.structuredData?.dataAudit || null;
      if (Array.isArray(response.planItems)) loaded.structuredData.planItems = response.planItems;

      _state[agentKey].currentGeneration = loaded;
      _state[agentKey].activeTab = 'analysis';
      _state[agentKey].history.unshift(response);

      render();
      showToast(`Plan professionnel de ${days} jours créé à partir des données NJKPI.`, 'success');
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      showToast('Création du plan impossible : ' + error.message, 'error');
    }
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
        ...inputs,
        topic: _topicForRequest(inputs)
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
        topic: _topicForRequest(inputs),
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
    let currentModel = aiConfig.model || 'gemini-3.8-flash';
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
          const selectedMod = document.getElementById('ai-select-model')?.value || 'gemini-3.8-flash';
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

  function _planItemToStructuredData(item = {}) {
    const hashtags = Array.isArray(item.hashtags) ? item.hashtags.slice(0, 5) : [];
    const storyboardText = Array.isArray(item.storyboard) && item.storyboard.length
      ? item.storyboard.map(s => `${s.time || ''} | ${s.visual || ''} | ${s.action || ''} | ${s.voiceOrText || ''} | ${s.transition || ''}`).join('\n')
      : '';
    const production = /reel|video|vidéo/i.test(item.format || '')
      ? [item.videoScript, storyboardText].filter(Boolean).join('\n\nSTORYBOARD\n')
      : item.imagePrompt || '';

    return {
      titre: item.title || item.topic || 'Contenu du planning IA',
      datePublication: item.date || '',
      heure: item.publishTime || '18:30',
      plateforme: item.platform || 'Instagram + Facebook',
      canal: item.platform || 'Instagram + Facebook',
      format: item.format || 'post',
      pilier: item.funnelStage || '',
      objectif: item.objective || '',
      message: item.caption || '',
      postComplet: item.caption || '',
      cta: item.cta || '',
      imagePrompt: item.imagePrompt || '',
      promptImage: item.imagePrompt || '',
      livrable: production,
      notes: [item.rationale, item.basedOnData?.length ? `Basé sur : ${item.basedOnData.join(' | ')}` : ''].filter(Boolean).join('\n'),
      tags: hashtags,
      kpiPrincipal: item.primaryKpi || '',
      storyboard: item.storyboard || [],
      companionStory: item.companionStory || null,
      sourceAgent: 'professional-plan'
    };
  }

  async function _savePlanItem(index, { silent = false } = {}) {
    const current = _state[_activeAgentKey].currentGeneration;
    const items = current?.structuredData?.planItems || [];
    const item = items[index];
    if (!item) throw new Error('Contenu du planning introuvable');
    if (item._savedContentId) return item._savedContentId;

    const brand = current.brand || (_activeAgentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior');
    const structured = _planItemToStructuredData(item);
    const result = await NidalAPI.saveToPlanning({
      structuredData: structured,
      brand,
      targetStatus: 'planifie',
      validated: true
    });

    const saved = result?.content?.data || result?.content || structured;
    if (result?.content) NidalStore.create(saved);
    item._savedContentId = result?.content?.id || saved.id || true;
    if (!silent) showToast(`« ${structured.titre} » ajouté au planning et validé.`, 'success');
    return item._savedContentId;
  }

  async function _saveAllPlanItems() {
    const current = _state[_activeAgentKey].currentGeneration;
    const items = current?.structuredData?.planItems || [];
    if (!items.length) return showToast('Aucun contenu structuré à ajouter.', 'error');
    const button = document.getElementById('btn-validate-all-plan');
    if (button) { button.disabled = true; button.textContent = 'Ajout au planning…'; }
    let saved = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i++) {
      try { await _savePlanItem(i, { silent: true }); saved++; }
      catch (error) { failed++; console.warn('Plan item non sauvegardé:', error.message); }
    }
    showToast(`${saved} contenu(s) ajoutés au planning${failed ? ` · ${failed} échec(s)` : ''}.`, failed ? 'info' : 'success');
    render();
  }
  async function _saveContent(status = 'brouillon') {
    document.getElementById('post-caption-content')?.dispatchEvent(new Event('change'));
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
    _selectAgent(toAgent, { renderNow: false });
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
