const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const SYSTEM_INSTRUCTIONS = `Tu es l’agent officiel de création et de gestion éditoriale de Nidal Junior, le magazine jeunesse du Groupe Scolaire Nidal.

MISSION
Tu aides l’équipe à imaginer, planifier, rédiger et enregistrer des contenus éditoriaux dans l’application :
https://nidal.myskillscloud.com/#agent

Tu travailles principalement en français avec un ton positif, rassurant, pédagogique, professionnel et adapté aux enfants ainsi qu’à leurs parents.

TYPES DE CONTENUS AUTORISÉS
- article
- interview
- dossier
- breve
- chronique
- infographie
- quiz

STATUTS AUTORISÉS
- brouillon : idée ou première version
- en-cours : contenu en cours de préparation
- relecture : contenu terminé à valider
- publie : contenu validé et publié

MÉTHODE DE TRAVAIL
Pour chaque demande :

1. Identifie le sujet, le public, l’objectif, le canal de publication et l’appel à l’action.
2. Vérifie si un contenu similaire existe déjà afin d’éviter les doublons.
3. Si une information indispensable manque, pose une seule question précise.
4. Si aucune information essentielle ne manque, avance avec des hypothèses raisonnables.
5. Propose une accroche courte, naturelle et mémorisable.
6. Rédige un contenu clair, structuré et adapté à l’âge du public.
7. Prépare les informations nécessaires à l’enregistrement dans l’application.
8. Vérifie le résultat après toute création ou modification.

FICHE À ENREGISTRER
Chaque contenu doit comporter :

- Titre : clair, précis et engageant, 180 caractères maximum.
- Type : une valeur exacte parmi les sept types autorisés.
- Statut : une valeur exacte parmi les quatre statuts autorisés.
- Auteur : utiliser « Équipe Nidal » si aucun auteur n’est fourni.
- Date de publication : uniquement si elle est communiquée ou validée.
- Description : résumé exploitable précisant l’angle, le public et le message principal.
- Tags : entre 3 et 8 mots-clés courts et pertinents.

FORMAT DE PRÉPARATION
Avant l’enregistrement, structure toujours la proposition ainsi :

Titre :
Type :
Statut :
Public :
Objectif :
Accroche :
Description :
Auteur :
Date de publication :
Tags :
Appel à l’action :

RÈGLES ÉDITORIALES
- Mets en avant l’apprentissage, la discipline, la confiance, le progrès et la réussite.
- Utilise un vocabulaire simple, vivant et pédagogique.
- Évite le jargon, les formulations artificielles et les promesses excessives.
- N’invente jamais une date, un tarif, un résultat scolaire, une distinction, un témoignage ou une information administrative.
- Ne présente jamais un contenu comme « publié » sans validation explicite.
- Respecte la vie privée des élèves et des familles.
- Pour les mineurs, n’utilise aucune donnée personnelle ni image identifiable sans confirmation des autorisations nécessaires.
- Ne révèle jamais un mot de passe, une chaîne PostgreSQL, une clé d’API ou une donnée technique secrète.

GESTION DE L’APPLICATION
- Lorsqu’on demande explicitement « crée », « ajoute », « planifie » ou « enregistre », effectue l’action dans l’application.
- Lorsqu’on demande seulement une idée, une proposition ou un brouillon, prépare le contenu sans l’enregistrer.
- Ne supprime jamais un contenu sans confirmation explicite.
- Ne réinitialise jamais la base et n’importe jamais une sauvegarde sans autorisation explicite.
- Ne crée pas automatiquement de données de démonstration.
- Après chaque action, confirme précisément ce qui a été créé ou modifié.
- En cas d’erreur, explique clairement le problème sans prétendre que l’opération a réussi.

CRÉATION POUR LES RÉSEAUX SOCIAUX
Lorsqu’un contenu social complet est demandé, fournis dans cet ordre :

1. Concept créatif
2. Texte du visuel vertical Instagram/Story, format 1080 × 1920
3. Texte du visuel horizontal Facebook, format 1200 × 630
4. Légende prête à publier
5. Appel à l’action
6. Entre 5 et 10 hashtags ciblés
7. Contrôle de conformité

IDENTITÉ VISUELLE
Tout visuel destiné au Groupe Scolaire Nidal doit prévoir :

- le logo officiel Nidal en haut à gauche, sans le redessiner ni le déformer ;
- une palette dominée par le bleu, le magenta et le jaune de la marque ;
- une composition lisible avec des bulles, post-its, aplats ou accents adaptés ;
- la liste verticale « DISCIPLINE, CONFIANCE, PROGRÈS, RÉUSSITE » en haut à droite ;
- le pied de page « @GSNIDAL · GSNIDAL.MA » ;
- le slogan « PLUS QU’UNE ÉCOLE, UN AVENIR ».

Si le générateur ne peut pas reproduire fidèlement le logo ou les textes, réserve leurs emplacements et indique qu’ils doivent être ajoutés manuellement depuis les fichiers officiels.

RÉPONSE APRÈS UNE ACTION
Termine par un compte rendu court :

Action effectuée :
Contenu concerné :
Statut :
Date planifiée :
Résultat :
Élément restant à valider :`;

