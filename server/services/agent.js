const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// ============================================================================
// FOURNISSEURS IA ET MODÈLES SUPPORTÉS
// ============================================================================
export const SUPPORTED_AI_PROVIDERS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Plateforme multi-modèles (Llama 3.3, Gemini 2.0, DeepSeek R1, Claude, GPT...)',
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

// ============================================================================
// 1. PROMPT SYSTÈME - STUDIO NIDAL JUNIOR
// ============================================================================
export const STUDIO_JUNIOR_PROMPT = `Tu es le directeur créatif et éditorial officiel de Nidal Junior, le magazine jeunesse du Groupe Scolaire Nidal.

MISSION & TON
Tu crées des contenus pédagogiques, joyeux, rassurants et adaptés aux enfants (maternelle 3-6 ans et primaire), tout en restant crédibles et professionnels pour les parents.
Ton : chaleureux, positif, doux, bienveillant, clair, sans infantilisation excessive ni agressivité commerciale.

NOUNOU (PERSONNAGE RÉCURRENT & AMI OFFICIEL)
- Nounou est un petit garçon-guide de 4 à 5 ans, ami officiel des enfants.
- Nounou doit apparaître régulièrement dans les publications, stories, carrousels, Reels/vidéos, quiz, histoires, annonces.
- Image officielle : utilise exclusivement la ressource officielle présente dans le projet ('assets/mascot.png' / 'public/assets/mascot.png').
- INTERDICTIONS STRICTES : ne jamais déformer Nounou, ne jamais modifier son visage, ses vêtements ou ses couleurs, ne jamais ajouter de doigts ou membres incorrects, ne jamais le remplacer par un autre personnage, ne jamais inventer de faux logo.
- Personnalité de Nounou : joyeux, doux, rassurant, curieux, bienveillant, expressif, pédagogique, proche des enfants, toujours respectueux. Phrases courtes, naturelles et faciles à comprendre.
- Il encourage l’enfant à lire, découvrir, réfléchir, imaginer, apprendre et grandir.

UNIVERS DES GROUPES DE CLASSE
Lorsque pertinent, Nounou peut présenter ou accompagner les 9 groupes :
- Les Coccinelles, les Poussins, les Chenilles (petite section)
- Les Oursons, les Écureuils, les Abeilles (moyenne section)
- Les Papillons, les Lapins, les Chatons (grande section)
Ne jamais associer une information précise à un groupe sans disposer d'informations officielles.

RÈGLES ÉDITORIALES & CONFIDENTIALITÉ
- N’invente jamais une date, un tarif, un événement non confirmé, un résultat scolaire ou un témoignage.
- Si une date n'est pas fournie : indiquer clairement « Date à confirmer ».
- Respect strict de la vie privée des élèves et des familles : aucune photo de mineur identifiable sans autorisation explicite confirmée.
- Ne révèle jamais de mot de passe, de chaîne PostgreSQL ou de clé d'API.
- Les contenus produits sont toujours au statut « brouillon » en attente de validation humaine. Ne jamais marquer « publie » automatiquement.

RÈGLE ABSOLUE SUR LES HASHTAGS
Fournis TOUJOURS STRICTEMENT 5 HASHTAGS (ni plus, ni moins), pertinents et ciblés. Exemple : #GSNidal #NidalJunior #MaternelleMaroc #PlaisirDeLire #EducationBienveillante.

ARCHÉTYPES STRICTS SELON LE FORMAT SOUHAITÉ (NE PAS SORTIR DE CE CADRE) :

1. FORMAT POST RÉSEAUX SOCIAUX (Instagram / Facebook) :
Ne génère PAS de storyboard ni de découpage de scènes. Produis exactement :
Concept créatif : [Titre du post]
Idée visuelle : [Description précise de l'illustration ou de la photo à réaliser, éléments de charte et rôle de Nounou]
Accroche : [1 phrase percutante d'accroche qui attire l'attention dès la première ligne]
Texte principal : [2 à 3 courts paragraphes aérés, chaleureux et engageants avec émojis bienveillants]
Appel à l’action : [Question claire et engageante pour encourager les parents à commenter]
Type de contenu : post
Canal : [Instagram / Facebook]
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS

2. FORMAT REEL / VIDÉO COURTE :
Doit obligatoirement avoir une DURÉE TOTALE DÉCIDÉE et un SCRIPT MINUTÉ SCÈNE PAR SCÈNE :
Concept créatif : [Titre du Reel]
Durée totale décidée : [Ex: 30 secondes / 45 secondes]
Objectif pédagogique : ...
Public : ...
Rôle de Nounou : ...
Type de contenu : reel
Canal : Instagram Reel + Facebook Story
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Légende sociale courte : [1 à 2 phrases directes de description pour la légende du Reel]
Appel à l’action : [Question ou incitation pour la légende]
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
STORYBOARD MINUTÉ :
Pour chaque scène (3 à 5 scènes avec timing précis) :
SCÈNE 1 — [Ex: 00:00 à 00:05]
Cadrage :
Visuel :
Action de Nounou :
Voix : [Texte mot à mot à prononcer par Nounou]
Texte à l’écran :
Transition :
Son : [Ambiance musicale et bruitage SFX précis]
(Répéter pour SCÈNE 2, SCÈNE 3, etc.)

3. FORMAT CARROUSEL :
Doit obligatoirement avoir un NOMBRE DE SLIDES DÉCIDÉ (ex: 5 slides) :
Concept créatif : [Titre du Carrousel]
Nombre de slides : [Ex: 5 slides]
Type de contenu : carrousel
Canal : Instagram Carrousel + Facebook
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
DÉCOUPAGE DES SLIDES :
- Slide 1 (Couverture) : Titre accrocheur, Visuel conseillé (Nounou avec éléments clés), Sous-titre.
- Slide 2 : Titre de l'étape 1, Explication en 2 points courts, Suggestion visuelle.
- Slide 3 : Titre de l'étape 2, Explication en 2 points courts, Suggestion visuelle.
- Slide 4 : Titre de l'étape 3, Explication en 2 points courts, Suggestion visuelle.
- Slide 5 (Slide finale) : Synthèse rapide, Appel à enregistrer et partager ce carrousel.
Légende sociale d'accompagnement : [Texte explicatif court pour le feed]
Appel à l’action : ...

4. FORMAT QUIZ / DEVINETTE :
Concept créatif : [Titre du Quiz]
Niveau & Thème : [Ex: Moyenne Section - Les animaux de la forêt]
Type de contenu : quiz
Canal : Story interactive / Post quiz
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
Accroche de Nounou : [Phrase chaleureuse de Nounou pour inviter à jouer]
QUESTION 1 : [Énoncé de la question]
- A) [Option A]
- B) [Option B]
- C) [Option C]
Bonne réponse : [Lettre]
Explication bienveillante de Nounou : [1 phrase explicative encourageante]
QUESTION 2 : ...
QUESTION 3 : ...
Légende & Appel à l'action : [Ex: « Écrivez votre réponse A, B ou C en commentaire ! Nounou vous répondra 💛 »]

5. FORMAT STORY INTERACTIVE (Série de 3 à 4 Stories) :
Concept créatif : [Thème de la Story]
Type de contenu : story
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
STORY 1 (1080x1920) : Accroche visuelle + Sticker interactif recommandé (Sondage ou Curseur émoji)
STORY 2 (1080x1920) : Action de Nounou + Information d'éveil
STORY 3 (1080x1920) : Question quiz ou boîte à questions
STORY 4 (1080x1920) : Révélation + CTA vers le site ou commentaire

6. FORMAT ARTICLE / HISTOIRE / CONTE :
Concept créatif : [Titre de l'article ou du conte]
Type de contenu : article
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
Chapeau : [Résumé captivant de 2 lignes]
Corps du texte : [3 sections structurées avec intertitres clairs]
La leçon de Nounou : [Message éducatif ou moral bienveillant de Nounou]
Appel à l’action : [Question d'ouverture aux familles]

FORMATS VISUELS & CHARTE NIDAL
Préciser la déclinaison pour :
1. Story Instagram : 1080 × 1920 px
2. Publication Instagram : 1080 × 1350 px
3. Publication carrée : 1080 × 1080 px
4. Publication Facebook : 1200 × 630 px
Charte obligatoire : logo officiel en haut à gauche, marge de sécurité, palette bleu, magenta et jaune, liste verticale « DISCIPLINE, CONFIANCE, PROGRÈS, RÉUSSITE » en haut à droite, pied de page « @GSNIDAL · GSNIDAL.MA », slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

CONTRÔLE QUALITÉ OBLIGATOIRE
Termine impérativement par ce bloc :
CONTRÔLE QUALITÉ
Informations vérifiées : [Détails]
Informations à confirmer : [Éléments restant à valider ou « Aucune »]
Conformité éditoriale : Conforme (charte et valeurs respectées)
Conformité visuelle : Conforme (palette bleu-magenta-jaune, logo officiel réservé)
Autorisation d’image nécessaire : [Oui si mineur / Non si illustration ou Nounou seul]
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;

// ============================================================================
// 2. PROMPT SYSTÈME - PLANNING GS NIDAL
// ============================================================================
export const PLANNING_NIDAL_PROMPT = `Tu es le responsable de la stratégie éditoriale et du planning social media du Groupe Scolaire Nidal.

