const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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

TYPES DE CONTENUS AUTORISÉS
- article : article pédagogique ou découverte
- interview : interview vivante avec élève, enseignant, parent
- dossier : dossier thématique complet
- breve : brève concise d'activité
- chronique : chronique de vie de classe ou d'éveil
- infographie : synthèse visuelle par étapes
- quiz : quiz ludo-éducatif adapté avec choix et explications bienveillantes
- histoire : mini-conte ou histoire pédagogique
- reel / video : vidéo courte ou Reel avec storyboard minuté
- story : story interactive ou question/réponse

VALEURS À TRANSMETTRE
Discipline bienveillante, confiance en soi, progrès pas à pas, réussite, curiosité, autonomie, entraide, respect, créativité et plaisir d’apprendre.

RÈGLES ÉDITORIALES & CONFIDENTIALITÉ
- N’invente jamais une date, un tarif, un événement non confirmé, un résultat scolaire ou un témoignage.
- Si une date n'est pas fournie : indiquer clairement « Date à confirmer ».
- Respect strict de la vie privée des élèves et des familles : aucune photo de mineur identifiable sans autorisation explicite confirmée.
- Ne révèle jamais de mot de passe, de chaîne PostgreSQL ou de clé d'API.
- Les contenus produits sont toujours au statut « brouillon » en attente de validation humaine. Ne jamais marquer « publie » automatiquement.

FORMAT OBLIGATOIRE D’UNE PROPOSITION
Structure toujours ta réponse avec les rubriques suivantes :

Concept créatif :
Objectif pédagogique :
Public :
Message principal :
Rôle de Nounou :
Accroche :
Texte principal :
Appel à l’action :
Type de contenu : [article | interview | dossier | breve | chronique | infographie | quiz | reel | story]
Canal : [Instagram | Facebook | Story | Reel | Magazine | Multi-canal]
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#GSNidal #NidalJunior ...]