const BRAND_CONTEXT = {
  nidal: 'Établissement Nidal Privé (collège/lycée/direction). Valeurs : discipline, confiance, progrès, réussite.',
  'nidal-junior': 'Nidal Junior, magazine jeunesse et école maternelle pour les enfants de 3 à 6 ans et leurs parents. Ton chaleureux, simple, positif et pédagogique. Nounou est un petit garçon-guide de 4 à 5 ans.'
};

const TASKS = {
  article: 'Rédige un article pédagogique structuré (introduction, 2 à 3 sections captivantes, conclusion) avec un vocabulaire accessible.',
  interview: 'Rédige une interview vivante (questions/réponses) avec un élève, enseignant ou parent, valorisant l’apprentissage.',
  dossier: 'Prépare un dossier thématique complet avec sous-parties éducatives et conseils pratiques.',
  breve: 'Rédige une brève concise et percutante (1 à 2 courts paragraphes) pour annoncer une activité ou un apprentissage.',
  chronique: 'Rédige une chronique inspirante autour de la vie de classe, d’une anecdote ou d’une découverte.',
  infographie: 'Conçois la structure textuelle d’une infographie : chiffres clés, étapes pas à pas et repères visuels.',
  quiz: 'Crée un quiz ludo-éducatif de 3 à 5 questions adaptées avec choix, réponses et explications bienveillantes.',
  social: 'Fournis un contenu social complet respectant l’ordre requis : 1. Concept créatif, 2. Texte vertical Story (1080 × 1920), 3. Texte horizontal Facebook (1200 × 630), 4. Légende, 5. CTA, 6. Hashtags, 7. Contrôle de conformité.',
  post: 'Produis une accroche courte, une légende Facebook/Instagram prête à publier, un appel à l’action et 7 hashtags ciblés.',
  photo_prompt: 'Produis un prompt visuel détaillé respectant la charte (palette bleu, magenta, jaune, logo officiel en haut à gauche, pied de page @GSNIDAL · GSNIDAL.MA).',
  video_prompt: 'Produis un prompt vidéo structuré : scène, mouvements, cadrage, voix off naturelle, contraintes de marque.',
  weekly_plan: 'Produis un planning éditorial de 7 jours avec format, public, angle, accroche, objectif et KPI principal.',
  insight_analysis: 'Analyse les chiffres fournis, distingue faits et hypothèses, identifie 3 enseignements et propose 3 actions testables.'
};

export function agentConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

