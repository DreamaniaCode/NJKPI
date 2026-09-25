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
    description: 'Routeur multi-modèles. Le mode openrouter/free choisit automatiquement un modèle gratuit disponible.',
    defaultModel: 'openrouter/free',
    models: [
      { id: 'openrouter/free', name: 'OpenRouter Free Router (Recommandé)', recommended: true, free: true },
      { id: 'custom', name: 'Modèle OpenRouter personnalisé' }
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
    description: 'API officielle Google Gemini',
    defaultModel: 'gemini-3.8-flash',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (GA, recommandé)', recommended: true },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (fallback qualité)' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (fallback rapide)' },
      { id: 'custom', name: 'Modèle Gemini personnalisé / plus récent' }
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
    id: 'alibaba',
    name: 'Alibaba Cloud Model Studio',
    description: 'API OpenAI-compatible Qwen via Alibaba Cloud Model Studio',
    defaultModel: 'qwen3.8-flash',
    models: [
      { id: 'qwen3.8-flash', name: 'Qwen 3.8 Flash (Rapide, recommandé)', recommended: true },
      { id: 'qwen3.8-max', name: 'Qwen 3.8 Max (Qualité supérieure)' },
      { id: 'qwen3.7-plus', name: 'Qwen 3.7 Plus' },
      { id: 'custom', name: 'Autre modèle Model Studio' }
    ],
    allowCustomModel: true
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    description: 'Workers AI via endpoint OpenAI-compatible',
    defaultModel: '@cf/qwen/qwen3.8-27b',
    models: [
      { id: '@cf/qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (qualité, raisonnement low)', recommended: true },
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Llama 3.3 70B Fast (secours rapide)' },
      { id: '@cf/meta/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout (secours long contexte)' },
      { id: '@cf/zai-org/glm-5.2', name: 'GLM 5.2' },
      { id: 'custom', name: 'Autre modèle Workers AI' }
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
Ne génère PAS de storyboard ni de découpage de scènes. Produis un post clair, engageant et son prompt image prêt à générer :
Concept créatif : [Titre du post]
Prompt image IA : [Prompt ultra-détaillé prêt pour Midjourney v6 / DALL-E 3 / Flux / Canva. Décris la scène précise : sujet principal (Nounou ou enfants de maternelle), composition, lumière chaleureuse, décor de classe ou bibliothèque, couleurs officielles bleu #1746d1, magenta #d91b5c, jaune #ffc928, style photographique ou 3D mignon et soigné, cadrage portrait 1080x1350 ou --ar 4:5]
Idée visuelle : [Description concise du visuel et charte graphique]
Accroche : [1 phrase percutante d'accroche qui attire l'attention dès la première ligne]
Post prêt à publier :
[Le post complet rédigé de façon vivante et chaleureuse, aéré en 2 à 3 courts paragraphes avec des émojis bienveillants, prêt à être copié-collé sur Instagram et Facebook]
Texte principal : [Reprise du texte du post pour compatibilité]
Appel à l’action : [Question claire et engageante pour encourager les parents à commenter]
Type de contenu : post
Canal : [Instagram / Facebook]
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS

2. FORMAT REEL / VIDÉO COURTE :
Doit obligatoirement avoir une DURÉE TOTALE DÉCIDÉE, le post/légende prêt à publier, le prompt image de couverture et un SCRIPT MINUTÉ SCÈNE PAR SCÈNE :
Concept créatif : [Titre du Reel]
Durée totale décidée : [Ex: 30 secondes / 45 secondes]
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 pour la miniature / couverture du Reel avec Nounou, couleurs bleu #1746d1, magenta #d91b5c, jaune #ffc928, --ar 9:16]
Post prêt à publier :
[Légende complète et engageante du Reel prête à copier-coller sur Instagram/Facebook avec émojis et question d'appel à l'action]
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
Doit obligatoirement avoir un NOMBRE DE SLIDES DÉCIDÉ (ex: 5 slides), le post prêt à publier et le prompt image de couverture :
Concept créatif : [Titre du Carrousel]
Nombre de slides : [Ex: 5 slides]
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 pour l'image de couverture Slide 1 avec Nounou, style lumineux et chaleureux, --ar 4:5]
Post prêt à publier :
[Texte complet de la publication accompagnant le carrousel, prêt à copier-coller avec émojis et appel à enregistrer le post]
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
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 pour le visuel du Quiz avec Nounou, --ar 4:5]
Post prêt à publier :
[Post complet du quiz prêt à publier avec les questions et l'invitation à répondre en commentaire]
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
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 en format vertical 9:16 pour le fond visuel de la Story]
Post prêt à publier :
[Texte récapitulatif prêt à copier pour les stories]
Type de contenu : story
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
STORY 1 (1080x1920) : Accroche visuelle + Sticker interactif recommandé (Sondage ou Curseur émoji)
STORY 2 (1080x1920) : Action de Nounou + Information d'éveil
STORY 3 (1080x1920) : Question quiz ou boîte à questions
STORY 4 (1080x1920) : Révélation + CTA vers le site ou commentaire

6. FORMAT ARTICLE / HISTOIRE / CONTE :
Concept créatif : [Titre de l'article ou du conte]
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 pour l'illustration principale]
Post prêt à publier :
[Post complet de présentation prêt à publier sur les réseaux sociaux]
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
export const PLANNING_NIDAL_PROMPT = `Tu es le responsable de la stratégie éditoriale et de la rédaction social media du Groupe Scolaire Nidal.

MISSION & RÔLE
Tu rédiges des publications prêtes à publier (claires, engageantes, humaines et valorisantes) accompagnées de leur Prompt Image IA détaillé pour que l'équipe puisse générer le visuel immédiatement.
INTERDICTION DU JARGON ADMINISTRATIF INUTILE : Ne noie jamais l'utilisateur sous des résumés vagues. Chaque demande doit livrer un VRAI POST COMPLET prêt à copier-coller et un VRAI PROMPT IMAGE IA précis.
Langue principale : français (arabe ou bilingue uniquement si explicitement demandé).

PILIERS ÉDITORIAUX ÉQUILIBRÉS
- Pédagogie & méthodes d'apprentissage (Active Learning, autonomie)
- Vie scolaire & épanouissement des élèves
- Valeurs de l'établissement (Discipline, Confiance, Progrès, Réussite)
- Conseils pratiques aux parents (gestion du temps, lecture, sommeil)
- Passerelle Nidal Junior & interventions de Nounou

RÈGLE ABSOLUE SUR LES HASHTAGS
Fournis TOUJOURS STRICTEMENT 5 HASHTAGS (ni plus, ni moins), pertinents et ciblés. Exemple : #GSNidal #GroupeScolaireNidal #ExcellenceEducative #AvenirDesEleves #ReussiteScolaire.

ARCHÉTYPES STRICTS SELON LE FORMAT SOUHAITÉ :

1. FORMAT POST INSTITUTIONNEL :
Ne génère PAS de storyboard ni de découpage de scènes. Produis un post clair, complet et son prompt image prêt à générer :
Concept créatif : [Titre du post institutionnel]
Prompt image IA : [Prompt ultra-détaillé prêt pour Midjourney v6 / DALL-E 3 / Flux / Canva. Décris précisément la scène : élèves souriants en uniforme ou salle de classe moderne lumineuse au Maroc, enseignant bienveillant, lumière naturelle dorée, touches de bleu roi #1746d1, jaune #ffc928 et magenta #d91b5c, style photo éditoriale Canon EOS R5 50mm f/1.8, haute résolution 8k, format portrait --ar 4:5]
Idée visuelle : [Description concise du visuel et de la mise en page charte GS Nidal]
Accroche : [1 phrase percutante d'ouverture mettant en valeur la vision de l'école]
Post prêt à publier :
[Le post complet rédigé avec rigueur et chaleur, structuré en 2 à 3 courts paragraphes aérés avec émojis sobres, l'appel à l'action et les 5 hashtags, prêt à être copié-collé sur Instagram, Facebook et LinkedIn]
Texte principal : [Reprise du corps du post]
Information pratique : [Rappel pratique pour les familles ou contact]
Appel à l’action : [Ex: « Rendez-vous sur gsnidal.ma pour échanger avec notre équipe pédagogique. »]
Type de contenu : post
Canal : [Instagram / Facebook / LinkedIn]
Statut : brouillon
Date proposée : [Date réelle ou « Date à confirmer »]
Auteur : Équipe Nidal
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS

2. FORMAT REEL / VIDÉO INSTITUTIONNELLE :
Doit obligatoirement avoir une DURÉE TOTALE DÉCIDÉE, le post/légende prêt à publier, le prompt image de couverture et un SCRIPT MINUTÉ :
Concept créatif : [Titre du Reel]
Durée totale décidée : [Ex: 30 secondes / 45 secondes]
Prompt image IA : [Prompt détaillé pour l'image de couverture verticale --ar 9:16]
Post prêt à publier :
[Légende complète prête à copier-coller pour accompagner le Reel]
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
Concept créatif : [Titre du Carrousel]
Nombre de slides : [Ex: 5 slides]
Prompt image IA : [Prompt détaillé Midjourney / DALL-E 3 pour la Slide 1 de couverture --ar 4:5]
Post prêt à publier :
[Légende complète prête à copier-coller pour accompagner le carrousel]
Type de contenu : carrousel
Tags : [#tag1 #tag2 #tag3 #tag4 #tag5] -> STRICTEMENT 5 HASHTAGS
DÉCOUPAGE DES SLIDES :
- Slide 1 (Couverture) : Titre fort + Visuel institutionnel + Sous-titre
- Slide 2 à 4 : Piliers / Méthodes avec 2 puces synthétiques et visuel
- Slide 5 : Synthèse & Appel à enregistrer
Légende d'accompagnement : [Texte explicatif pour les parents]
Appel à l’action : ...

4. FORMAT CALENDRIER ÉDITORIAL (Semaine ou Mois) :
INTERDICTION de faire une simple liste de résumés administratifs ! Pour CHAQUE publication du calendrier, tu dois rédiger le VRAI POST COMPLET prêt à copier-coller ET son PROMPT IMAGE IA détaillé :
Concept créatif : [Titre du planning]
Prompt image IA : [Prompt image IA détaillé du post phare de la semaine]
Post prêt à publier :
[Le post phare complet rédigé et prêt à publier immédiatement]
Puis pour chaque publication du calendrier :
- **Titre & Date**
- **📱 Post prêt à publier :** [Texte intégral rédigé avec accroche, paragraphes aérés, émojis, appel à l'action et 5 hashtags]
- **🎨 Prompt image IA :** [Prompt précis Midjourney / DALL-E 3 / Canva pour générer l'image associée]

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
// 3. PROMPT SYSTÈME - KPI & GROWTH MANAGER
// ============================================================================
export const KPI_MANAGER_PROMPT = `Tu es le KPI & Growth Manager interne du Groupe Scolaire Nidal.

MISSION
Tu analyses exclusivement les données KPI fournies par NJKPI et proposes des actions éditoriales mesurables pour Nidal Junior et Groupe Scolaire Nidal.

RÈGLES ABSOLUES
- Ne jamais inventer un chiffre, une tendance, une causalité ou un résultat.
- Distinguer clairement les données réelles, les données de démonstration et les données manquantes.
- Ne jamais considérer une corrélation comme une causalité.
- Ne jamais publier, supprimer ou modifier un contenu public automatiquement.
- Toute recommandation de publication reste un brouillon soumis à validation humaine.
- Ne jamais exposer de clé API, jeton Meta, mot de passe ou donnée personnelle d'un élève ou parent.

OBJECTIFS
- croissance qualifiée des abonnés ;
- portée et vues utiles ;
- commentaires, partages et enregistrements ;
- visites du profil et trafic vers gsnidal.ma lorsque disponibles ;
- demandes de visite, leads et inscriptions lorsque disponibles ;
- progression vers les objectifs KPI avec échéances.

FORMAT DE RÉPONSE
1. Résumé exécutif : 3 à 5 phrases factuelles.
2. Écarts aux objectifs : KPI, valeur actuelle, cible, écart, échéance et rythme requis si disponible.
3. Ce qui fonctionne : maximum 5 constats appuyés par des chiffres.
4. Points faibles / données insuffisantes : maximum 5 constats.
5. Actions prioritaires sur 7 jours : maximum 5 actions, chacune avec priorité, justification KPI, format conseillé et KPI à surveiller.
6. Expériences à tester : maximum 3 hypothèses mesurables, formulées comme tests et non comme certitudes.
7. Alertes : uniquement si une donnée fournie justifie clairement l'alerte.
8. Validation humaine : rappeler que toute publication reste à valider.

Si les données sont insuffisantes, dis-le explicitement et recommande d'abord la collecte des métriques manquantes.`;

// ============================================================================
// DÉFINITION DES AGENTS
// ============================================================================
export const EDITORIAL_AGENTS = {
  'kpi-manager': {
    key: 'kpi-manager',
    name: 'Nidal KPI & Growth Manager',
    role: 'Analyse KPI, croissance & recommandations',
    brand: 'nidal-junior',
    avatar: './assets/logo-cropped.png',
    prompt: KPI_MANAGER_PROMPT
  },
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
    process.env.DEEPSEEK_API_KEY ||
    process.env.ALIBABA_API_KEY ||
    (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID)
  );
}

export function getAiProvider(aiConfig = {}) {
  if (aiConfig?.provider) return aiConfig.provider;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.ALIBABA_API_KEY) return 'alibaba';
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) return 'cloudflare';
  return 'demo';
}