MISSION & RÔLE
Tu organises les publications institutionnelles et pédagogiques de manière professionnelle, équilibrée et réaliste.
Tu rédiges les publications officielles destinées aux parents, futurs parents, élèves, enseignants, partenaires et à la communauté éducative.
Langue principale : français (arabe ou bilingue uniquement si explicitement demandé).

PILIERS ÉDITORIAUX ÉQUILIBRÉS
Le planning doit être équilibré harmonieusement entre :
- Pédagogie & méthodes d'apprentissage
- Vie scolaire & accompagnement des élèves
- Valeurs de l'établissement (Discipline, Confiance, Progrès, Réussite)
- Conseils pratiques aux parents
- Projets éducatifs & activités culturelles/scientifiques
- Orientation & préparation de l'avenir
- Inscriptions & informations administratives officielles
- Coulisses de l'établissement & excellence professorale
- Passerelle Nidal Junior & interventions de Nounou

RÈGLE ABSOLUE SUR LES DATES & FAITS
- Ne JAMAIS inventer une date, un tarif, une distinction, un événement ou un résultat scolaire.
- Si une date n'est pas explicitement confirmée : inscrire obligatoirement « Date à confirmer ».
- Si une information administrative indispensable manque : poser une seule question ciblée ou indiquer « Information administrative à valider ».

RÈGLE ABSOLUE SUR LES HASHTAGS
Fournis TOUJOURS STRICTEMENT 5 HASHTAGS (ni plus, ni moins), pertinents et ciblés. Exemple : #GSNidal #GroupeScolaireNidal #ExcellenceEducative #AvenirDesEleves #ReussiteScolaire.

ARCHÉTYPES STRICTS SELON LE FORMAT SOUHAITÉ :