LÉGENDE SOCIALE & HASHTAGS
Fournis une légende complète prête à publier :
- Accroche naturelle et captivante
- Texte bien rédigé en paragraphes courts
- Information utile et bienveillante
- Appel à l'action clair
- 5 à 10 hashtags ciblés (inclure #GSNidal #NidalJunior #GrandirEnsemble #EducationJeunesse #ReussiteScolaire selon le sujet)

STORYBOARD MINUTÉ (OBLIGATOIRE SI VIDÉO / REEL / STORY ANIMÉE)
Pour chaque scène :
SCÈNE 1 — [0 à 3 secondes]
Cadrage :
Visuel :
Action de Nounou :
Voix :
Texte à l’écran :
Transition :
Son :

SCÈNE 2 — [3 à 7 secondes]
... (continuer jusqu'à l'appel à l'action final)

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

CALENDRIERS ÉDITORIAUX
Tu es capable de concevoir des plannings équilibrés : hebdomadaires (7 jours), mensuels (4 semaines) ou thématiques.
Chaque entrée doit comporter :
Date : [Date réelle ou « Date à confirmer »]
Heure proposée : [Ex: 18:30]
Plateforme : [Instagram | Facebook | LinkedIn | Multi-plateformes]
Public : [Parents | Élèves | Futurs parents | Partenaires]
Pilier éditorial : [Pédagogie | Vie scolaire | Valeurs | Inscriptions | Nidal Junior]
Objectif :
Type de publication : [Post image | Carrousel | Vidéo | Article | Annonce]
Titre :
Angle :
Résumé :
Format visuel : [1080 × 1350 px | 1200 × 630 px | Carrousel 4-6 pages]
Appel à l’action :
Statut : brouillon
Responsable : Équipe Nidal
Ressources nécessaires :
Hashtags : [#GSNidal #GroupeScolaireNidal ...]
Informations à valider :

RÉDACTION DES PUBLICATIONS GS NIDAL
Pour chaque publication rédigée, fournis :
Accroche :
Texte principal :
Information pratique :
Appel à l’action :
Suggestion visuelle :
Plateforme :
Hashtags :
Éléments à valider :

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

export function agentConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

export function getAiProvider() {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

// ============================================================================
// APPEL LLM (OPENROUTER / OPENAI / DEMO)
// ============================================================================
export async function generateEditorialOutput({
  agentKey = 'studio-junior',
  brand,
  briefData = {},
  context = ''
}) {
  const agent = EDITORIAL_AGENTS[agentKey] || EDITORIAL_AGENTS['studio-junior'];
  const targetBrand = brand || agent.brand;
  const isConfigured = agentConfigured();
  const isDemo = process.env.DEMO_MODE === 'true' || !isConfigured;

  // Build the user brief prompt string
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
      isDemo: true,
      agentKey
    };
  }

  const systemInstructions = agent.prompt;

  if (process.env.OPENROUTER_API_KEY) {
    let model = (process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct').trim();
    if (model === 'meta-llama/llama-3.3-70b-instruct:free') {
      model = 'meta-llama/llama-3.3-70b-instruct';
    }

    async function callOpenRouter(selectedModel) {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

  // OpenAI fallback
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
  if (briefData.topic) parts.push(`Sujet / Thème : ${briefData.topic}`);
  if (briefData.brief && briefData.brief !== briefData.topic) parts.push(`Brief détaillé : ${briefData.brief}`);
  if (briefData.audience) parts.push(`Public cible : ${briefData.audience}`);
  if (briefData.objective) parts.push(`Objectif pédagogique / éditorial : ${briefData.objective}`);
  if (briefData.platform) parts.push(`Plateforme / Canal : ${briefData.platform}`);
  if (briefData.format) parts.push(`Format souhaité : ${briefData.format}`);
  if (briefData.targetDate) parts.push(`Date souhaitée : ${briefData.targetDate}`);
  else parts.push(`Date souhaitée : Aucune date fournie (inscrire « Date à confirmer »)`);
  if (briefData.requiredInfo) parts.push(`Informations obligatoires / faits confirmés : ${briefData.requiredInfo}`);
  if (briefData.cta) parts.push(`Appel à l'action souhaité : ${briefData.cta}`);
  if (briefData.assets) parts.push(`Ressources disponibles : ${briefData.assets}`);
  if (briefData.includeNounou !== undefined) parts.push(`Présence de Nounou : ${briefData.includeNounou ? 'Oui (obligatoire, rôle actif)' : 'Non'}`);
  if (briefData.includeStoryboard) parts.push(`Production d'un storyboard : Oui (minuté scène par scène)`);
  if (briefData.language) parts.push(`Langue : ${briefData.language}`);
  if (briefData.notes) parts.push(`Notes internes : ${briefData.notes}`);
  if (briefData.revisionOf) parts.push(`Demande de révision sur le contenu précédent : ${briefData.revisionOf}`);
  if (context) parts.push(`\nContexte existant / Contenus récents :\n${context}`);
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
  const message = find(/(?:^|\n)(?:Texte principal|Message principal|Résumé)\s*:\s*(.+)/i);
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

  const tags = tagsRaw
    ? tagsRaw.split(/[,#\s]+/).filter(tag => tag && tag.length > 1).map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    : (agentKey === 'studio-junior' ? ['#GSNidal', '#NidalJunior', '#GrandirEnsemble'] : ['#GSNidal', '#GroupeScolaireNidal', '#ReussiteScolaire']);

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
  const sceneRegex = /SCÈNE\s+(\d+)\s*[-—:]*\s*([^\n]*)\n([\s\S]*?)(?=(?:SCÈNE\s+\d+|FORMATS VISUELS|CONTRÔLE QUALITÉ|$))/gi;
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
      cadrage: getField('Cadrage'),
      visuel: getField('Visuel'),
      actionNounou: getField('Action de Nounou') || getField('Action'),
      voix: getField('Voix'),
      texteEcran: getField('Texte à l’écran') || getField('Texte écran'),
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
// DÉMO STUDIO NIDAL JUNIOR (RÉPONSE COMPLÈTE & SCÉNARIO 1)
// ============================================================================
function demoStudioJunior(briefData, brand = 'nidal-junior') {
  const topic = briefData.topic || briefData.brief || 'Le plaisir de lire avec Nounou';
  const isReel = /reel|vidéo|video|storyboard/i.test(topic + ' ' + (briefData.format || ''));

  return `Concept créatif : Le voyage imaginaire de Nounou au pays des livres
Objectif pédagogique : Stimuler la curiosité, le plaisir de la lecture autonome et le vocabulaire chez les jeunes enfants
Public : Enfants de maternelle (3 à 6 ans) et leurs familles
Message principal : Ouvrir un livre, c’est s’envoler pour mille aventures d’apprentissage passionnantes !
Rôle de Nounou : Nounou découvre un livre illustré avec émerveillement, invite les enfants à explorer une page avec lui et pose une question magique.
Accroche : Et si aujourd'hui, un livre devenait notre plus beau voyage ?
Texte principal : Nounou s’installe doucement dans le coin lecture de Nidal Junior. Entre les pages d'un livre d'histoires, les couleurs dansent et les animaux s'animent. Avec bienveillance et douceur, Nounou montre qu'apprendre à écouter et regarder les images est un jeu plein de surprises !
Appel à l’action : Quel livre votre enfant a-t-il envie d’ouvrir ce soir avant de dormir ? Racontez-nous en commentaire !
Type de contenu : ${isReel ? 'reel' : 'article'}
Canal : Instagram Reel + Facebook Story
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #NidalJunior #PlaisirDeLire #EducationJeunesse #GrandirEnsemble #EcoleMaternelle #ReussiteScolaire

LÉGENDE SOCIALE
Chaque jour à Nidal Junior, les livres sont de véritables portes ouvertes sur le monde. 📖✨
Accompagnés par Nounou, nos élèves découvrent que lire, c'est imaginer, comprendre et grandir avec confiance.
Qu'il s'agisse de Belle, d'Antonin ou de Camille, chaque histoire est une invitation à progresser pas à pas dans la joie !

👉 Quel est le livre préféré de votre enfant en ce moment ? Partagez son titre en commentaire pour donner des idées à toute la communauté !

#GSNidal #NidalJunior #PlaisirDeLire #MaternelleMaroc #ConfianceEnSoi #ApprendreEnsemble #GrandirEnsemble #EducationBienveillante

STORYBOARD MINUTÉ
SCÈNE 1 — 0 à 3 secondes
Cadrage : Plan moyen centré sur Nounou assis dans le coin bibliothèque coloré de l'école.
Visuel : Palette bleu-magenta-jaune, étagères de livres illustrés, logo officiel Nidal en haut à gauche.
Action de Nounou : Nounou fait un signe de la main joyeux face caméra puis prend un grand livre coloré sur ses genoux.
Voix : « Coucou ! Vous savez ce qui se passe quand on ouvre un livre magique ? »
Texte à l’écran : Le pouvoir magique des histoires ✨
Transition : Zoom avant fluide vers la couverture du livre.
Son : Musique douce acoustique, tintement féérique léger.

SCÈNE 2 — 3 à 7 secondes
Cadrage : Gros plan sur les yeux curieux et expressifs de Nounou, puis plan sur la page illustrée.
Visuel : Une grande illustration chaleureuse apparaît (animaux et nature).
Action de Nounou : Nounou pointe délicatement une illustration avec son doigt et sourit avec admiration.
Voix : « On peut voler avec les oiseaux, nager avec les dauphins et découvrir plein de mots secrets ! »
Texte à l’écran : Imaginer · Explorer · Grandir
Transition : Balayage doux latéral de gauche à droite.
Son : Bruitage de pages qui tournent, mélodie entraînante et rassurante.

SCÈNE 3 — 7 à 12 secondes
Cadrage : Plan d'ensemble chaleureux, Nounou serre doucement le livre contre son cœur.
Visuel : Liste verticale DISCIPLINE, CONFIANCE, PROGRÈS, RÉUSSITE visible en haut à droite.
Action de Nounou : Nounou regarde les enfants avec tendresse et tend le livre vers eux.
Voix : « Lire un tout petit peu chaque jour, c’est devenir plus grand et plus fort ! »
Texte à l’écran : Chaque jour une nouvelle découverte 💛
Transition : Fondu enchaîné doux.
Son : Rire discret bienveillant, mélodie chaleureuse.

SCÈNE 4 — 12 à 15 secondes
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
// DÉMO PLANNING GS NIDAL (CALENDRIER 4 SEMAINES & SCÉNARIO 2)
// ============================================================================
function demoPlanningNidal(briefData, brand = 'nidal') {
  const topic = briefData.topic || briefData.brief || 'Calendrier éditorial de 4 semaines';

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
Objectif : Mettre en lumière la méthodologie d'apprentissage actif et l'accompagnement personnalisé.
Type de publication : Carrousel (5 pages)
Titre : Comment nos enseignants cultivent l'autonomie et le plaisir d'apprendre
Angle : Regard concret sur les rituels de classe et la pédagogie bienveillante.
Résumé : Décryptage des 4 étapes clés mises en œuvre au quotidien pour aider chaque élève à progresser à son rythme.
Format visuel : 1080 × 1350 px (Carrousel graphique charte bleu-magenta-jaune)
Appel à l’action : Enregistrez ce carrousel pour découvrir nos méthodes éducatives !
Statut : brouillon
Responsable : Équipe Nidal
Ressources nécessaires : Visuels graphiques officiels, infographie pédagogique
Hashtags : #GSNidal #PedagogieActive #ExcellenceEducative #ApprendreAutrement #ReussiteScolaire
Informations à valider : Validation par la direction pédagogique des citations de méthode.

Date : Date à confirmer (Jeudi recommandé, 11:00)
Plateforme : Instagram Reel + Facebook Story
Public : Familles de maternelle et primaire
Pilier éditorial : Nidal Junior & Mascotte Nounou
Objectif : Éveil à la curiosité et au plaisir de lire chez les jeunes élèves.
Type de publication : Reel avec Nounou
Titre : Le voyage imaginaire de Nounou au pays des livres
Angle : Récit doux et inspirant autour du coin lecture.
Résumé : Nounou présente son livre illustré et invite les enfants à partager leur histoire favorite.
Recommandation de transfert : ce sujet doit être confié à Studio Nidal Junior pour la réalisation du script et du storyboard avec Nounou.
Format visuel : 1080 × 1920 px (Vidéo verticale minutée)
Appel à l’action : Racontez-nous en commentaire le livre préféré de votre enfant !
Statut : brouillon
Responsable : Studio Nidal Junior
Ressources nécessaires : Mascotte officielle Nounou (assets/mascot.png), storyboard validé
Hashtags : #GSNidal #NidalJunior #PlaisirDeLire #MaternelleMaroc #GrandirEnsemble
Informations à valider : Scénario final préparé par Studio Nidal Junior.

================================================================================
SEMAINE 2 — PILIER : VIE SCOLAIRE & ÉCOUTE BIENVEILLANTE
================================================================================
Date : Date à confirmer (Mardi, 18:30)
Plateforme : Facebook + Instagram
Public : Parents actuels
Pilier éditorial : Vie scolaire
Objectif : Rassurer les familles sur l'environnement protecteur et l'écoute active des équipes.
Type de publication : Post image
Titre : Grandir en confiance : l'écoute active au cœur de chaque journée
Angle : Témoignage professionnel de l’équipe encadrante sur le climat scolaire serein.
Résumé : Présentation des rituels du matin qui permettent aux élèves d'exprimer leurs émotions et d'aborder la journée avec sérénité.
Format visuel : 1080 × 1080 px (Visuel sobre avec citation inspirante)
Appel à l’action : Partagez un mot d’encouragement pour nos équipes !
Statut : brouillon
Responsable : Équipe Nidal
Ressources nécessaires : Photo d'ambiance de classe (sans mineurs identifiables sans accord)
Hashtags : #GSNidal #VieScolaire #ConfianceEnSoi #BienveillanceScolaire #ClimatScolaire
Informations à valider : Vérification préalable des autorisations parentales pour toute photo.

================================================================================
SEMAINE 3 — PILIER : CONSEILS AUX FAMILLES & COÉDUCATION
================================================================================
Date : Date à confirmer (Mercredi, 18:30)
Plateforme : Instagram + Facebook + LinkedIn
Public : Parents d'élèves de tous niveaux
Pilier éditorial : Conseils aux parents
Objectif : Offrir une valeur ajoutée éducative concrète aux parents pour le travail à la maison.
Type de publication : Infographie / Carrousel
Titre : 5 habitudes du soir pour un sommeil réparateur et une concentration optimale
Angle : Conseils pratiques d'ergonomie mentale et de repos pour réussir sa scolarité.
Résumé : Synthèse pédagogique rappelant l'importance des rituels sans écran et du temps calme avant le coucher.
Format visuel : 1080 × 1350 px (Infographie numérotée lisible et soignée)
Appel à l’action : Quelle astuce fonctionne le mieux chez vous ?
Statut : brouillon
Responsable : Équipe Nidal
Ressources nécessaires : Modèle d'infographie charte GS Nidal
Hashtags : #GSNidal #ConseilParents #Coeducation #SommeilEnfant #ReussiteEducative
Informations à valider : Relecture par le médecin scolaire ou psychologue référent.

================================================================================
SEMAINE 4 — PILIER : VALEURS, ORIENTATION & EXCELLENCE CONFIRMÉE
================================================================================
Date : Date à confirmer (Vendredi, 18:30)
Plateforme : Instagram + Facebook + LinkedIn
Public : Futurs parents et communauté locale
Pilier éditorial : Valeurs de l'établissement
Objectif : Valoriser l'engagement du Groupe Scolaire Nidal : Discipline, Confiance, Progrès, Réussite.
Type de publication : Publication institutionnelle officielle
Titre : Plus qu'une école, un avenir : notre engagement pour l'épanouissement de chaque élève
Angle : Bilan d’étape sur les projets pédagogiques et l’accompagnement vers l’excellence.
Résumé : Rappel des piliers fondateurs qui guident l'équipe de Nidal depuis l'école maternelle jusqu'au collège-lycée.
Format visuel : 1200 × 630 px (Facebook) + 1080 × 1350 px (Instagram)
Appel à l’action : Découvrez notre projet pédagogique complet sur gsnidal.ma !
Statut : brouillon
Responsable : Équipe Nidal
Ressources nécessaires : Logo officiel HD, charte graphique complète
Hashtags : #GSNidal #GroupeScolaireNidal #DisciplineConfianceProgresReussite #PlusQuUneEcoleUnAvenir
Informations à valider : Validation par la direction générale de l'établissement.

RÉDACTION EXEMPLE D'UN POST INSTITUTIONNEL
Accroche : À Nidal, nous croyons que chaque élève porte en lui un potentiel unique à révéler.
Texte principal : De la toute petite section aux classes d'examen, notre mission quotidienne repose sur quatre piliers indissociables : la discipline bienveillante pour structurer l'effort, la confiance en soi pour oser entreprendre, le progrès régulier mesuré sans jugement, et la réussite partagée pour ouvrir les portes de l'avenir.
Information pratique : Nos équipes pédagogiques et administratives sont à votre écoute pour échanger sur le projet éducatif de votre enfant.
Appel à l’action : Rendez-vous sur gsnidal.ma pour planifier votre visite et rencontrer notre direction.
Suggestion visuelle : Composition institutionnelle haut de gamme, bleu profond et accents jaune/magenta, logo officiel en haut à gauche, slogan « PLUS QU’UNE ÉCOLE, UN AVENIR » en pied de page.
Plateforme : Facebook & Instagram
Hashtags : #GSNidal #GroupeScolaireNidal #EducationMaroc #DisciplineConfianceProgresReussite #AvenirDesEleves
Éléments à valider : Disponibilités du secrétariat d'accueil avant publication.

CONTRÔLE QUALITÉ
Informations vérifiées : Équilibre des piliers éditoriaux respecté, absence totale de dates inventées (« Date à confirmer » apposée sur chaque entrée), sujet jeunesse fléché vers Studio Nidal Junior.
Informations à confirmer : Calendrier officiel des vacances scolaires et disponibilités de la direction.
Conformité éditoriale : Conforme (ton respectueux, sérieux, institutionnel et engageant).
Conformité visuelle : Conforme (application de la charte GS Nidal complète).
Autorisation d’image nécessaire : Non requise pour les infographies et visuels graphiques ; obligatoire pour tout visuel photo.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
}
