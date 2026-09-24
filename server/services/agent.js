const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const BRAND_CONTEXT = {
  nidal: 'Etablissement Nidal Prive. Ton professionnel, rassurant et pedagogique. Valeurs : discipline, confiance, progres, reussite.',
  'nidal-junior': 'Nidal Junior, maternelle pour les enfants de 3 a 6 ans. Ton chaleureux, simple, positif et pedagogique. Nounou est un petit garcon-guide de 4 a 5 ans. Proteger strictement les donnees et l’image des mineurs.'
};

const TASKS = {
  post: 'Produis une accroche courte, une legende Facebook/Instagram, un appel a l’action et 7 hashtags cibles.',
  photo_prompt: 'Produis un prompt detaille pour generer une photo ou illustration respectant la charte bleu, magenta et jaune. Aucun faux logo ni texte genere dans l’image.',
  video_prompt: 'Produis un prompt video structure : scene, mouvements, cadrage, lumiere, texte voix, contraintes de continuite et elements a eviter.',
  weekly_plan: 'Produis un planning de 7 jours avec format, public, angle, accroche, objectif et KPI principal.',
  insight_analysis: 'Analyse les chiffres fournis, distingue faits et hypotheses, identifie 3 enseignements et propose 3 actions testables.'
};

export function agentConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

export function getAiProvider() {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

export async function generateAgentOutput({ brand, task, brief, context = '' }) {
  const isConfigured = agentConfigured();
  const demo = process.env.DEMO_MODE === 'true' && !isConfigured;
  if (demo || !isConfigured) {
    return { output: demoOutput({ brand, task, brief }), model: 'demo-template', isDemo: true };
  }

  const instructions = `Tu es Studio Contenu Nidal. ${BRAND_CONTEXT[brand] || BRAND_CONTEXT['nidal-junior']} ${TASKS[task] || TASKS.post} Toute sortie doit etre en francais, prete a valider et ne doit jamais inventer de faits. Termine par une courte checklist de conformite.`;
  const userPrompt = `Brief : ${brief}\nContexte disponible : ${context || 'Aucun'}`;

  if (process.env.OPENROUTER_API_KEY) {
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'https://gsnidal.ma',
        'X-Title': 'Nidal Content Hub',
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
    if (!response.ok) throw new Error(payload.error?.message || `OpenRouter API ${response.status}`);
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

function demoOutput({ brand, task, brief }) {
  const label = brand === 'nidal' ? 'Nidal' : 'Nidal Junior';
  if (task === 'video_prompt') return `PROMPT VIDEO - ${label}\n\nScene : ${brief}\nPersonnage ou sujet principal centre, mouvements naturels et camera stable.\nDirection : ambiance positive, pedagogique et rassurante. Palette bleu, magenta et jaune.\nVoix : francais clair, rythme naturel, phrases courtes.\nContraintes : conserver les visages, tenues et proportions ; aucun faux logo ; aucun texte genere dans l’image ; aucun mineur identifiable sans autorisation.\n\nA valider : message, duree, voix, autorisations, logo officiel et pied de page.`;
  if (task === 'photo_prompt') return `PROMPT PHOTO - ${label}\n\nCreer un visuel autour de : ${brief}. Composition claire, sujet lisible, lumiere douce, palette bleu-magenta-jaune, espace reserve en haut a gauche pour le logo officiel et en bas pour le pied de page. Aucun texte ni logo genere. Rendu professionnel et adapte aux familles.\n\nA valider : droits a l’image, lisibilite et coherence de marque.`;
  if (task === 'weekly_plan') return `PLAN TEST - ${label}\n\nLundi : Story question pour lancer le theme.\nMardi : Post pedagogique avec un conseil concret.\nMercredi : Reel court avec Nounou ou un membre de l’equipe.\nJeudi : Carrousel autour des apprentissages.\nVendredi : Coulisses ou activite de classe.\nSamedi : Message destine aux parents.\nDimanche : Story interactive et annonce de la semaine suivante.\n\nBrief integre : ${brief}\n\nKPI : portee, enregistrements, partages, reponses et clics.`;
  if (task === 'insight_analysis') return `ANALYSE TEST - ${label}\n\nDonnees recues : ${brief}\n\n1. Les formats courts doivent etre compares aux carrousels sur une meme periode.\n2. Les partages et enregistrements indiquent une utilite plus durable que les reactions seules.\n3. Le prochain test doit isoler un seul changement : accroche, format ou heure.\n\nActions : republier le meilleur angle, tester un nouveau CTA et suivre les resultats apres 24 h puis 7 jours.`;
  return `CONTENU TEST - ${label}\n\nAccroche : Une nouvelle occasion d’apprendre, de progresser et de grandir ensemble.\n\nLegende : ${brief}\n\nChaque activite est pensee pour accompagner les eleves avec confiance, curiosite et bienveillance.\n\nCTA : Quel aspect souhaitez-vous decouvrir en premier ?\n\n#GSNidal #NidalJunior #Education #Apprentissage #Confiance #Progres #Reussite\n\nA valider : faits, autorisations, logo officiel et pied de page.`;
}