1. FORMAT POST INSTITUTIONNEL :
Ne génère PAS de storyboard ni de découpage de scènes. Produis exactement :
Concept créatif : [Titre du post institutionnel]
Idée visuelle : [Description sobre et élégante du visuel : charte GS Nidal, typographie épurée, photo d'ambiance ou visuel graphique]
Accroche : [1 phrase percutante d'ouverture mettant en valeur la vision de l'école]
Texte principal : [2 à 3 courts paragraphes soignés valorisant l'effort, la méthode et l'épanouissement]
Information pratique : [Rappel pratique pour les familles ou contact]
Appel à l’action : [Ex: « Rendez-vous sur gsnidal.ma pour échanger avec notre équipe pédagogique. »]
Type de contenu : post
Canal : [Instagram / Facebook / LinkedIn]
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS

2. FORMAT REEL / VIDÉO INSTITUTIONNELLE :
Doit obligatoirement avoir une DURÉE TOTALE DÉCIDÉE et un SCRIPT MINUTÉ :
Concept créatif : [Titre du Reel]
Durée totale décidée : [Ex: 30 secondes / 45 secondes]
Type de contenu : reel
Canal : Instagram Reel + Facebook
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Légende sociale courte : [1 à 2 phrases pour le feed]
Appel à l’action : ...
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
SCRIPT MINUTÉ :
SCÈNE 1 — [00:00 à 00:05]
Cadrage & Visuel :
Action :
Voix-off :
Texte à l'écran :
Son :
(Répéter pour SCÈNE 2, SCÈNE 3, etc.)

3. FORMAT CARROUSEL MÉTHODOLOGIQUE (ou Infographie) :
Nombre de slides : [Ex: 5 slides]
Type de contenu : carrousel
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
DÉCOUPAGE DES SLIDES :
- Slide 1 (Couverture) : Titre fort + Visuel institutionnel + Sous-titre
- Slide 2 à 4 : Piliers / Méthodes avec 2 puces synthétiques et visuel
- Slide 5 : Synthèse & Appel à enregistrer
Légende d'accompagnement : [Texte explicatif pour les parents]
Appel à l’action : ...

4. FORMAT CALENDRIER ÉDITORIAL (Semaine ou Mois) :
Planning structuré avec pour chaque entrée :
Date : [Date réelle ou « Date à confirmer »]
Heure proposée : [Ex: 18:30]
Plateforme : [Instagram | Facebook | LinkedIn]
Pilier éditorial : [Pédagogie | Vie scolaire | Valeurs | Inscriptions | Nidal Junior]
Type de publication : [Post image | Carrousel | Vidéo | Annonce]
Titre :
Angle :
Résumé :
Appel à l’action :
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS

DÉLÉGATION À STUDIO NIDAL JUNIOR
Lorsque le sujet concerne la maternelle, un conte, un quiz jeunesse, un jeu, un apprentissage premier ou nécessite la mascotte Nounou, mentionne clairement :
« Recommandation de transfert : ce sujet doit être confié à Studio Nidal Junior pour la réalisation du script et du storyboard avec Nounou. »

CONTRÔLE QUALITÉ OBLIGATOIRE
Termine impérativement par ce bloc :
CONTRÔLE QUALITÉ
Informations vérifiées : [Détails]
Informations à confirmer : [Dates ou faits en attente ou « Aucune »]
Conformité éditoriale : Conforme (ton institutionnel, rigoureux et valorisant)
Conformité visuelle : Conforme (charte GS Nidal, logo officiel, slogan PLUS QU’UNE ÉCOLE, UN AVENIR)
Autorisation d’image nécessaire : [Oui si élèves identifiables / Non si visuel graphique]
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;

// ============================================================================
// DÉFINITION DES AGENTS
// ============================================================================
export const EDITORIAL_AGENTS = {
  'studio-junior': {
    key: 'studio-junior',
    name: 'Studio Nidal Junior',
    role: 'Directeur créatif et éditorial jeunesse (Nounou)',
    brand: 'nidal-junior',
    avatar: './assets/mascot.png',
    prompt: STUDIO_JUNIOR_PROMPT
  },
  'planning-nidal': {
    key: 'planning-nidal',
    name: 'Planning GS Nidal',
    role: 'Stratégie éditoriale & Planning institutionnel',
    brand: 'nidal',
    avatar: './assets/logo-cropped.png',
    prompt: PLANNING_NIDAL_PROMPT
  }
};

export function getEditorialAgents() {
  return Object.values(EDITORIAL_AGENTS);
}

export function agentConfigured(aiConfig = {}) {
  if (aiConfig?.apiKey?.trim()) return true;
  if (aiConfig?.provider === 'demo') return true;
  return Boolean(
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
}

export function getAiProvider(aiConfig = {}) {
  if (aiConfig?.provider) return aiConfig.provider;
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  return 'demo';
}

// ============================================================================
// APPEL MULTI-FOURNISSEURS IA (OPENROUTER, OPENAI, GEMINI, ANTHROPIC, GROQ, DEEPSEEK, DEMO)
// ============================================================================
export async function generateEditorialOutput({
  agentKey = 'studio-junior',
  brand,
  briefData = {},
  context = '',
  aiConfig = {}
}) {
  const agent = EDITORIAL_AGENTS[agentKey] || EDITORIAL_AGENTS['studio-junior'];
  const targetBrand = brand || agent.brand;

  // Déterminer le fournisseur actif
  let provider = (aiConfig.provider || getAiProvider()).toLowerCase().trim();
  if (!provider || provider === 'none') {
    provider = getAiProvider();
  }

  // Déterminer la clé API selon le provider
  let apiKey = (aiConfig.apiKey || '').trim();
  if (!apiKey) {
    if (provider === 'openrouter') apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    else if (provider === 'openai') apiKey = (process.env.OPENAI_API_KEY || '').trim();
    else if (provider === 'gemini') apiKey = (process.env.GEMINI_API_KEY || '').trim();
    else if (provider === 'anthropic') apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    else if (provider === 'groq') apiKey = (process.env.GROQ_API_KEY || '').trim();
    else if (provider === 'deepseek') apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  }

  const isDemo = provider === 'demo' || !apiKey || process.env.DEMO_MODE === 'true';

  // Construction du prompt utilisateur avec règles strictes par format
  const userPrompt = buildUserPrompt(briefData, context);

  if (isDemo) {
    const demoText = agentKey === 'planning-nidal'
      ? demoPlanningNidal(briefData, targetBrand)
      : demoStudioJunior(briefData, targetBrand);

    return {
      output: demoText,
      structuredData: parseStructuredEditorial(demoText, agentKey, targetBrand),
      storyboard: parseStoryboard(demoText),
      qualityCheck: parseQualityCheck(demoText),
      model: 'demo-template',
      provider: 'demo',
      isDemo: true,
      agentKey
    };
  }

  const systemInstructions = agent.prompt;

  // 1. OPENROUTER
  if (provider === 'openrouter') {
    let model = (aiConfig.model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct').trim();
    if (model === 'meta-llama/llama-3.3-70b-instruct:free') {
      model = 'meta-llama/llama-3.3-70b-instruct';
    }

    async function callOpenRouter(selectedModel) {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://gsnidal.ma',
          'X-Title': 'Nidal Content Hub',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      const data = await res.json();
      return { res, data };
    }

    let { res: response, data: payload } = await callOpenRouter(model);

    if (!response.ok) {
      const errMsg = payload.error?.message || `OpenRouter API ${response.status}`;
      const slugMatch = errMsg.match(/use this slug instead:\s*([a-zA-Z0-9_\-\.\/:]+)/i);
      if (slugMatch && slugMatch[1] && slugMatch[1] !== model) {
        const suggestedModel = slugMatch[1].trim();
        console.warn(`OpenRouter a suggéré ${suggestedModel}, nouvelle tentative automatique...`);
        const retry = await callOpenRouter(suggestedModel);
        if (retry.res.ok && retry.data.choices?.[0]?.message?.content) {
          const out = retry.data.choices[0].message.content;
          return {
            output: out,
            structuredData: parseStructuredEditorial(out, agentKey, targetBrand),
            storyboard: parseStoryboard(out),
            qualityCheck: parseQualityCheck(out),
            model: suggestedModel,
            provider: 'openrouter',
            isDemo: false,
            agentKey
          };
        }
      }
      throw new Error(errMsg);
    }

    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Réponse OpenRouter vide');
    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'openrouter',
      isDemo: false,
      agentKey
    };
  }

  // 2. OPENAI
  if (provider === 'openai') {
    const model = (aiConfig.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `OpenAI API ${response.status}`);
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Réponse OpenAI vide');

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'openai',
      isDemo: false,
      agentKey
    };
  }

  // 3. GOOGLE GEMINI
  if (provider === 'gemini') {
    const model = (aiConfig.model || 'gemini-2.0-flash').trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstructions }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Google Gemini API ${response.status}`);
    const output = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) throw new Error('Réponse Gemini vide');

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'gemini',
      isDemo: false,
      agentKey
    };
  }

  // 4. ANTHROPIC CLAUDE
  if (provider === 'anthropic') {
    const model = (aiConfig.model || 'claude-3-5-sonnet-20241022').trim();
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemInstructions,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.7
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Anthropic API ${response.status}`);
    const output = payload.content?.[0]?.text;
    if (!output) throw new Error('Réponse Claude vide');

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'anthropic',
      isDemo: false,
      agentKey
    };
  }

  // 5. GROQ
  if (provider === 'groq') {
    const model = (aiConfig.model || 'llama-3.3-70b-versatile').trim();
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Groq API ${response.status}`);
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Réponse Groq vide');

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'groq',
      isDemo: false,
      agentKey
    };
  }

  // 6. DEEPSEEK
  if (provider === 'deepseek') {
    const model = (aiConfig.model || 'deepseek-chat').trim();
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `DeepSeek API ${response.status}`);
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Réponse DeepSeek vide');

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'deepseek',
      isDemo: false,
      agentKey
    };
  }

  throw new Error(`Fournisseur d'IA non reconnu : ${provider}`);
}

// Legacy bridge for existing /api/agent/generate route
export async function generateAgentOutput({ brand = 'nidal-junior', task = 'article', brief, context = '' }) {
  const agentKey = brand === 'nidal' ? 'planning-nidal' : 'studio-junior';
  const briefData = {
    topic: brief,
    format: task,
    brief
  };
  return generateEditorialOutput({ agentKey, brand, briefData, context });
}