export function getAiProvider() {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

export async function generateAgentOutput({ brand = 'nidal-junior', task = 'article', brief, context = '' }) {
  const isConfigured = agentConfigured();
  const demo = process.env.DEMO_MODE === 'true' && !isConfigured;
  if (demo || !isConfigured) {
    return { output: demoOutput({ brand, task, brief }), model: 'demo-template', isDemo: true };
  }

  const brandNote = BRAND_CONTEXT[brand] || BRAND_CONTEXT['nidal-junior'];
  const taskPrompt = TASKS[task] ? `Consigne spécifique pour ce type de production :\n${TASKS[task]}` : '';
  const instructions = `${SYSTEM_INSTRUCTIONS}\n\nContexte de marque active : ${brandNote}\n\n${taskPrompt}`;
  const userPrompt = `Brief : ${brief}\n\nContexte disponible : ${context || 'Aucun'}`;

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
            { role: 'system', content: instructions },
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
        console.warn(`OpenRouter a suggere le slug ${suggestedModel}, nouvelle tentative automatique...`);
        const retry = await callOpenRouter(suggestedModel);
        if (retry.res.ok && retry.data.choices?.[0]?.message?.content) {
          return { output: retry.data.choices[0].message.content, model: suggestedModel, provider: 'openrouter', isDemo: false };
        }
      }
      throw new Error(errMsg);
    }

    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error('Reponse OpenRouter vide');
    return { output, model, provider: 'openrouter', isDemo: false };
  }

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
        { role: 'system', content: instructions },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI API ${response.status}`);
  const output = payload.choices?.[0]?.message?.content;
  if (!output) throw new Error('Reponse OpenAI vide');
  return { output, model, provider: 'openai', isDemo: false };
}

export function shouldAutoSave(brief = '') {
  const normalized = String(brief).toLowerCase();
  return /\b(crée|cree|créer|creer|ajoute|ajouter|planifie|planifier|enregistre|enregistrer)\b/i.test(normalized);
}

export function parseStructuredContent(text, defaultBrand = 'nidal-junior') {
  if (!text) return null;
  const findField = (regex) => {
    const m = text.match(regex);
    return m ? m[1].trim() : '';
  };

  const titre = findField(/(?:^|\n)Titre\s*:\s*(.+)/i) || '';
  const typeRaw = findField(/(?:^|\n)Type\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const statutRaw = findField(/(?:^|\n)Statut\s*:\s*([a-zA-Z0-9_\-]+)/i).toLowerCase();
  const publicCible = findField(/(?:^|\n)Public\s*:\s*(.+)/i);
  const objectif = findField(/(?:^|\n)Objectif\s*:\s*(.+)/i);
  const accroche = findField(/(?:^|\n)Accroche\s*:\s*(.+)/i);
  const description = findField(/(?:^|\n)Description\s*:\s*(.+)/i);
  const auteur = findField(/(?:^|\n)Auteur\s*:\s*(.+)/i) || 'Équipe Nidal';
  const datePubRaw = findField(/(?:^|\n)Date de publication\s*:\s*(.+)/i);
  const tagsRaw = findField(/(?:^|\n)Tags\s*:\s*(.+)/i);
  const cta = findField(/(?:^|\n)Appel à l’action\s*:\s*(.+)/i);

  const allowedTypes = ['article', 'interview', 'dossier', 'breve', 'chronique', 'infographie', 'quiz', 'post', 'carrousel', 'video', 'story'];
  const type = allowedTypes.includes(typeRaw) ? typeRaw : 'article';

  const allowedStatuses = ['brouillon', 'en-cours', 'relecture', 'publie', 'planifie'];
  const statut = allowedStatuses.includes(statutRaw) ? statutRaw : 'brouillon';

  const datePublication = /^\d{4}-\d{2}-\d{2}$/.test(datePubRaw) ? datePubRaw : '';

  return {
    brand: defaultBrand,
    titre: (titre || 'Nouvelle publication éditoriale').slice(0, 180),
    format: type,
    type,
    statut,
    publicCible,
    objectif: objectif || description || 'Accompagner les élèves et informer les familles',
    accroche: accroche || titre,
    description: description || text.slice(0, 300),
    message: text,
    auteur,
    responsable: auteur,
    tags: tagsRaw ? tagsRaw.split(/[,#\s]+/).filter(Boolean) : [],
    cta,
    datePublication,
    validation: statut === 'publie' ? 'approuve' : 'a-valider'
  };
}

function demoOutput({ brand, task, brief }) {
  const label = brand === 'nidal' ? 'Groupe Scolaire Nidal' : 'Nidal Junior';
  const validMagazineTypes = ['article', 'interview', 'dossier', 'breve', 'chronique', 'infographie', 'quiz'];
  const type = validMagazineTypes.includes(task) ? task : (task === 'social' || task === 'post' ? 'article' : (task === 'video_prompt' ? 'chronique' : (task === 'photo_prompt' ? 'infographie' : 'article')));
  const cleanBrief = brief || 'Activités pédagogiques et découvertes des élèves';

  if (task === 'social' || task === 'post') {
    return `Titre : Les petites victoires du quotidien chez ${label}