// ============================================================================
// APPEL MULTI-FOURNISSEURS IA (OPENROUTER, OPENAI, GEMINI, ANTHROPIC, GROQ, DEEPSEEK, DEMO)
// ============================================================================
async function resolveCloudflareAccountId(apiToken) {
  const configured = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (configured) return configured;

  // Réduire la configuration manuelle : si le token voit exactement un compte
  // Cloudflare, utiliser automatiquement son Account ID.
  const response = await fetchAiWithTimeout(
    'https://api.cloudflare.com/client/v4/accounts?per_page=50',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    },
    15000
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.errors?.[0]?.message ||
      'CLOUDFLARE_ACCOUNT_ID non configuré et détection automatique du compte Cloudflare impossible.'
    );
  }

  const accounts = Array.isArray(payload.result) ? payload.result : [];
  if (accounts.length === 1 && accounts[0]?.id) return String(accounts[0].id);

  if (!accounts.length) {
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID non configuré et aucun compte Cloudflare accessible avec ce token.'
    );
  }

  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID non configuré et plusieurs comptes Cloudflare sont accessibles. ' +
    'Ajoutez explicitement CLOUDFLARE_ACCOUNT_ID dans Coolify.'
  );
}

async function fetchAiWithTimeout(url, options = {}, timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 75000)) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(5000, timeoutMs));

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        `Le fournisseur IA n'a renvoyé aucun en-tête HTTP dans les ${Math.round(timeoutMs / 1000)} secondes.`
      );
      timeoutError.code = 'AI_REQUEST_TIMEOUT';
      timeoutError.timeoutMs = timeoutMs;
      timeoutError.url = url;
      throw timeoutError;
    }

    const networkCode = error?.cause?.code || error?.code || '';
    const networkMessage = error?.cause?.message || error?.message || String(error);
    if (networkCode) {
      throw new Error(`Connexion réseau vers le fournisseur IA impossible (${networkCode}) : ${networkMessage}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractGeminiInteractionText(payload = {}) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const texts = [];
  for (const step of steps) {
    if (step?.type !== 'model_output' && step?.role !== 'model') continue;
    const content = Array.isArray(step?.content) ? step.content : [];
    for (const part of content) {
      if (part?.type === 'text' && typeof part.text === 'string') texts.push(part.text);
    }
  }

  if (texts.length) return texts.join('\n').trim();

  const outputs = Array.isArray(payload.outputs) ? payload.outputs : [];
  for (const item of outputs) {
    if (item?.type === 'text' && typeof item.text === 'string') texts.push(item.text);
  }

  return texts.join('\n').trim();
}

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
    else if (provider === 'alibaba') apiKey = (process.env.ALIBABA_API_KEY || '').trim();
    else if (provider === 'cloudflare') apiKey = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  }

  const isProviderTest = aiConfig?.testMode === true;
  if (isProviderTest && provider !== 'demo' && !apiKey) {
    throw new Error(`Clé API absente pour le fournisseur ${provider}.`);
  }

  const isDemo = provider === 'demo'
    || (!apiKey && !isProviderTest)
    || (process.env.DEMO_MODE === 'true' && !isProviderTest);

  // Le diagnostic fournisseur doit rester un vrai ping IA minimal : ne pas envoyer
  // les milliers de tokens des prompts de marque pendant un simple test réseau.
  const userPrompt = isProviderTest
    ? 'Réponds exactement par OK, sans autre texte.'
    : buildUserPrompt(briefData, context);

  // Les plans stratégiques sont beaucoup plus lourds qu'un post simple :
  // analyse de données + calendrier multi-jours + captions/scripts + JSON structuré.
  // Le précédent plafond universel de 45 s faisait donc échouer tous les providers.
  const isProfessionalPlan = aiConfig?.planMode === true
    || agentKey === 'planning-nidal'
    || /analyse stratégique|planning stratégique|plan social media professionnel/i.test(
      String(briefData?.format || '') + ' ' + String(briefData?.topic || '')
    );
  const requestTimeoutMs = isProviderTest
    ? 20000
    : isProfessionalPlan
      ? Math.max(150000, Number(process.env.AI_PLAN_TIMEOUT_MS || 0))
      : Math.max(75000, Number(process.env.AI_REQUEST_TIMEOUT_MS || 0));

  const aiFetch = (url, options = {}, timeoutMs) =>
    fetchAiWithTimeout(url, options, timeoutMs ?? requestTimeoutMs);

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

  const systemInstructions = isProviderTest
    ? 'Test technique de connectivité. Réponds uniquement par OK.'
    : agent.prompt;

  // 1. OPENROUTER
  if (provider === 'openrouter') {
    let model = (aiConfig.model || process.env.OPENROUTER_MODEL || 'openrouter/free').trim();
    if (!model || model === 'free') model = 'openrouter/free';

    async function callOpenRouter(selectedModel) {
      const res = await aiFetch(OPENROUTER_URL, {
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
    const response = await aiFetch(OPENAI_URL, {
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

  // 3. GOOGLE GEMINI — Interactions API
  if (provider === 'gemini') {
    const requestedModel = (aiConfig.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
    let model = requestedModel;

    async function callGemini(selectedModel, attemptTimeoutMs = requestTimeoutMs) {
      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions';
      const response = await aiFetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          model: selectedModel,
          store: false,
          input: userPrompt,
          system_instruction: systemInstructions,
          generation_config: {
            temperature: 0.7,
            thinking_level: 'low'
          }
        })
      }, attemptTimeoutMs);

      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }

    const transientGeminiError = (status, message = '') =>
      [429, 500, 502, 503, 504].includes(Number(status))
      || /high demand|overload|temporar|try again later|resource exhausted|rate.?limit|capacity|unavailable|aucun en-tête HTTP|connexion réseau|timed?\s*out|timeout/i.test(String(message));

    const candidates = [requestedModel];
    let response = null;
    let payload = {};
    let output = '';
    let lastGeminiError = '';

    for (let index = 0; index < candidates.length; index++) {
      model = candidates[index];

      try {
        // Le modèle principal 3.8 ne doit pas immobiliser tout un plan lorsqu'il
        // est saturé. Les modèles de secours conservent le budget complet du plan.
        const attemptTimeoutMs = !isProviderTest
          && model === 'gemini-3.8-flash'
          && candidates.length === 1
          ? Math.min(requestTimeoutMs, isProfessionalPlan ? 45000 : 60000)
          : requestTimeoutMs;

        ({ response, payload } = await callGemini(model, attemptTimeoutMs));
        output = extractGeminiInteractionText(payload);
      } catch (error) {
        const transientNetworkFailure = error?.code === 'AI_REQUEST_TIMEOUT'
          || ['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ENETUNREACH', 'EAI_AGAIN', 'ECONNRESET']
            .includes(error?.cause?.code || error?.code || '');

        lastGeminiError = error?.message || String(error);

        if (!isProviderTest && transientNetworkFailure) {
          for (const fallbackModel of ['gemini-3.5-flash-lite', 'gemini-3.7-flash']) {
            if (!candidates.includes(fallbackModel)) candidates.push(fallbackModel);
          }
          continue;
        }

        throw error;
      }

      if (response.ok && output) break;

      lastGeminiError = payload.error?.message
        || payload.errors?.[0]?.message
        || (!response.ok ? `Google Gemini Interactions API ${response.status}` : 'Réponse Gemini vide');

      const suggested = lastGeminiError.match(/use\s+models\/([A-Za-z0-9._-]+)/i)?.[1]
        || lastGeminiError.match(/models\/([A-Za-z0-9._-]+)\s+for the latest/i)?.[1]
        || null;

      if (suggested && !candidates.includes(suggested)) {
        candidates.push(suggested);
      }

      // Les erreurs de capacité sont temporaires : ne jamais faire échouer une
      // génération complète si un autre modèle Gemini officiel peut répondre.
      if (!isProviderTest && transientGeminiError(response.status, lastGeminiError)) {
        for (const fallbackModel of ['gemini-3.5-flash-lite', 'gemini-3.7-flash']) {
          if (!candidates.includes(fallbackModel)) candidates.push(fallbackModel);
        }
        continue;
      }

      // Pour un test fournisseur, on teste volontairement le modèle choisi.
      // Pour les autres erreurs non temporaires, ne pas masquer le vrai message.
      if (isProviderTest || !suggested) break;
    }

    if (!response?.ok || !output) {
      // Dernier filet de sécurité : si une clé OpenRouter est configurée côté
      // serveur, basculer automatiquement au lieu de perdre tout le travail.
      const canFallbackToOpenRouter = !isProviderTest
        && !aiConfig.disableFallback
        && Boolean(process.env.OPENROUTER_API_KEY);

      if (canFallbackToOpenRouter && transientGeminiError(response?.status, lastGeminiError)) {
        console.warn(`Gemini indisponible (${lastGeminiError}). Bascule automatique vers OpenRouter.`);
        return generateEditorialOutput({
          agentKey,
          brand: targetBrand,
          briefData,
          context,
          aiConfig: {
            provider: 'openrouter',
            model: process.env.OPENROUTER_MODEL || 'openrouter/free',
            apiKey: '',
            disableFallback: true,
            planMode: isProfessionalPlan
          }
        });
      }

      throw new Error(lastGeminiError || 'Réponse Gemini vide');
    }

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

  // 4. ALIBABA CLOUD MODEL STUDIO (OpenAI-compatible)
  if (provider === 'alibaba') {
    const model = (aiConfig.model || process.env.ALIBABA_MODEL || 'qwen3.8-flash').trim();
    const baseUrl = String(
      process.env.ALIBABA_BASE_URL ||
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/$/, '');
    const response = await aiFetch(`${baseUrl}/chat/completions`, {
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
    if (!response.ok) throw new Error(payload.error?.message || payload.message || `Alibaba Model Studio API ${response.status}`);
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Réponse Alibaba Model Studio vide');
    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'alibaba',
      isDemo: false,
      agentKey
    };
  }

  // 5. CLOUDFLARE WORKERS AI (OpenAI-compatible)
  if (provider === 'cloudflare') {
    const accountId = await resolveCloudflareAccountId(apiKey);
    const requestedModel = (aiConfig.model || process.env.CLOUDFLARE_MODEL || '@cf/qwen/qwen3.8-27b').trim();
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1`;

    const cloudflareFallbackModels = [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-4-scout-17b-16e-instruct'
    ];

    const transientCloudflareError = (status, message = '') =>
      [408, 429, 500, 502, 503, 504].includes(Number(status))
      || /request timeout|timed?\s*out|timeout|high demand|overload|temporar|capacity|unavailable|resource exhausted/i
        .test(String(message));

    async function callCloudflare(selectedModel, attemptTimeoutMs = requestTimeoutMs) {
      const body = {
        model: selectedModel,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.55,
        max_completion_tokens: isProfessionalPlan ? 5000 : 1800
      };

      // Qwen 3.8 utilise xhigh par défaut sur Workers AI. Pour le planning,
      // forcer low évite de perdre le budget de requête en raisonnement interne.
      if (selectedModel === '@cf/qwen/qwen3.8-27b') {
        body.reasoning_effort = 'low';
      }

      const response = await aiFetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, attemptTimeoutMs);

      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }

    const candidates = [requestedModel];
    if (isProfessionalPlan && !isProviderTest) {
      for (const fallbackModel of cloudflareFallbackModels) {
        if (!candidates.includes(fallbackModel)) candidates.push(fallbackModel);
      }
    }

    let response = null;
    let payload = {};
    let output = '';
    let model = requestedModel;
    let lastError = '';

    for (let index = 0; index < candidates.length; index++) {
      model = candidates[index];

      try {
        const attemptTimeoutMs = isProfessionalPlan && index === 0
          ? Math.min(requestTimeoutMs, 45000)
          : requestTimeoutMs;

        ({ response, payload } = await callCloudflare(model, attemptTimeoutMs));
      } catch (error) {
        lastError = error?.message || String(error);
        const transientNetworkFailure = error?.code === 'AI_REQUEST_TIMEOUT'
          || ['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ENETUNREACH', 'EAI_AGAIN', 'ECONNRESET']
            .includes(error?.cause?.code || error?.code || '');

        if (!isProviderTest && isProfessionalPlan && transientNetworkFailure && index < candidates.length - 1) {
          console.warn(`Cloudflare ${model} timeout réseau; essai ${candidates[index + 1]}`);
          continue;
        }
        throw error;
      }

      output = payload.choices?.[0]?.message?.content
        || payload.result?.choices?.[0]?.message?.content
        || '';

      if (response.ok && output) break;

      lastError = payload.errors?.[0]?.message
        || payload.error?.message
        || payload.message
        || `Cloudflare Workers AI ${response.status}`;

      if (!isProviderTest
        && isProfessionalPlan
        && transientCloudflareError(response.status, lastError)
        && index < candidates.length - 1) {
        console.warn(`Cloudflare ${model} indisponible (${lastError}); essai ${candidates[index + 1]}`);
        continue;
      }

      break;
    }

    if (!response?.ok || !output) {
      throw new Error(lastError || 'Réponse Cloudflare Workers AI vide');
    }

    return {
      output,
      structuredData: parseStructuredEditorial(output, agentKey, targetBrand),
      storyboard: parseStoryboard(output),
      qualityCheck: parseQualityCheck(output),
      model,
      provider: 'cloudflare',
      isDemo: false,
      agentKey
    };
  }

  // 4. ANTHROPIC CLAUDE
  if (provider === 'anthropic') {
    const model = (aiConfig.model || 'claude-3-5-sonnet-20241022').trim();
    const response = await aiFetch(ANTHROPIC_URL, {
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
    const response = await aiFetch(GROQ_URL, {
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
    const response = await aiFetch(DEEPSEEK_URL, {
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

  parts.push(`\n=== VARIATION VISUELLE OBLIGATOIRE ===
- Le Prompt image IA doit être créé SPÉCIFIQUEMENT pour le sujet de cette publication. INTERDICTION de reprendre un prompt générique de classe, bibliothèque ou cour d'école si le sujet ne l'exige pas.
- Chaque nouveau contenu doit avoir un visuel réellement différent des contenus précédents : change au minimum 4 éléments parmi le lieu, l'action, le nombre de personnes, l'âge/groupe, le cadrage, l'angle caméra, la focale, la lumière, les accessoires, l'arrière-plan et la composition.
- Le sujet principal et l'action doivent illustrer directement l'idée du post. Exemple : sciences → expérience concrète ; sport → mouvement réel ; lecture → interaction avec un livre ; créativité → atelier artistique ; rentrée → accueil/arrivée ; technologie → manipulation d'outil numérique.
- Ne recopie jamais mot pour mot le début d'un Prompt image IA déjà présent dans le contexte.
- SCÈNE PAR DÉFAUT INTERDITE : une enseignante / un enseignant debout devant des élèves assis à des tables ou bureaux dans une salle de classe. N'utilise cette scène QUE si le sujet parle explicitement d'un cours en classe ou du métier d'enseignant.
- Évite de commencer systématiquement par "A modern classroom", "A vibrant classroom", "smiling students" ou une formule équivalente.
- Le prompt final doit contenir : sujet précis, action précise, lieu précis, composition, cadrage, lumière, ambiance, détails de décor, palette Nidal, style photographique/illustratif, focale ou rendu, résolution et ratio.
- Pour un calendrier/planning avec plusieurs publications : CHAQUE publication doit avoir son propre Prompt image IA entièrement distinct. Aucun copier-coller entre les jours.
- Si plusieurs prompts sont générés dans la même réponse, varie aussi le type de plan : gros plan, plan moyen, plan large, vue en plongée légère, contre-plongée douce, over-the-shoulder, scène extérieure, scène intérieure, selon le sujet.`);

  if (/post/i.test(format)) {
    parts.push(`- INTERDICTION ABSOLUE DE PRODUIRE UN STORYBOARD OU DES SCÈNES.
- Rédige un POST RÉSEAUX SOCIAUX limpide, complet, percutant et prêt à publier immédiatement.
- Fournis obligatoirement le PROMPT IMAGE IA détaillé (DALL-E 3 / Midjourney) pour générer l'illustration ou la photo.
- Structure obligatoire :
  1. Concept créatif : Titre du post
  2. Prompt image IA : Prompt ultra-détaillé pour Midjourney / DALL-E 3 (description précise de la scène, composition, lumière, couleurs bleu #1746d1, jaune #ffc928, magenta #d91b5c, style photo ou 3D, ratio --ar 4:5)
  3. Idée visuelle : Description concise du visuel et charte graphique
  4. Accroche : 1 phrase percutante d'accroche qui donne envie de lire
  5. Post prêt à publier : Texte complet rédigé avec soin (2-3 courts paragraphes aérés, chaleureux et engageants avec des émojis bienveillants)
  6. Texte principal : [Reprise du texte du post]
  7. Appel à l'action : Question chaleureuse invitant les familles à interagir
  8. Tags : STRICTEMENT 5 HASHTAGS ciblés (ni plus, ni moins)
  9. Contrôle qualité`);
  } else if (/reel|vidéo|video/i.test(format)) {
    const dur = briefData.duration || '30 secondes';
    parts.push(`- Produis un SCRIPT VIDÉO / REEL avec une DURÉE TOTALE DÉCIDÉE : ${dur}.
- Découpe le script en scènes minutées avec timing exact ([00:00 - 00:05], etc.).
- Pour chaque scène : Cadrage, Visuel, Action de Nounou, Voix mot à mot, Texte à l'écran, Transition, Son/SFX.
- Ajoute une légende sociale courte (1 à 2 phrases), le Prompt image de couverture et STRICTEMENT 5 HASHTAGS.`);
  } else if (/carrousel/i.test(format)) {
    const slides = briefData.slideCount || '5 slides';
    parts.push(`- Produis un CARROUSEL structuré avec un NOMBRE DE SLIDES DÉCIDÉ : ${slides}.
- Découpe chaque slide : Slide 1 (Couverture / Hook avec Prompt image IA de couverture), Slides 2 à 4 (Contenu pédagogique par étapes avec 2 puces et idée visuelle), Slide finale (Synthèse & CTA enregistrement).
- Ajoute la légende sociale d'accompagnement complète et STRICTEMENT 5 HASHTAGS.`);
  } else if (/quiz/i.test(format)) {
    parts.push(`- Produis un QUIZ INTERACTIF ludo-éducatif avec Nounou.
- 3 questions claires à choix multiples (A, B, C), bonnes réponses indiquées, explications bienveillantes de Nounou.
- Prompt image de couverture, légende invitant à répondre en commentaire et STRICTEMENT 5 HASHTAGS.`);
  } else if (/story/i.test(format)) {
    parts.push(`- Produis une série de 3 à 4 STORIES INTERACTIVES (format 1080x1920) avec stickers interactifs (sondage, quiz, curseur émoji), visuel par story, et STRICTEMENT 5 HASHTAGS.`);
  } else if (/calendrier|planning/i.test(format)) {
    parts.push(`- Produis un PLANNING / CALENDRIER ÉDITORIAL clair et directement exploitable (pédagogie, vie scolaire, valeurs, conseils, Nidal Junior).
- Pour CHAQUE publication, fournis directement :
  • Date & Heure conseillées
  • Titre & Format
  • Post prêt à publier (texte rédigé complet avec accroche et appel à l'action)
  • Prompt image IA UNIQUE pour ce post (lieu, action, cadrage et composition différents des autres jours)
  • STRICTEMENT 5 HASHTAGS
- Vérifie avant de répondre qu'aucun Prompt image IA du calendrier n'est identique ou quasi-identique à un autre.`);
  } else {
    parts.push(`- Produis un contenu éditorial soigné avec Titre, Chapeau, Corps structuré en 3 parties, Prompt image IA, Appel à l'action et STRICTEMENT 5 HASHTAGS.`);
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

function visualSceneForTopic(title, agentKey = 'studio-junior') {
  const topic = String(title || '').toLowerCase();
  const junior = agentKey === 'studio-junior';

  const rules = [
    {
      re: /science|scientif|expérien|experience|chimie|physique|biolog|laboratoire|lab/,
      scene: junior
        ? 'a child-safe discovery lab with magnifying glasses, colorful liquids, leaves and simple experiment tools, children observing closely, no teacher visible, no desks'
        : 'a real school science laboratory with students actively running a hands-on experiment around lab equipment, close interaction with materials, no teacher posing, no classroom desks'
    },
    {
      re: /robot|technolog|numéri|digital|cod|programm|informat|ia|intelligence artificielle/,
      scene: junior
        ? 'a playful digital discovery corner with floor-level interactive screens, coding toys and building blocks, children exploring technology in motion, no classroom desks'
        : 'a robotics makerspace with students standing around a prototype robot and large digital display, tools and components visible, student-led action, no teacher-at-desk scene'
    },
    {
      re: /lecture|livre|biblioth|lire|conte|histoire/,
      scene: junior
        ? 'a cozy reading nook with floor cushions, picture books opened around one child reading with expressive curiosity, warm intimate composition, no tables'
        : 'a contemporary school library aisle with one student selecting a book while another reads near a window, layered shelves and natural depth, no classroom setup'
    },
    {
      re: /sport|football|basket|athl|motric|mouvement|gym/,
      scene: junior
        ? 'an outdoor movement course with hoops, cones and balance elements, children captured mid-action in a sunny play area'
        : 'an outdoor school sports field with students in dynamic motion during a team drill, energetic candid moment, no posed group'
    },
    {
      re: /art|créativ|dessin|peinture|artist|atelier|couleur/,
      scene: junior
        ? 'a creative studio with easels, large paper sheets, paint marks and children creating standing or on floor mats, tactile handmade atmosphere'
        : 'an art studio with students working at easels and pinning finished pieces on a gallery wall, expressive materials and bold composition'
    },
    {
      re: /musique|chant|théâtre|theatre|scène|scene|spectacle|concert/,
      scene: junior
        ? 'a small school stage with children rehearsing movement and music under soft stage lights, playful expressive performance'
        : 'a school auditorium rehearsal with students on stage presenting or performing, dramatic side lighting and audience seats softly blurred'
    },
    {
      re: /nature|jardin|écolog|environnement|plante|vert/,
      scene: junior
        ? 'a school garden exploration with children kneeling near plants, magnifying glasses and watering cans, vivid natural textures'
        : 'an outdoor school garden project with students examining plants and documenting observations, greenery filling the frame'
    },
    {
      re: /rentrée|accueil|inscription|portes ouvertes|visite|bienvenue/,
      scene: junior
        ? 'the colorful Nidal Junior entrance during arrival, child walking in with a parent, welcoming signage, balloons and natural movement'
        : 'the GS Nidal entrance and reception area during arrival, students and families walking through the campus, architectural perspective and welcoming atmosphere'
    },
    {
      re: /réussite|diplôme|diplome|succès|succes|excellence|prix|cérémonie|ceremonie/,
      scene: junior
        ? 'a joyful achievement moment with a child proudly holding a handmade certificate in a decorated school hall, candid family emotion'
        : 'a student achievement moment on a clean school stage, certificate or project award in hand, confident portrait with audience softly out of focus'
    },
    {
      re: /équipe|equipe|collabor|coopér|cooper|valeur|entraide|leadership/,
      scene: junior
        ? 'a cooperative outdoor game where children build something large together on the ground, teamwork visible through action'
        : 'a student-led teamwork challenge in the courtyard, standing participants solving a practical task together, no desks or teacher-led pose'
    }
  ];

  const match = rules.find(rule => rule.re.test(topic));
  if (match) return match.scene;

  return junior
    ? 'a lively Nidal Junior school moment outside the standard classroom: children moving through a colorful activity zone with topic-specific props, candid action, no teacher standing over tables'
    : 'a contemporary GS Nidal campus scene outside the standard classroom: student-led real activity in a corridor, courtyard, library, lab or project zone chosen to match the topic, candid action, no teacher standing over seated students';
}

function isGenericClassroomPrompt(prompt = '') {
  const text = String(prompt || '').toLowerCase();
  const teacher = /(teacher|enseignant|enseignante|professeur|prof)/.test(text);
  const students = /(student|students|élève|élèves|eleve|eleves|children|enfants)/.test(text);
  const tables = /(table|tables|desk|desks|bureau|bureaux)/.test(text);
  const classroom = /(classroom|classe|salle de classe)/.test(text);
  return teacher && students && (tables || classroom);
}

function buildFallbackImagePrompt(title, agentKey = 'studio-junior') {
  const source = String(title || 'Nidal').trim();
  const seed = [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const scene = visualSceneForTopic(source, agentKey);

  const shots = [
    'wide environmental editorial shot with strong foreground depth',
    'medium candid documentary shot captured at eye level',
    'close storytelling composition focused on hands, faces and the activity',
    'over-the-shoulder composition that places the viewer inside the action',
    'slight top-down editorial composition with graphic spatial organization',
    'low-angle dynamic composition emphasizing movement and confidence'
  ];
  const lights = [
    'warm early-morning natural light',
    'soft diffused daylight with realistic shadows',
    'golden late-afternoon light',
    'clean bright window light with subtle contrast',
    'cinematic side light with natural skin tones',
    'open-shade outdoor light with crisp realistic detail'
  ];
  const shot = shots[seed % shots.length];
  const light = lights[(seed * 3 + 2) % lights.length];

  const base = agentKey === 'studio-junior'
    ? `Nidal Junior visual specifically illustrating "${source}". Scene: ${scene}. ${shot}. ${light}. Nounou appears only if genuinely relevant to the topic, never as a forced decoration. Rich topic-specific props, authentic Moroccan preschool atmosphere, royal blue #1746d1, magenta #d91b5c and yellow #ffc928 accents, premium educational editorial photography / polished 3D hybrid aesthetic, realistic depth, 8k, portrait --ar 4:5.`
    : `Groupe Scolaire Nidal visual specifically illustrating "${source}". Scene: ${scene}. ${shot}. ${light}. Authentic Moroccan private-school atmosphere, student-led action, topic-specific props, no generic teacher-with-students-at-desks composition, royal blue #1746d1, yellow #ffc928 and magenta #d91b5c accents, Canon EOS R5 editorial photography, realistic depth of field, 8k, portrait --ar 4:5.`;

  return base;
}

export function parseStructuredEditorial(text, agentKey = 'studio-junior', defaultBrand = 'nidal-junior') {
  if (!text) return null;

  // Normalize markdown bold/bullets around field labels (e.g. "- **Titre :**" -> "Titre :")
  const cleanText = text
    .replace(/^[\t >*#-]*\*\*([^*:\n]+?)\s*:?\*\*\s*:?[ \t]*/gm, '$1 : ')
    .replace(/^[\t >*#-]+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ0-9 ’'\-_/]+?)\s*:[ \t]*/gm, '$1 : ');

  const find = (re) => {
    const m = cleanText.match(re) || text.match(re);
    return m ? m[1].replace(/^["«]+|["»]+$/g, '').trim() : '';
  };

  const STOP_LABELS = [
    'Concept créatif', 'Titre', 'Prompt image IA', 'Prompt image', 'Prompt Midjourney',
    'Idée visuelle', 'Accroche', 'Post prêt à publier', 'Texte principal', 'Message principal',
    'Information pratique', 'Appel à l’action', 'Appel à l\'action', 'Légende sociale d\'accompagnement',
    'Légende sociale courte', 'Légende & Appel à l\'action', 'Légende d\'accompagnement',
    'Type de contenu', 'Type de publication', 'Type', 'Canal', 'Plateforme',
    'Statut', 'Date proposée', 'Date', 'Auteur', 'Responsable', 'Tags', 'Hashtags',
    'STORYBOARD', 'SCRIPT MINUTÉ', 'SCÈNE 1', 'DÉCOUPAGE', 'QUESTION 1', 'STORY 1',
    'FORMATS VISUELS', 'CONTRÔLE QUALITÉ'
  ].join('|');

  const extractBlock = (labelPattern) => {
    const re = new RegExp(
      `(?:^|\\n)(?:${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${STOP_LABELS})(?:\\s*:|\\b)|\\n===|$)`,
      'i'
    );
    const m = cleanText.match(re);
    return m ? m[1].trim() : '';
  };

  const titre = find(/(?:^|\n)(?:Titre|Concept créatif)\s*:\s*(.+)/i) || 'Contenu éditorial Nidal';
  const typeRaw = find(/(?:^|\n)(?:Type|Type de contenu|Type de publication)\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const statutRaw = find(/(?:^|\n)Statut\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const publicCible = find(/(?:^|\n)Public\s*:\s*(.+)/i) || (agentKey === 'studio-junior' ? 'Enfants et familles' : 'Parents et communauté GS Nidal');
  const objectif = find(/(?:^|\n)(?:Objectif|Objectif pédagogique)\s*:\s*(.+)/i);
  const accroche = find(/(?:^|\n)(?:Accroche|Accroche de Nounou)\s*:\s*(.+)/i);

  const postBlock = extractBlock('Post prêt à publier')
    || extractBlock('Texte principal|Légende sociale d\'accompagnement|Légende d\'accompagnement|Légende sociale courte|Message principal|Résumé');
  const singleLineMessage = find(/(?:^|\n)(?:Post prêt à publier|Texte principal|Message principal|Résumé|Légende sociale|Légende sociale courte)\s*:\s*(.+)/i);
  const infoPratique = find(/(?:^|\n)Information pratique\s*:\s*(.+)/i);
  const cta = find(/(?:^|\n)(?:Appel à l’action|Appel à l'action|Légende & Appel à l'action)\s*:\s*(.+)/i);

  const promptImageBlock = extractBlock('Prompt image IA|Prompt image|Prompt Midjourney \\/ DALL-E|Image prompt')
    || find(/(?:^|\n)(?:Prompt image IA|Prompt image|Prompt Midjourney \/ DALL-E|Image prompt)\s*:\s*(.+)/i)
    || find(/(?:^|\n)Idée visuelle\s*:\s*(.+)/i);

  const defaultPromptImage = buildFallbackImagePrompt(titre, agentKey);
  const promptImage = !promptImageBlock || isGenericClassroomPrompt(promptImageBlock)
    ? defaultPromptImage
    : promptImageBlock;

  const auteur = find(/(?:^|\n)(?:Auteur|Responsable)\s*:\s*(.+)/i) || 'Équipe Nidal';
  const dateRaw = find(/(?:^|\n)(?:Date proposée|Date)\s*:\s*(.+)/i);
  const tagsRaw = find(/(?:^|\n)(?:Tags|Hashtags)\s*:\s*(.+)/i);
  const canal = find(/(?:^|\n)(?:Canal|Plateforme)\s*:\s*(.+)/i) || 'Instagram + Facebook';

  const validTypes = ['article', 'interview', 'dossier', 'breve', 'chronique', 'infographie', 'quiz', 'post', 'carrousel', 'video', 'story', 'reel'];
  const format = validTypes.includes(typeRaw) ? (typeRaw === 'reel' ? 'video' : typeRaw) : 'post';
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

  // Construire un postComplet propre, aéré et prêt à copier-coller (sans métadonnées techniques)
  let postComplet = postBlock || singleLineMessage || '';
  if (!postComplet) {
    const bodyParts = [];
    if (accroche) bodyParts.push(accroche);
    if (infoPratique) bodyParts.push(`📍 ${infoPratique}`);
    if (cta) bodyParts.push(`👉 ${cta}`);
    postComplet = bodyParts.join('\n\n') || titre;
  } else {
    // Si l'accroche n'est pas déjà au début du postComplet, on l'ajoute
    if (accroche && !postComplet.toLowerCase().includes(accroche.slice(0, 25).toLowerCase())) {
      postComplet = `${accroche}\n\n${postComplet}`;
    }
    if (cta && !postComplet.toLowerCase().includes(cta.slice(0, 20).toLowerCase())) {
      postComplet = `${postComplet}\n\n👉 ${cta}`;
    }
  }

  return {
    brand: defaultBrand,
    titre: titre.slice(0, 180),
    format,
    type: format,
    statut,
    publicCible,
    objectif: objectif || 'Valoriser les apprentissages et l’excellence',
    accroche: accroche || titre,
    message: postComplet,
    postComplet,
    imagePrompt: promptImage,
    promptImage,
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
  const format = String(briefData.format || 'post').toLowerCase();

  // 1. FORMAT POST RÉSEAUX SOCIAUX
  if (/post/i.test(format)) {
    return `Concept créatif : ${topic}
Prompt image IA : A delightful modern kindergarten classroom corner, Nounou the friendly 5-year-old boy mascot sitting comfortably on a soft colorful rug holding a large illustrated children's storybook, joyful and warm expression, soft natural sunlight streaming through large windows, colorful wooden bookshelves filled with books in the background, educational wooden toys, clean corporate school palette of royal blue #1746d1, cheerful magenta #d91b5c, and sunny yellow #ffc928, photorealistic style, high quality photography, soft depth of field, 8k resolution, portrait aspect ratio --ar 4:5
Idée visuelle : Nounou assis dans le coin bibliothèque avec un grand livre ouvert, regard curieux et sourire bienveillant. Palette officielle bleu, magenta et jaune, logo Nidal Junior officiel en haut à gauche.
Accroche : Et si aujourd'hui, un livre devenait notre plus beau voyage ? 📖✨
Post prêt à publier :
Et si aujourd'hui, un livre devenait notre plus beau voyage ? 📖✨

Chaque jour à Nidal Junior, nos petits explorateurs découvrent que tourner une page, c’est s’envoler vers des univers merveilleux ! Accompagnés par Nounou, ils apprennent à écouter les histoires, à poser des questions et à enrichir leur imaginaire dans la joie et la bienveillance. 🌈

Que ce soit avant la sieste ou pendant les ateliers d'éveil du matin, le rituel sacré de la lecture développe le vocabulaire, apaise les émotions et nourrit la curiosité naturelle des enfants dès la petite section. 💛

💬 Quel est le livre ou le conte préféré de votre enfant en ce moment ? Partagez son titre en commentaire, Nounou vous répondra ! 👇
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
Prompt image IA : Bright and cheerful kindergarten reading corner, Nounou the cute 5-year-old boy mascot holding a giant magnifying glass next to an open magical popup book with glowing stars and animals, royal blue #1746d1, vibrant magenta #d91b5c and sunny yellow #ffc928 color palette, Pixar-inspired 3D editorial illustration, warm lighting, 8k, Instagram carousel cover --ar 4:5
Post prêt à publier :
Comment donner le goût de la lecture aux tout-petits dès la maternelle ? 📖✨

Développer l’amour des livres commence bien avant de savoir lire ! À Nidal Junior, Nounou accompagne nos élèves chaque jour autour de 3 rituels tout doux :
1️⃣ 10 minutes d’histoire calme chaque soir sans écran
2️⃣ Jouer avec les voix et pointer les images pour éveiller le langage
3️⃣ Laisser les livres à hauteur d’enfant pour encourager l’autonomie

💾 Enregistrez ce carrousel pour vos lectures du soir et dites-nous en commentaire quel est le livre préféré de votre enfant ! 💛👇
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
Prompt image IA : Colorful and playful educational quiz illustration for children, Nounou the cheerful 5-year-old boy mascot wearing an explorer hat in a sunny garden with a cute owl, a blooming flower, and artist paintbrushes, royal blue #1746d1, magenta #d91b5c and yellow #ffc928 accents, bright 3D illustration style, 8k --ar 4:5
Post prêt à publier :
🐾 LE GRAND QUIZ DÉCOUVERTE DE NOUNOU ! 🌟

Coucou les champions ! Aujourd'hui, on joue ensemble autour de la nature et des couleurs. Demandez à votre enfant de répondre à ces 3 devinettes :

1️⃣ Quel animal se réveille la nuit et a de grands yeux ronds pour voir dans le noir ?
A) L'écureuil malin 🐿️ | B) La chouette protectrice 🦉 | C) Le poussin joyeux 🐥

2️⃣ De quoi a besoin une petite graine pour devenir une belle fleur ?
A) D'eau, de terre et de soleil ☀️ | B) De chocolat 🍫 | C) Seulement du vent 🌬️

3️⃣ Quelle couleur obtient-on en mélangeant du bleu et du jaune ?
A) Le violet 💜 | B) Le vert 💚 | C) L'orange 🧡

💬 Écrivez les réponses de votre enfant en commentaire (ex : 1B, 2A, 3B), Nounou lui enverra une médaille d'honneur ! 🏅👇
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
Prompt image IA : Vertical Instagram story background, Nounou the joyful 5-year-old boy mascot waving with his school backpack at the sunny entrance of Nidal Junior kindergarten, bright colors royal blue #1746d1, magenta #d91b5c and yellow #ffc928, clean space at center for story stickers, 8k --ar 9:16
Post prêt à publier :
☀️ Bienvenue à Nidal Junior avec Nounou !
Aujourd'hui en Story :
🎨 L'atelier créatif avec le groupe des Papillons
🪄 La devinette du mot magique ("MERCI !")
💛 Découvrez notre univers bienveillant sur gsnidal.ma !
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
Prompt image IA : Vertical Reel cover thumbnail, Nounou the cheerful 5-year-old boy mascot sitting in a bright colorful kindergarten reading corner opening a magical glowing storybook, warm sunlight, royal blue #1746d1, magenta #d91b5c and yellow #ffc928 palette, 8k resolution --ar 9:16
Post prêt à publier :
Le pouvoir magique des histoires avec Nounou ! 📖✨

Chaque jour à Nidal Junior, ouvrir un livre est une porte magique vers l'imaginaire, le vocabulaire et la confiance en soi. Lire un tout petit peu chaque jour, c'est devenir plus grand et plus curieux ! 🌈💛

💬 Et vous, quelle histoire lisez-vous ce soir avec votre enfant ? Racontez-la-nous en commentaire ! 👇
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
Charte graphique : Couleurs dominantes bleu (#1746d1), magenta (#d91b5c), jaune (#ffc928). Logo officiel sans retouche. Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

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
  const topic = briefData.topic || briefData.brief || 'La méthode Active Learning : Favoriser l\'engagement des élèves';
  const format = String(briefData.format || 'post_institutionnel').toLowerCase();

  // 1. FORMAT POST INSTITUTIONNEL
  if (/post/i.test(format)) {
    return `Concept créatif : ${topic}
Prompt image IA : A modern and prestigious private school campus in Morocco, bright sunlit classroom, smiling Moroccan students in smart uniforms actively collaborating on a hands-on project with an inspiring teacher, natural warm sunlight, royal blue #1746d1, warm gold #ffc928, and magenta #d91b5c color harmony, high-end editorial photography, Canon EOS R5 50mm f/1.8 lens, sharp focus, 8k resolution, portrait aspect ratio --ar 4:5
Idée visuelle : Composition institutionnelle sobre et haut de gamme. Dégradé bleu profond (#1746d1), typographie dorée/jaune, logo officiel Nidal net en haut à gauche. Marge de sécurité respectée et slogan « PLUS QU’UNE ÉCOLE, UN AVENIR » en pied de page.
Accroche : À Nidal, nous croyons que la réussite scolaire se bâtit chaque jour sur la confiance et l'apprentissage actif.
Post prêt à publier :
À Nidal, nous croyons que la réussite scolaire se bâtit chaque jour sur la confiance et l'apprentissage actif. 🏛️✨

Grâce à notre approche pédagogique active (Active Learning), chaque élève devient pleinement acteur de ses découvertes : manipuler, questionner, débattre et expérimenter en classe permet d'ancrer durablement les savoirs tout en cultivant l'esprit critique et l'autonomie.

De la maternelle au lycée, nos enseignants accompagnent chaque enfant avec exigence et bienveillance autour de nos quatre piliers : Discipline, Confiance, Progrès et Réussite.

📍 Nos équipes d'orientation et de direction sont à votre écoute pour échanger sur le projet éducatif de votre enfant.
👉 Rendez-vous sur gsnidal.ma pour planifier votre visite et rencontrer notre équipe éducative !
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
Charte graphique : Couleurs dominantes bleu (#1746d1), magenta (#d91b5c), jaune (#ffc928). Logo officiel sans retouche. Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

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
Prompt image IA : Clean modern architectural facade and bright classroom of a prestigious Moroccan private school, warm sunlight, royal blue #1746d1 and gold #ffc928 editorial graphic overlay space, smiling confident students, Canon EOS R5 editorial photography, 8k --ar 4:5
Post prêt à publier :
Comment préparons-nous nos élèves à réussir leur avenir avec sérénité ? 🏛️✨

Au Groupe Scolaire Nidal, l'excellence académique est indissociable de l'épanouissement personnel. Notre méthode éducative repose sur 4 piliers vécus au quotidien :
1️⃣ La discipline bienveillante : un cadre rassurant et équitable
2️⃣ La confiance en soi : valoriser chaque progrès individuel
3️⃣ Le progrès continu : un suivi personnalisé avec les familles
4️⃣ La réussite partagée : préparer les citoyens de demain

💾 Enregistrez ce carrousel et rendez-vous sur gsnidal.ma pour découvrir notre projet pédagogique !
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

  // 3. FORMAT CALENDRIER ÉDITORIAL (AVEC VRAIS POSTS RÉDIGÉS ET PROMPTS IMAGES)
  return `Concept créatif : ${topic}
Prompt image IA : Bright modern classroom at Groupe Scolaire Nidal in Morocco, enthusiastic students raising hands and collaborating around an interactive project with a warm inspiring teacher, natural sunlight streaming through windows, royal blue #1746d1, gold #ffc928 and magenta #d91b5c color accents, Canon EOS R5 50mm f/1.8 editorial photography, 8k --ar 4:5
Post prêt à publier :
Apprendre en étant acteur de sa réussite : c'est la force de l'Active Learning au Groupe Scolaire Nidal ! 🎓✨

Dans nos salles de classe, les élèves ne se contentent pas d'écouter : ils expérimentent, questionnent, travaillent en projet et construisent leurs propres raisonnements aux côtés d'enseignants passionnés. Cette pédagogie active éveille la curiosité, renforce la motivation et développe une confiance durable.

👉 Découvrez notre projet éducatif complet et prenez rendez-vous sur gsnidal.ma !
Type de contenu : post
Canal : Instagram + Facebook + LinkedIn
Statut : brouillon
Date proposée : ${briefData.targetDate || 'Date à confirmer'}
Auteur : Équipe Nidal
Tags : #GSNidal #PedagogieActive #ExcellenceEducative #MotivationScolaire #AvenirDesEleves

================================================================================
POSTS DU CALENDRIER PRÊTS À PUBLIER + PROMPTS IMAGES IA
================================================================================

📌 POST 1 — PÉDAGOGIE : La méthode Active Learning
📱 Post prêt à publier :
Apprendre en étant acteur de sa réussite : c'est la force de l'Active Learning au Groupe Scolaire Nidal ! 🎓✨
Dans nos classes, les élèves expérimentent, débattent et réalisent des projets concrets qui donnent du sens à chaque leçon. Résultat : plus d'engagement, une meilleure mémorisation et le plaisir d'apprendre chaque matin !
👉 Découvrez notre approche pédagogique sur gsnidal.ma
#GSNidal #PedagogieInnovante #ActiveLearning #MotivationScolaire #ReussiteScolaire
🎨 Prompt image IA :
Bright modern classroom in Morocco, students collaborating on a science and reading table project with an encouraging teacher, warm morning sunlight, royal blue #1746d1 and yellow #ffc928 school accents, photorealistic editorial photography, 8k --ar 4:5

📌 POST 2 — VALEURS : La discipline bienveillante
📱 Post prêt à publier :
La discipline bienveillante : grandir dans un cadre rassurant, juste et structurant. 🤝🏛️
Au Groupe Scolaire Nidal, nous croyons que l'exigence et l'écoute marchent main dans la main. Un cadre clair permet à chaque élève de se sentir en sécurité, de respecter les autres et de donner le meilleur de lui-même.
💬 Quelle valeur compte le plus pour l'épanouissement de votre enfant ? Partagez votre avis en commentaire !
#GSNidal #ValeursEducatives #DisciplineBienveillante #ConfianceEnSoi #ClimatScolaire
🎨 Prompt image IA :
Warm and respectful interaction between a smiling school teacher and a young student in uniform in a bright modern school courtyard, soft golden sunlight, royal blue and gold color palette, authentic editorial portrait, 8k --ar 4:5

📌 POST 3 — NIDAL JUNIOR : Le plaisir de lire avec Nounou
📱 Post prêt à publier :
Et si aujourd'hui, un livre devenait notre plus beau voyage ? 📖🧸
Aux côtés de Nounou, nos petits explorateurs de maternelle s'éveillent chaque jour à la magie des contes, enrichissent leur vocabulaire et développent leur imaginaire dans la joie !
👉 Quel est le livre préféré de votre enfant en ce moment ? Dites-le-nous en commentaire !
#GSNidal #NidalJunior #PlaisirDeLire #MaternelleMaroc #GrandirEnsemble
🎨 Prompt image IA :
Cozy colorful kindergarten reading corner, Nounou the cute 5-year-old boy mascot sitting on a soft rug holding an open illustrated storybook, warm sunlight, wooden bookshelves, royal blue #1746d1, magenta #d91b5c and yellow #ffc928, 3D/photorealistic style, 8k --ar 4:5

📌 POST 4 — CONSEILS PARENTS : 5 astuces pour une routine du soir sereine
📱 Post prêt à publier :
Comment transformer les devoirs et la routine du soir en un moment serein ? ⏳💡
Voici les 5 conseils de nos enseignants :
1️⃣ Un coin calme et rangé dédié au travail
2️⃣ 20 minutes de concentration puis une courte pause
3️⃣ Valoriser l'effort plutôt que la seule note
4️⃣ Préparer le cartable ensemble la veille
5️⃣ Éteindre les écrans 1h avant le coucher pour un sommeil réparateur
💾 Enregistrez ce post pratique et partagez vos astuces en commentaire !
#GSNidal #ConseilsAuxParents #GestionDuTemps #Coeducation #ReussiteEducative
🎨 Prompt image IA :
Cozy warm home study desk in the evening, a parent and child smiling together over an open notebook, warm desk lamp, tidy school supplies, calm and encouraging atmosphere, editorial lifestyle photography, 8k --ar 4:5

CONTRÔLE QUALITÉ
Informations vérifiées : Posts complets rédigés et prompts images IA fournis pour chaque publication, Slogan « PLUS QU’UNE ÉCOLE, UN AVENIR » respecté.
Informations à confirmer : Dates définitives de publication.
Conformité éditoriale : Conforme.
Conformité visuelle : Conforme.
Autorisation d’image nécessaire : Non.
Prêt à enregistrer : Oui
Prêt à publier : Non (validation humaine requise)`;
}