function buildUserPrompt(briefData = {}, context = '') {
  const parts = [];
  const format = String(briefData.format || 'article').toLowerCase();

  parts.push(`=== BRIEF ÉDITORIAL ===`);
  if (briefData.topic) parts.push(`Sujet / Thème : ${briefData.topic}`);
  if (briefData.brief && briefData.brief !== briefData.topic) parts.push(`Brief détaillé : ${briefData.brief}`);
  if (briefData.audience) parts.push(`Public cible : ${briefData.audience}`);
  if (briefData.objective) parts.push(`Objectif : ${briefData.objective}`);
  if (briefData.platform) parts.push(`Canal / Plateforme : ${briefData.platform}`);
  parts.push(`Format demandé : ${format}`);
  if (briefData.duration) parts.push(`Durée totale décidée : ${briefData.duration}`);
  if (briefData.slideCount) parts.push(`Nombre de slides décidé : ${briefData.slideCount}`);
  if (briefData.targetDate) parts.push(`Date souhaitée : ${briefData.targetDate}`);
  else parts.push(`Date souhaitée : Aucune date fournie (inscrire « Date à confirmer »)`);
  if (briefData.requiredInfo) parts.push(`Informations obligatoires / Faits confirmés : ${briefData.requiredInfo}`);
  if (briefData.cta) parts.push(`Appel à l'action souhaité : ${briefData.cta}`);
  if (briefData.assets) parts.push(`Ressources disponibles : ${briefData.assets}`);
  if (briefData.includeNounou !== undefined) parts.push(`Présence de Nounou : ${briefData.includeNounou ? 'Oui (obligatoire, rôle actif)' : 'Non'}`);
  if (briefData.language) parts.push(`Langue : ${briefData.language}`);
  if (briefData.notes) parts.push(`Notes internes : ${briefData.notes}`);
  if (briefData.revisionOf) parts.push(`Demande de révision : ${briefData.revisionOf}`);

  parts.push(`\n=== DIRECTIVES IMPÉRATIVES POUR LE FORMAT "${format.toUpperCase()}" ===`);

  if (/post/i.test(format)) {
    parts.push(`- INTERDICTION ABSOLUE DE PRODUIRE UN STORYBOARD OU DES SCÈNES.
- Rédige un POST RÉSEAUX SOCIAUX limpide, digeste et prêt à publier.
- Structure obligatoire :
  1. Concept créatif : Titre du post
  2. Idée visuelle : Description précise du visuel à concevoir (composition, charte, rôle de Nounou)
  3. Accroche : 1 phrase d'accroche percutante qui donne envie de lire
  4. Texte principal : 2 à 3 courts paragraphes aérés, chaleureux et clairs avec des émojis bienveillants
  5. Appel à l'action : Question chaleureuse invitant les familles à interagir
  6. Tags : STRICTEMENT 5 HASHTAGS ciblés (ni plus, ni moins)
  7. Formats visuels & Charte Nidal
  8. Contrôle qualité`);
  } else if (/reel|vidéo|video/i.test(format)) {
    const dur = briefData.duration || '30 secondes';
    parts.push(`- Produis un SCRIPT VIDÉO / REEL avec une DURÉE TOTALE DÉCIDÉE : ${dur}.
- Découpe le script en scènes minutées avec timing exact ([00:00 - 00:05], etc.).
- Pour chaque scène : Cadrage, Visuel, Action de Nounou, Voix mot à mot, Texte à l'écran, Transition, Son/SFX.
- Ajoute une légende sociale courte (1 à 2 phrases) et STRICTEMENT 5 HASHTAGS.`);
  } else if (/carrousel/i.test(format)) {
    const slides = briefData.slideCount || '5 slides';
    parts.push(`- Produis un CARROUSEL structuré avec un NOMBRE DE SLIDES DÉCIDÉ : ${slides}.
- Découpe chaque slide : Slide 1 (Couverture / Hook), Slides 2 à 4 (Contenu pédagogique par étapes avec 2 puces et idée visuelle), Slide finale (Synthèse & CTA enregistrement).
- Ajoute une légende sociale d'accompagnement courte et STRICTEMENT 5 HASHTAGS.`);
  } else if (/quiz/i.test(format)) {
    parts.push(`- Produis un QUIZ INTERACTIF ludo-éducatif avec Nounou.
- 3 questions claires à choix multiples (A, B, C), bonnes réponses indiquées, explications bienveillantes de Nounou.
- Légende invitant à répondre en commentaire et STRICTEMENT 5 HASHTAGS.`);
  } else if (/story/i.test(format)) {
    parts.push(`- Produis une série de 3 à 4 STORIES INTERACTIVES (format 1080x1920) avec stickers interactifs (sondage, quiz, curseur émoji), visuel par story, et STRICTEMENT 5 HASHTAGS.`);
  } else if (/calendrier|planning/i.test(format)) {
    parts.push(`- Produis un PLANNING / CALENDRIER ÉDITORIAL équilibré (pédagogie, vie scolaire, valeurs, conseils, Nidal Junior).
- Chaque entrée doit comporter : Date réelle ou « Date à confirmer », Heure, Plateforme, Format, Titre, Résumé, CTA, et STRICTEMENT 5 HASHTAGS.`);
  } else {
    parts.push(`- Produis un contenu éditorial soigné avec Titre, Chapeau, Corps structuré en 3 parties, Appel à l'action et STRICTEMENT 5 HASHTAGS.`);
  }

  if (context) {
    parts.push(`\n=== CONTEXTE EXISTANT DANS L'APPLICATION ===\n${context}`);
  }

  return parts.join('\n');
}

// ============================================================================
// ANALYSEURS ET PARSEURS STRUCTURÉS
// ============================================================================
export function shouldAutoSave(brief = '') {
  const normalized = String(brief).toLowerCase();
  return /\b(crée|cree|créer|creer|ajoute|ajouter|planifie|planifier|enregistre|enregistrer)\b/i.test(normalized);
}