Type : article
Statut : brouillon
Public : Enfants et parents
Objectif : Mettre en avant la curiosité, l'effort et la bienveillance
Accroche : Grandir, c’est célébrer chaque petite victoire pas à pas !
Description : Focus sur les découvertes quotidiennes et l'éveil des élèves, valorisant la confiance et le progrès.
Auteur : Équipe Nidal
Date de publication : 
Tags : #NidalJunior, #Education, #Confiance, #Progres, #Apprentissage
Appel à l’action : Racontez-nous en commentaire le dernier petit défi relevé par votre enfant !

CRÉATION POUR LES RÉSEAUX SOCIAUX
1. Concept créatif : Une mise en scène joyeuse et colorée célébrant un apprentissage réussi avec Nounou.
2. Texte du visuel vertical Instagram/Story, format 1080 × 1920 : "Aujourd'hui, j'ai réussi tout seul !"
3. Texte du visuel horizontal Facebook, format 1200 × 630 : "Chaque jour est une aventure d'apprentissage à Nidal Junior."
4. Légende prête à publier :
${cleanBrief}
Chaque découverte est une occasion d'apprendre avec confiance et sérénité. Bravo à nos petits explorateurs !
5. Appel à l’action : Encouragez nos élèves avec un mot doux en commentaire !
6. Hashtags : #GSNidal #NidalJunior #EducationJeunesse #ConfianceEnSoi #ReussiteScolaire #MaternelleMaroc #ApprendreEnsemble
7. Contrôle de conformité : Logo officiel en haut à gauche, liste verticale DISCIPLINE, CONFIANCE, PROGRÈS, RÉUSSITE réservée en haut à droite, pied de page @GSNIDAL · GSNIDAL.MA.

Action effectuée : Préparation du contenu social
Contenu concerné : Les petites victoires du quotidien chez ${label}
Statut : brouillon
Date planifiée : Non définie
Résultat : Proposition complète prête pour validation
Élément restant à valider : Relecture éditoriale et date de publication`;
  }

  return `Titre : ${cleanBrief.slice(0, 100)} - ${label}
Type : ${type}
Statut : brouillon
Public : Enfants et familles
Objectif : Mettre en avant l'apprentissage, la discipline, la confiance, le progrès et la réussite
Accroche : Une nouvelle occasion d’apprendre, de progresser et de grandir ensemble.
Description : ${cleanBrief}. Contenu structuré valorisant l'éveil, l'autonomie et le respect du rythme de chaque enfant.
Auteur : Équipe Nidal
Date de publication : 
Tags : #GSNidal, #NidalJunior, #Education, #Apprentissage, #Confiance, #Progres, #Reussite
Appel à l’action : Quel aspect souhaitez-vous découvrir en premier avec votre enfant ?

Action effectuée : Préparation de la fiche éditoriale
Contenu concerné : ${cleanBrief.slice(0, 80)}
Statut : brouillon
Date planifiée : Non définie
Résultat : Fiche conforme enregistrable dans l’application
Élément restant à valider : Relecture par l’équipe et confirmation de la date`;
}
