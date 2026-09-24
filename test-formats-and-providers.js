import assert from 'node:assert';
import {
  generateEditorialOutput,
  parseStructuredEditorial,
  SUPPORTED_AI_PROVIDERS,
  agentConfigured,
  getAiProvider
} from './server/services/agent.js';

async function runTests() {
  console.log('--- 1. TEST FOURNISSEURS IA ET MODÈLES ---');
  assert(Array.isArray(SUPPORTED_AI_PROVIDERS), 'SUPPORTED_AI_PROVIDERS doit être un tableau');
  assert(SUPPORTED_AI_PROVIDERS.length >= 6, 'Au moins 6 fournisseurs (OpenRouter, OpenAI, Gemini, Claude, Groq, DeepSeek)');
  
  const openrouter = SUPPORTED_AI_PROVIDERS.find(p => p.id === 'openrouter');
  assert(openrouter, 'Fournisseur openrouter trouvé');
  assert(openrouter.models.some(m => m.id === 'meta-llama/llama-3.3-70b-instruct'), 'Modèle llama-3.3-70b-instruct présent');
  assert(openrouter.models.some(m => m.id === 'google/gemini-2.0-flash-exp:free'), 'Modèle gemini-2.0-flash gratuit présent');
  assert(openrouter.models.some(m => m.id === 'deepseek/deepseek-r1:free'), 'Modèle deepseek-r1 gratuit présent');
  assert(openrouter.allowCustomModel === true, 'Saisie personnalisée de modèle autorisée sur OpenRouter');
  console.log('✓ Fournisseurs IA et modèles validés');

  console.log('\n--- 2. TEST STUDIO JUNIOR - FORMAT POST ---');
  const postGen = await generateEditorialOutput({
    agentKey: 'studio-junior',
    brand: 'nidal-junior',
    briefData: {
      topic: 'Le coin lecture avec Nounou',
      format: 'post'
    },
    aiConfig: { provider: 'demo' }
  });

  assert(postGen.structuredData, 'structuredData généré');
  assert.strictEqual(postGen.structuredData.format, 'post', 'Format structuré est post');
  assert.strictEqual(postGen.structuredData.tags.length, 5, 'STRICTEMENT 5 hashtags');
  assert(!/SCÈNE\s+\d+/i.test(postGen.output), 'Pas de storyboard dans un post');
  assert(/Accroche\s*:/i.test(postGen.output), 'Accroche présente');
  assert(/Idée visuelle\s*:/i.test(postGen.output), 'Idée visuelle présente');
  assert(/Appel à l’action\s*:/i.test(postGen.output), 'CTA présent');
  console.log('✓ Post Studio Junior : pas de storyboard, 5 hashtags stricts, accroche & visuel clairs');

  console.log('\n--- 3. TEST STUDIO JUNIOR - FORMAT REEL (SCRIPT MINUTÉ & DURÉE DÉCIDÉE) ---');
  const reelGen = await generateEditorialOutput({
    agentKey: 'studio-junior',
    brand: 'nidal-junior',
    briefData: {
      topic: 'Le pouvoir magique des livres avec Nounou',
      format: 'reel',
      duration: '30 secondes'
    },
    aiConfig: { provider: 'demo' }
  });

  assert(reelGen.structuredData, 'structuredData généré');
  assert.strictEqual(reelGen.structuredData.format, 'video', 'Format structuré reel mappé en video');
  assert.strictEqual(reelGen.structuredData.tags.length, 5, 'STRICTEMENT 5 hashtags');
  assert(/Durée totale décidée\s*:\s*30 secondes/i.test(reelGen.output), 'Durée totale décidée affichée');
  assert(reelGen.storyboard && reelGen.storyboard.length >= 3, 'Storyboard minuté de 3+ scènes');
  assert(reelGen.storyboard[0].duration, 'Timing précis présent sur scène 1');
  assert(reelGen.storyboard[0].actionNounou, 'Action de Nounou présente');
  assert(reelGen.storyboard[0].voix, 'Voix de Nounou présente');
  console.log('✓ Reel Studio Junior : durée décidée (30s), script minuté scène par scène, voix mot à mot et 5 hashtags');

  console.log('\n--- 4. TEST STUDIO JUNIOR - FORMAT CARROUSEL ---');
  const carrouselGen = await generateEditorialOutput({
    agentKey: 'studio-junior',
    brand: 'nidal-junior',
    briefData: {
      topic: '3 astuces pour donner envie de lire aux tout-petits',
      format: 'carrousel',
      slideCount: '5 slides'
    },
    aiConfig: { provider: 'demo' }
  });

  assert(carrouselGen.structuredData, 'structuredData généré');
  assert.strictEqual(carrouselGen.structuredData.tags.length, 5, 'STRICTEMENT 5 hashtags');
  assert(/Nombre de slides\s*:\s*5 slides/i.test(carrouselGen.output), 'Nombre de slides décidé');
  assert(/Slide 1/i.test(carrouselGen.output) && /Slide 5/i.test(carrouselGen.output), 'Découpage slide par slide complet');
  console.log('✓ Carrousel Studio Junior : 5 slides découpées, texte précis et 5 hashtags');

  console.log('\n--- 5. TEST STUDIO JUNIOR - FORMAT QUIZ ---');
  const quizGen = await generateEditorialOutput({
    agentKey: 'studio-junior',
    brand: 'nidal-junior',
    briefData: {
      topic: 'Les animaux de la forêt',
      format: 'quiz'
    },
    aiConfig: { provider: 'demo' }
  });

  assert(quizGen.structuredData, 'structuredData généré');
  assert.strictEqual(quizGen.structuredData.tags.length, 5, 'STRICTEMENT 5 hashtags');
  assert(/QUESTION 1/i.test(quizGen.output) && /QUESTION 3/i.test(quizGen.output), '3 questions interactives');
  assert(/Bonne réponse\s*:/i.test(quizGen.output), 'Bonne réponse indiquée');
  assert(/Explication bienveillante de Nounou/i.test(quizGen.output), 'Explication de Nounou présente');
  console.log('✓ Quiz Studio Junior : 3 questions QCM, bonnes réponses, explications pédagogiques et 5 hashtags');

  console.log('\n--- 6. TEST PLANNING GS NIDAL - POST INSTITUTIONNEL ---');
  const nidalPostGen = await generateEditorialOutput({
    agentKey: 'planning-nidal',
    brand: 'nidal',
    briefData: {
      topic: 'L\'engagement éducatif du Groupe Scolaire Nidal',
      format: 'post_institutionnel'
    },
    aiConfig: { provider: 'demo' }
  });

  assert(nidalPostGen.structuredData, 'structuredData généré');
  assert.strictEqual(nidalPostGen.structuredData.tags.length, 5, 'STRICTEMENT 5 hashtags');
  assert(/Information pratique\s*:/i.test(nidalPostGen.output), 'Information pratique présente');
  assert(/PLUS QU’UNE ÉCOLE, UN AVENIR/i.test(nidalPostGen.output), 'Slogan officiel présent');
  console.log('✓ Post institutionnel GS Nidal : élégant, information pratique et 5 hashtags stricts');

  console.log('\n--- 7. TEST PARSEUR STRICT DE 5 HASHTAGS ---');
  const customParsed = parseStructuredEditorial(`
    Concept créatif : Test tags
    Type : post
    Tags : #Un #Deux #Trois #Quatre #Cinq #Six #Sept #Huit
  `, 'studio-junior', 'nidal-junior');
  assert.strictEqual(customParsed.tags.length, 5, 'Tranché à strictement 5 hashtags même si le texte en contenait plus');

  const customParsed2 = parseStructuredEditorial(`
    Concept créatif : Test tags 2
    Type : post
    Tags : #SeulTag
  `, 'studio-junior', 'nidal-junior');
  assert.strictEqual(customParsed2.tags.length, 5, 'Complété à exactement 5 hashtags avec les tags officiels');
  console.log('✓ Règle des 5 hashtags stricts garantie par le parseur dans tous les cas');

  console.log('\n=============================================');
  console.log('TOUS LES TESTS DE FORMATS & IA ONT RÉUSSI ! 🎉');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('Erreur test:', err);
  process.exit(1);
});