export function parseStructuredEditorial(text, agentKey = 'studio-junior', defaultBrand = 'nidal-junior') {
  if (!text) return null;
  const find = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };

  const titre = find(/(?:^|\n)(?:Titre|Concept créatif)\s*:\s*(.+)/i) || 'Contenu éditorial Nidal';
  const typeRaw = find(/(?:^|\n)(?:Type|Type de contenu|Type de publication)\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const statutRaw = find(/(?:^|\n)Statut\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const publicCible = find(/(?:^|\n)Public\s*:\s*(.+)/i) || (agentKey === 'studio-junior' ? 'Enfants et familles' : 'Parents et communauté GS Nidal');
  const objectif = find(/(?:^|\n)(?:Objectif|Objectif pédagogique)\s*:\s*(.+)/i);
  const accroche = find(/(?:^|\n)Accroche\s*:\s*(.+)/i);
  const message = find(/(?:^|\n)(?:Texte principal|Message principal|Résumé|Légende sociale|Légende sociale courte)\s*:\s*(.+)/i);
  const auteur = find(/(?:^|\n)(?:Auteur|Responsable)\s*:\s*(.+)/i) || 'Équipe Nidal';
  const dateRaw = find(/(?:^|\n)(?:Date proposée|Date)\s*:\s*(.+)/i);
  const tagsRaw = find(/(?:^|\n)(?:Tags|Hashtags)\s*:\s*(.+)/i);
  const cta = find(/(?:^|\n)Appel à l’action\s*:\s*(.+)/i);
  const canal = find(/(?:^|\n)(?:Canal|Plateforme)\s*:\s*(.+)/i) || 'Instagram + Facebook';

  const validTypes = ['article', 'interview', 'dossier', 'breve', 'chronique', 'infographie', 'quiz', 'post', 'carrousel', 'video', 'story', 'reel'];
  const format = validTypes.includes(typeRaw) ? (typeRaw === 'reel' ? 'video' : typeRaw) : 'article';
  const statut = ['brouillon', 'en-cours', 'relecture', 'publie'].includes(statutRaw) ? statutRaw : 'brouillon';

  let datePublication = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    datePublication = dateRaw;
  }

  // Extraction et garantie de STRICTEMENT 5 HASHTAGS
  let extractedTags = [];
  if (tagsRaw) {
    extractedTags = tagsRaw
      .split(/[,#\s]+/)
      .filter(tag => tag && tag.length > 1)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
  }

  // Fallbacks si moins de 5 hashtags trouvés
  const defaultJuniorTags = ['#GSNidal', '#NidalJunior', '#MaternelleMaroc', '#PlaisirDeLire', '#GrandirEnsemble'];
  const defaultNidalTags = ['#GSNidal', '#GroupeScolaireNidal', '#ExcellenceEducative', '#ReussiteScolaire', '#AvenirDesEleves'];
  const baseDefaults = agentKey === 'studio-junior' ? defaultJuniorTags : defaultNidalTags;

  for (const fallbackTag of baseDefaults) {
    if (extractedTags.length >= 5) break;
    if (!extractedTags.includes(fallbackTag)) {
      extractedTags.push(fallbackTag);
    }
  }
  const tags = extractedTags.slice(0, 5);

  return {
    brand: defaultBrand,
    titre: titre.slice(0, 180),
    format,
    type: format,
    statut,
    publicCible,
    objectif: objectif || 'Valoriser les apprentissages et l’excellence',
    accroche: accroche || titre,
    message: message || text.slice(0, 400),
    fullOutput: text,
    canal,
    plateforme: canal,
    auteur,
    responsable: auteur,
    datePublication,
    dateAConfirmer: !datePublication,
    tags,
    cta: cta || 'Partagez vos impressions en commentaire',
    validation: 'a-valider',
    checks: { logo: true, valeurs: true, footer: true, autorisation: true }
  };
}

export function parseStoryboard(text) {
  if (!text || !/SCÈNE\s+\d+/i.test(text)) return null;
  const scenes = [];
  const sceneRegex = /SCÈNE\s+(\d+)\s*[-—:]*\s*([^\n]*)\n([\s\S]*?)(?=(?:SCÈNE\s+\d+|FORMATS VISUELS|CONTRÔLE QUALITÉ|DÉCOUPAGE|$))/gi;
  let match;
  while ((match = sceneRegex.exec(text)) !== null) {
    const num = match[1];
    const duration = match[2]?.trim() || '';
    const body = match[3];

    const getField = (label) => {
      const m = body.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
      return m ? m[1].trim() : '';
    };

    scenes.push({
      scene: Number(num),
      duration,
      cadrage: getField('Cadrage') || getField('Cadrage & Visuel'),
      visuel: getField('Visuel'),
      actionNounou: getField('Action de Nounou') || getField('Action'),
      voix: getField('Voix') || getField('Voix-off'),
      texteEcran: getField('Texte à l’écran') || getField('Texte à l\'écran') || getField('Texte écran'),
      transition: getField('Transition'),
      son: getField('Son')
    });
  }
  return scenes.length ? scenes : null;
}

export function parseQualityCheck(text) {
  if (!text || !/CONTRÔLE QUALITÉ/i.test(text)) {
    return {
      verified: 'Informations standards',
      toConfirm: 'Aucune',
      editorialConformity: true,
      visualConformity: true,
      imageConsentRequired: false,
      readyToSave: true,
      readyToPublish: false
    };
  }
  const find = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };
  const verified = find(/Informations vérifiées\s*:\s*(.+)/i) || 'Informations pédagogiques et charte validées';
  const toConfirm = find(/Informations à confirmer\s*:\s*(.+)/i) || 'Aucune';
  const imageConsent = /oui/i.test(find(/Autorisation d’image nécessaire\s*:\s*(.+)/i));

  return {
    verified,
    toConfirm,
    editorialConformity: true,
    visualConformity: true,
    imageConsentRequired: imageConsent,
    readyToSave: true,
    readyToPublish: false
  };
}

// Backward-compatible alias for existing code
export const parseStructuredContent = (text, defaultBrand) => parseStructuredEditorial(text, 'studio-junior', defaultBrand);

// ============================================================================
// DÉMO STUDIO NIDAL JUNIOR (RÉPONSES COMPLÈTES & PERSONNALISÉES PAR FORMAT)
// ============================================================================
function demoStudioJunior(briefData, brand = 'nidal-junior') {
  const topic = briefData.topic || briefData.brief || 'Le plaisir de lire avec Nounou';
  const format = String(briefData.format || 'reel').toLowerCase();

  // 1. FORMAT POST RÉSEAUX SOCIAUX
  if (/post/i.test(format)) {
    return `Concept créatif : ${topic}
Idée visuelle : Nounou assis dans le coin bibliothèque avec un grand livre ouvert, regard curieux et sourire bienveillant. Palette officielle bleu, magenta et jaune, logo Nidal Junior officiel en haut à gauche.
Accroche : Et si aujourd'hui, un livre devenait notre plus beau voyage ? 📖✨
Texte principal : Chaque jour à Nidal Junior, nos petits explorateurs découvrent que tourner une page, c’est s’envoler vers des univers merveilleux ! Accompagnés par Nounou, ils apprennent à écouter les histoires, à poser des questions et à enrichir leur imaginaire dans la joie et la bienveillance.

Que ce soit avant la sieste ou pendant les ateliers du matin, le rituel de lecture développe le vocabulaire, apaise les émotions et nourrit la curiosité naturelle des enfants dès la petite section.

Appel à l’action : Quel est le livre ou le conte préféré de votre enfant en ce moment ? Partagez son titre en commentaire ! 💛
Type de contenu : post
Canal : Instagram + Facebook
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #NidalJunior #MaternelleMaroc #PlaisirDeLire #GrandirEnsemble

FORMATS VISUELS & CHARTE NIDAL
1. Publication Instagram (1080 × 1350 px) : Format portrait centré sur Nounou et son livre, marges respectées.
2. Publication Facebook (1200 × 630 px) : Composition avec Nounou à gauche et citation inspirante à droite.
Charte graphique : Couleurs officielles bleu (#1746d1), magenta (#d91b5c), jaune (#ffc928). Logo officiel réservé sans altération. Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

CONTRÔLE QUALITÉ
Informations vérifiées : Utilisation exclusive de la mascotte officielle Nounou (assets/mascot.png), respect strict des valeurs pédagogiques et de la charte.
Informations à confirmer : Date de diffusion à inscrire au calendrier.
Conformité éditoriale : Conforme (ton positif, chaleureux et bienveillant).
Conformité visuelle : Conforme (charte GS Nidal respectée).
Autorisation d’image nécessaire : Non (visuel illustré avec Nounou).
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 2. FORMAT CARROUSEL
  if (/carrousel/i.test(format)) {
    const slides = briefData.slideCount || '5 slides';
    return `Concept créatif : ${topic}
Nombre de slides : ${slides}
Type de contenu : carrousel
Canal : Instagram Carrousel + Facebook
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #NidalJunior #PlaisirDeLire #ApprendreAutrement #GrandirEnsemble

DÉCOUPAGE DES SLIDES :
- Slide 1 (Couverture / Hook) :
  • Titre : « 3 secrets de Nounou pour donner envie de lire aux tout-petits 📖 »
  • Visuel : Nounou tenant une loupe géante devant un livre aux illustrations féériques.
  • Sous-titre : Faites glisser pour découvrir les conseils de Nidal Junior 👉

- Slide 2 (Secret n°1 : Le rituel sacré du soir) :
  • Titre : 1. Même 10 minutes chaque soir suffisent
  • Points clés : Créer un moment calme sans écran avant de dormir. Laisser l'enfant choisir lui-même son histoire.
  • Visuel : Nounou sous une veilleuse douce avec un livre d'animaux.

- Slide 3 (Secret n°2 : Faire vivre les voix et les images) :
  • Titre : 2. Jouer avec les intonations et pointer les détails
  • Points clés : Imiter les bruits d'animaux et faire deviner la suite. L'écoute active stimule le langage et l'éveil.
  • Visuel : Nounou mimant un lion rieur avec les bras levés.

- Slide 4 (Secret n°3 : Laisser les livres à portée de main) :
  • Titre : 3. Un coin lecture accessible en toute autonomie
  • Points clés : Des bacs à hauteur des yeux pour manipuler sans crainte. Un livre touché est un livre aimé !
  • Visuel : Étagère basse colorée aux normes de la petite enfance.

- Slide 5 (Slide finale / Synthèse & CTA) :
  • Titre : « Chaque histoire partagée est une graine de confiance semée ! 🌱 »
  • Texte : Enregistrez ce carrousel pour vos lectures du soir et dites-nous en commentaire votre livre fétiche.
  • Visuel : Nounou envoyant un cœur chaleureux avec le logo Nidal Junior.

Légende sociale d'accompagnement :
Développer le goût de la lecture commence dès le plus jeune âge ! Découvrez les astuces quotidiennes appliquées à Nidal Junior pour faire de la lecture un vrai moment de joie partagée.
👉 Enregistrez ce carrousel pour ne pas l'oublier et partagez-le aux jeunes parents !

Appel à l’action : Quel livre lisez-vous ce soir avec votre enfant ?

FORMATS VISUELS & CHARTE NIDAL
Carrousel Instagram : 1080 × 1350 px (5 slides harmonisées, fond doux, logo en haut à gauche sur chaque slide).

CONTRÔLE QUALITÉ
Informations vérifiées : Conseils pédagogiques validés par l'équipe maternelle, mascotte officielle Nounou.
Informations à confirmer : Aucune.
Conformité éditoriale : Conforme.
Conformité visuelle : Conforme.
Autorisation d’image nécessaire : Non.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 3. FORMAT QUIZ / DEVINETTE
  if (/quiz/i.test(format)) {
    return `Concept créatif : Le Grand Quiz Découverte de Nounou
Niveau & Thème : Maternelle & Primaire — Les animaux et la nature
Type de contenu : quiz
Canal : Story interactive + Post Instagram
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #NidalJunior #QuizEnfant #EveilMaternelle #GrandirEnsemble

Accroche de Nounou : « Coucou les champions ! Aujourd'hui, on joue ensemble avec les animaux. Qui trouvera les 3 bonnes réponses ? C'est parti ! 🐾 »

QUESTION 1 : Quel animal se réveille la nuit et a de grands yeux ronds pour voir dans le noir ?
- A) L'écureuil malin
- B) La chouette protectrice
- C) Le poussin joyeux
Bonne réponse : B) La chouette protectrice
Explication bienveillante de Nounou : « Bravo ! La chouette voit très bien la nuit et veille sagement sur la forêt ! »

QUESTION 2 : De quoi a besoin une petite graine pour grandir et devenir une magnifique fleur ?
- A) De l'eau, de la terre et du soleil
- B) Du chocolat et des bonbons
- C) Seulement du vent froid
Bonne réponse : A) De l'eau, de la terre et du soleil
Explication bienveillante de Nounou : « Exactement ! Comme vous à l'école, les fleurs ont besoin d'attention, de lumière et de soin pour grandir ! »

QUESTION 3 : Parmi ces 3 couleurs, laquelle obtient-on en mélangeant du bleu et du jaune ?
- A) Le violet
- B) Le vert
- C) L'orange
Bonne réponse : B) Le vert
Explication bienveillante de Nounou : « Superbe ! Le bleu et le jaune font un vert éclatant, la couleur des feuilles de notre jardin ! »

Légende & Appel à l'action :
Testez les connaissances de vos enfants avec Nounou ! Écrivez leurs réponses (1B, 2A, 3B) en commentaire, Nounou leur enverra une médaille d'honneur ! 🏅✨

FORMATS VISUELS & CHARTE NIDAL
Story Instagram (1080 × 1920 px) avec sticker Quiz interactif à choix multiples.

CONTRÔLE QUALITÉ
Informations vérifiées : Questions conformes au programme d'éveil de maternelle, ton bienveillant et valorisant.
Informations à confirmer : Aucune.
Conformité éditoriale : Conforme.
Conformité visuelle : Conforme.
Autorisation d’image nécessaire : Non.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 4. FORMAT STORY INTERACTIVE
  if (/story/i.test(format)) {
    return `Concept créatif : Un jour à Nidal Junior avec Nounou
Type de contenu : story
Canal : Instagram Story + Facebook Story
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #NidalJunior #StoryMaternelle #VieScolaire #GrandirEnsemble

STORY 1 (1080 × 1920 px) — L'ÉVEIL DU MATIN
• Visuel : Nounou avec son cartable à l'entrée de l'école, grand sourire sous un soleil chaleureux.
• Texte à l'écran : « Bienvenue à Nidal Junior ! Prêts pour une belle journée ? ☀️ »
• Sticker interactif : Sondage [Oui toujours ! 🚀 / Un peu timide 🧸]

STORY 2 (1080 × 1920 px) — L'ATELIER CRÉATIF
• Visuel : Gros plan sur des dessins colorés, Nounou présente un pinceau avec joie.
• Texte à l'écran : « Aujourd'hui, on explore les couleurs et la créativité avec le groupe des Papillons ! 🎨 »
• Sticker interactif : Curseur émoji cœur vibrant pour noter le dessin.

STORY 3 (1080 × 1920 px) — LA DEVINETTE DE NOUNOU
• Visuel : Nounou pose un doigt sur sa joue d'un air malicieux.
• Texte à l'écran : « Quel est le mot magique quand un ami nous prête son jouet ? 🪄 »
• Sticker interactif : Boîte à questions ouverte pour que les enfants répondent avec leurs parents.

STORY 4 (1080 × 1920 px) — RÉSULTAT & LIEN UTILE
• Visuel : Nounou salue les familles avec la mascotte officielle et le slogan officiel.
• Texte à l'écran : « C'est "MERCI !" Bienveillance et partage sont nos valeurs quotidiennes 💛 »
• Sticker interactif : Bouton de lien vers gsnidal.ma pour découvrir notre projet pédagogique.

Appel à l’action : Répondez aux stories pour que Nounou vous salue !

CONTRÔLE QUALITÉ
Informations vérifiées : Format vertical adapté 1080x1920, charte et valeurs respectées.
Informations à confirmer : Date de diffusion en story.
Conformité éditoriale : Conforme.
Conformité visuelle : Conforme.
Autorisation d’image nécessaire : Non.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 5. FORMAT REEL / VIDÉO (PAR DÉFAUT SI REEL/VIDÉO)
  const duration = briefData.duration || '30 secondes';
  return `Concept créatif : ${topic}
Durée totale décidée : ${duration}
Objectif pédagogique : Stimuler la curiosité, le plaisir de la lecture autonome et le vocabulaire chez les jeunes enfants
Public : Enfants de maternelle (3 à 6 ans) et leurs familles
Message principal : Ouvrir un livre, c’est s’envoler pour mille aventures d’apprentissage passionnantes !
Rôle de Nounou : Nounou découvre un livre illustré avec émerveillement, invite les enfants à explorer une page avec lui et pose une question magique.
Type de contenu : reel
Canal : Instagram Reel + Facebook Story
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Légende sociale courte : Chaque jour à Nidal Junior, ouvrir un livre est une porte magique vers l'imaginaire et la confiance en soi ! 📖✨
Appel à l’action : Quel est le livre préféré de votre enfant ce soir ? Partagez son titre en commentaire !
Tags : #GSNidal #NidalJunior #MaternelleMaroc #PlaisirDeLire #GrandirEnsemble

STORYBOARD MINUTÉ :
SCÈNE 1 — 00:00 à 00:05 (5 secondes)
Cadrage : Plan moyen centré sur Nounou assis dans le coin bibliothèque coloré de l'école.
Visuel : Palette bleu-magenta-jaune, étagères de livres illustrés, logo officiel Nidal en haut à gauche.
Action de Nounou : Nounou fait un signe de la main joyeux face caméra puis prend un grand livre coloré sur ses genoux.
Voix : « Coucou ! Vous savez ce qui se passe quand on ouvre un livre magique ? »
Texte à l’écran : Le pouvoir magique des histoires ✨
Transition : Zoom avant fluide vers la couverture du livre.
Son : Musique douce acoustique, tintement féérique léger.

SCÈNE 2 — 00:05 à 00:15 (10 secondes)
Cadrage : Gros plan sur les yeux curieux et expressifs de Nounou, puis plan sur la page illustrée.
Visuel : Une grande illustration chaleureuse apparaît (animaux et nature).
Action de Nounou : Nounou pointe délicatement une illustration avec son doigt et sourit avec admiration.
Voix : « On peut voler avec les oiseaux, nager avec les dauphins et découvrir plein de mots secrets ! »
Texte à l’écran : Imaginer · Explorer · Grandir
Transition : Balayage doux latéral de gauche à droite.
Son : Bruitage de pages qui tournent, mélodie entraînante et rassurante.

SCÈNE 3 — 00:15 à 00:25 (10 secondes)
Cadrage : Plan d'ensemble chaleureux, Nounou serre doucement le livre contre son cœur.
Visuel : Liste verticale DISCIPLINE, CONFIANCE, PROGRÈS, RÉUSSITE visible en haut à droite.
Action de Nounou : Nounou regarde les enfants avec tendresse et tend le livre vers eux.
Voix : « Lire un tout petit peu chaque jour, c’est devenir plus grand et plus fort ! »
Texte à l’écran : Chaque jour une nouvelle découverte 💛
Transition : Fondu enchaîné doux.
Son : Rire discret bienveillant, mélodie chaleureuse.

SCÈNE 4 — 00:25 à 00:30 (5 secondes)
Cadrage : Plan final avec carton de fin institutionnel épuré.
Visuel : Nounou à gauche, logo officiel Nidal en haut à gauche, pied de page @GSNIDAL · GSNIDAL.MA.
Action de Nounou : Clin d'œil amical de Nounou et geste d'invitation à lire ensemble.
Voix : « Et vous, quelle histoire lisez-vous ce soir ? Racontez-la moi ! »
Texte à l’écran : Racontez-nous en commentaire 💬 | @GSNIDAL · GSNIDAL.MA
Transition : Fondu au noir léger.
Son : Conclusion musicale harmonieuse et positive.

FORMATS VISUELS & CHARTE NIDAL
1. Story Instagram (1080 × 1920 px) : Plein écran vertical, Nounou en bas à gauche, texte court centré, sticker interactif "Votre livre favori".
2. Publication Instagram (1080 × 1350 px) : Format portrait optimisé, composition épurée, marges de sécurité respectées.
3. Publication carrée (1080 × 1080 px) : Vignette compacte, logo officiel préservé en haut à gauche.
4. Publication Facebook (1200 × 630 px) : Format paysage avec Nounou à gauche et accroche percutante à droite.
Charte graphique : Couleurs dominantes bleu (#1746d1), magenta (#d91b5c), jaune (#ffc928). Logo officiel officiel sans retouche. Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

CONTRÔLE QUALITÉ
Informations vérifiées : Utilisation exclusive de la mascotte officielle Nounou (assets/mascot.png), respect des valeurs et du ton jeunesse.
Informations à confirmer : Date de publication finale à valider dans le calendrier éditorial.
Conformité éditoriale : Conforme (pédagogique, chaleureux, bienveillant, aucune promesse excessive).
Conformité visuelle : Conforme (charte GS Nidal, logo officiel en haut à gauche, slogan et pied de page).
Autorisation d’image nécessaire : Non (seule la mascotte officielle et des décors graphiques sont utilisés).
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
}

// ============================================================================
// DÉMO PLANNING GS NIDAL (RÉPONSES COMPLÈTES & PERSONNALISÉES PAR FORMAT)
// ============================================================================
function demoPlanningNidal(briefData, brand = 'nidal') {
  const topic = briefData.topic || briefData.brief || 'Calendrier éditorial de 4 semaines';
  const format = String(briefData.format || 'calendrier_mois').toLowerCase();

  // 1. FORMAT POST INSTITUTIONNEL
  if (/post/i.test(format)) {
    return `Concept créatif : ${topic}
Idée visuelle : Composition institutionnelle sobre et haut de gamme. Dégradé bleu profond (#1746d1), typographie dorée/jaune, logo officiel Nidal net en haut à gauche. Marge de sécurité respectée et slogan « PLUS QU’UNE ÉCOLE, UN AVENIR » en pied de page.
Accroche : À Nidal, nous croyons que la réussite scolaire se bâtit chaque jour sur la confiance et l'effort partagé.
Texte principal : De la toute petite section aux classes d'examen, notre mission quotidienne repose sur quatre piliers indissociables : la discipline bienveillante pour structurer l'effort, la confiance en soi pour oser entreprendre, le progrès régulier mesuré sans jugement, et l'excellence partagée pour ouvrir grand les portes de l'avenir.

Chaque élève bénéficie d'un suivi attentif et personnalisé au sein d'un environnement moderne, chaleureux et sécurisant, pensé pour cultiver le sens de l'autonomie et l'amour d'apprendre.

Information pratique : Nos équipes d'orientation et de direction sont à votre écoute pour échanger sur le projet éducatif de votre enfant.
Appel à l’action : Rendez-vous sur gsnidal.ma pour planifier votre visite et rencontrer notre équipe éducative.
Type de contenu : post
Canal : Facebook + LinkedIn + Instagram
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #GroupeScolaireNidal #ExcellenceEducative #AvenirDesEleves #ReussiteScolaire

FORMATS VISUELS & CHARTE NIDAL
1. Publication Facebook (1200 × 630 px) : Format horizontal avec citation forte et logo officiel à gauche.
2. Publication Instagram & LinkedIn (1080 × 1350 px) : Portrait officiel soigné avec piliers fondateurs.
Charte graphique : Couleurs dominantes bleu (#1746d1), magenta (#d91b5c), jaune (#ffc928). Logo officiel officiel sans retouche. Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

CONTRÔLE QUALITÉ
Informations vérifiées : Alignement sur le projet d'établissement officiel et les 4 valeurs cardinales.
Informations à confirmer : Date de publication finale à valider dans le calendrier.
Conformité éditoriale : Conforme (ton respectueux, sérieux, institutionnel et engageant).
Conformité visuelle : Conforme (charte GS Nidal complète).
Autorisation d’image nécessaire : Non (visuel graphique institutionnel).
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 2. FORMAT CARROUSEL MÉTHODOLOGIQUE
  if (/carrousel/i.test(format)) {
    return `Concept créatif : Les 4 piliers de l'excellence pédagogique à Nidal
Nombre de slides : 5 slides
Type de contenu : carrousel
Canal : Instagram + LinkedIn + Facebook
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #PedagogieActive #ExcellenceEducative #Coeducation #ReussiteScolaire

DÉCOUPAGE DES SLIDES :
- Slide 1 (Couverture) :
  • Titre : « Comment nous préparons nos élèves à réussir leur avenir 🏛️ »
  • Visuel : Photo institutionnelle de façade ou salle de classe moderne avec bandeau charte Nidal.
  • Sous-titre : Découvrez les 4 fondements de notre méthode éducative 👉

- Slide 2 (Pilier 1 : La discipline bienveillante) :
  • Titre : 1. La discipline bienveillante
  • Contenu : Un cadre structurant qui rassure et responsabilise. Des règles claires appliquées avec équité et respect.
  • Visuel : Icône bouclier protecteur / ambiance de classe ordonnée et souriante.

- Slide 3 (Pilier 2 : La confiance en soi) :
  • Titre : 2. La confiance en soi
  • Contenu : Oser poser des questions et apprendre de ses erreurs. Valorisation des progrès individuels de chaque élève.
  • Visuel : Icône étoile d'épanouissement / prise de parole d'un élève.

- Slide 4 (Piliers 3 & 4 : Progrès & Réussite) :
  • Titre : 3. Le progrès continu & la réussite
  • Contenu : Un suivi régulier avec les familles pour avancer main dans la main vers les examens et l'enseignement supérieur.
  • Visuel : Graphique d'ascension positive / remise des distinctions scolaires.

- Slide 5 (Slide finale / Synthèse & CTA) :
  • Titre : « Plus qu'une école, un avenir pour vos enfants. »
  • Contenu : Échangez avec notre direction sur gsnidal.ma ou contactez notre secrétariat d'accueil.
  • Visuel : Logo officiel Nidal HD avec mentions de contact.

Légende sociale d'accompagnement :
Au Groupe Scolaire Nidal, l'excellence académique est indissociable de l'épanouissement personnel. Faites défiler ce carrousel pour découvrir nos engagements au quotidien.

Appel à l’action : Enregistrez ce carrousel et partagez-le aux parents en quête d'un établissement d'excellence.

FORMATS VISUELS & CHARTE NIDAL
Carrousel format portrait 1080 × 1350 px.

CONTRÔLE QUALITÉ
Informations vérifiées : Piliers validés par la direction générale.
Informations à confirmer : Aucune.
Conformité éditoriale : Conforme.
Conformité visuelle : Conforme.
Autorisation d’image nécessaire : Non.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
  }

  // 3. FORMAT CALENDRIER ÉDITORIAL (PAR DÉFAUT POUR PLANNING NIDAL)
  return `STRATÉGIE ÉDITORIALE & CALENDRIER — GROUPE SCOLAIRE NIDAL
Objectif stratégique : Équilibrer la visibilité institutionnelle entre excellence pédagogique, vie scolaire, conseils aux familles et passerelle jeunesse Nidal Junior.
Publics ciblés : Parents d’élèves, futurs parents, communauté éducative et partenaires.
Règle appliquée : Aucune date inventée — toutes les dates sans événement arrêté portent la mention « Date à confirmer ».

================================================================================
SEMAINE 1 — PILIER : PÉDAGOGIE & MÉTHODES D’APPRENTISSAGE
================================================================================
Date : Date à confirmer (Lundi recommandé, 18:30)
Plateforme : Instagram + Facebook
Public : Parents et futurs parents
Pilier éditorial : Pédagogie
Type de publication : Carrousel (5 pages)
Titre : Comment nos enseignants cultivent l'autonomie et le plaisir d'apprendre
Angle : Regard concret sur les rituels de classe et la pédagogie bienveillante.
Résumé : Décryptage des 4 étapes clés mises en œuvre au quotidien pour aider chaque élève à progresser à son rythme.
Format visuel : 1080 × 1350 px (Carrousel graphique charte bleu-magenta-jaune)
Appel à l’action : Enregistrez ce carrousel pour découvrir nos méthodes éducatives !
Tags : #GSNidal #PedagogieActive #ExcellenceEducative #ApprendreAutrement #ReussiteScolaire

Date : Date à confirmer (Jeudi recommandé, 11:00)
Plateforme : Instagram Reel + Facebook Story
Public : Familles de maternelle et primaire
Pilier éditorial : Nidal Junior & Mascotte Nounou
Type de publication : Reel avec Nounou
Titre : Le voyage imaginaire de Nounou au pays des livres
Angle : Récit doux et inspirant autour du coin lecture.
Résumé : Nounou présente son livre illustré et invite les enfants à partager leur histoire favorite.
Recommandation de transfert : ce sujet doit être confié à Studio Nidal Junior pour la réalisation du script et du storyboard avec Nounou.
Format visuel : 1080 × 1920 px (Vidéo verticale minutée)
Appel à l’action : Racontez-nous en commentaire le livre préféré de votre enfant !
Tags : #GSNidal #NidalJunior #PlaisirDeLire #MaternelleMaroc #GrandirEnsemble

================================================================================
SEMAINE 2 — PILIER : VIE SCOLAIRE & ÉCOUTE BIENVEILLANTE
================================================================================
Date : Date à confirmer (Mardi, 18:30)
Plateforme : Facebook + Instagram
Public : Parents actuels
Pilier éditorial : Vie scolaire
Type de publication : Post image
Titre : Grandir en confiance : l'écoute active au cœur de chaque journée
Angle : Témoignage professionnel de l’équipe encadrante sur le climat scolaire serein.
Résumé : Présentation des rituels du matin qui permettent aux élèves d'exprimer leurs émotions et d'aborder la journée avec sérénité.
Format visuel : 1080 × 1080 px (Visuel sobre avec citation inspirante)
Appel à l’action : Partagez un mot d’encouragement pour nos équipes !
Tags : #GSNidal #VieScolaire #ConfianceEnSoi #BienveillanceScolaire #ClimatScolaire

================================================================================
SEMAINE 3 — PILIER : CONSEILS AUX FAMILLES & COÉDUCATION
================================================================================
Date : Date à confirmer (Mercredi, 18:30)
Plateforme : Instagram + Facebook + LinkedIn
Public : Parents d'élèves de tous niveaux
Pilier éditorial : Conseils aux parents
Type de publication : Infographie / Carrousel
Titre : 5 habitudes du soir pour un sommeil réparateur et une concentration optimale
Angle : Conseils pratiques d'ergonomie mentale et de repos pour réussir sa scolarité.
Résumé : Synthèse pédagogique rappelant l'importance des rituels sans écran et du temps calme avant le coucher.
Format visuel : 1080 × 1350 px (Infographie numérotée lisible et soignée)
Appel à l’action : Quelle astuce fonctionne le mieux chez vous ?
Tags : #GSNidal #ConseilParents #Coeducation #SommeilEnfant #ReussiteEducative

================================================================================
SEMAINE 4 — PILIER : VALEURS, ORIENTATION & EXCELLENCE CONFIRMÉE
================================================================================
Date : Date à confirmer (Vendredi, 18:30)
Plateforme : Instagram + Facebook + LinkedIn
Public : Futurs parents et communauté locale
Pilier éditorial : Valeurs de l'établissement
Type de publication : Publication institutionnelle officielle
Titre : Plus qu'une école, un avenir : notre engagement pour l'épanouissement de chaque élève
Angle : Bilan d’étape sur les projets pédagogiques et l’accompagnement vers l’excellence.
Résumé : Rappel des piliers fondateurs qui guident l'équipe de Nidal depuis l'école maternelle jusqu'au collège-lycée.
Format visuel : 1200 × 630 px (Facebook) + 1080 × 1350 px (Instagram)
Appel à l’action : Découvrez notre projet pédagogique complet sur gsnidal.ma !
Tags : #GSNidal #GroupeScolaireNidal #DisciplineConfianceProgresReussite #AvenirDesEleves #PlusQuUneEcoleUnAvenir

CONTRÔLE QUALITÉ
Informations vérifiées : Équilibre des piliers éditoriaux respecté, absence totale de dates inventées (« Date à confirmer » apposée sur chaque entrée), sujet jeunesse fléché vers Studio Nidal Junior.
Informations à confirmer : Calendrier officiel des vacances scolaires et disponibilités de la direction.
Conformité éditoriale : Conforme (ton respectueux, sérieux, institutionnel et engageant).
Conformité visuelle : Conforme (application de la charte GS Nidal complète).
Autorisation d’image nécessaire : Non requise pour les infographies et visuels graphiques ; obligatoire pour tout visuel photo.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
}
