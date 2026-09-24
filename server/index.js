import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDatabase, databaseHealth } from './db.js';
import {
  listBrands, listContents, getContent, upsertContent, deleteContent,
  saveMetrics, saveAds, listAds, saveAgentRun,
  saveEditorialGeneration, listEditorialGenerations, getEditorialGeneration,
  deleteEditorialGeneration, saveEditorialTransfer
} from './repository.js';
import { metaConfigured, syncContentFromUrl, syncAds } from './services/meta.js';
import {
  agentConfigured, getAiProvider, generateAgentOutput, shouldAutoSave,
  parseStructuredContent, getEditorialAgents, generateEditorialOutput,
  parseStructuredEditorial, parseStoryboard, parseQualityCheck
} from './services/agent.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const allowed = process.env.CORS_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function requireAccess(req, res, next) {
  const expected = process.env.APP_ACCESS_TOKEN;
  if (!expected) return next();
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (supplied !== expected) return res.status(401).json({ error: 'Acces refuse' });
  next();
}

app.get('/api/health', async (_req, res) => {
  const hasMeta = metaConfigured('nidal') || metaConfigured('nidal-junior');
  res.json({
    ok: true,
    database: await databaseHealth(),
    demoMode: process.env.DEMO_MODE === 'true',
    integrations: {
      ai: agentConfigured(),
      aiProvider: getAiProvider(),
      openai: agentConfigured(),
      metaNidal: metaConfigured('nidal'),
      metaNidalJunior: metaConfigured('nidal-junior'),
      metaReady: hasMeta,
      metaStatus: hasMeta ? 'connected' : 'pending'
    }
  });
});

app.use('/api', requireAccess);

app.get('/api/brands', async (_req, res, next) => { try { res.json(await listBrands()); } catch (error) { next(error); } });
app.get('/api/contents', async (req, res, next) => { try { res.json(await listContents(req.query.brand)); } catch (error) { next(error); } });
app.post('/api/contents', async (req, res, next) => { try { if (!req.body.id) return res.status(400).json({ error: 'id obligatoire' }); res.status(201).json(await upsertContent(req.body)); } catch (error) { next(error); } });
app.put('/api/contents/:id', async (req, res, next) => { try { res.json(await upsertContent({ ...req.body, id: req.params.id })); } catch (error) { next(error); } });
app.delete('/api/contents/:id', async (req, res, next) => { try { res.json({ deleted: await deleteContent(req.params.id) }); } catch (error) { next(error); } });

app.post('/api/contents/:id/sync', async (req, res, next) => {
  try {
    const existing = await getContent(req.params.id);
    const brand = req.body.brand || existing?.brand_slug || 'nidal-junior';
    const data = existing?.data || req.body.content || {};
    const finalUrl = req.body.finalUrl || existing?.final_url || data.finalUrl;
    const platform = req.body.platform || existing?.platform || data.plateforme || '';
    if (!finalUrl) return res.status(400).json({ error: 'Lien final obligatoire' });
    const sync = await syncContentFromUrl({ brand, finalUrl, platform });
    const updatedData = { ...data, brand, finalUrl, resultats: { ...(data.resultats || {}), ...sync.metrics }, externalMediaId: sync.externalMediaId, syncStatus: sync.isDemo ? 'demo' : 'connected', lastSyncedAt: new Date().toISOString() };
    const record = await upsertContent({ id: req.params.id, brand, data: updatedData, finalUrl, externalMediaId: sync.externalMediaId, platform, syncStatus: updatedData.syncStatus, lastSyncedAt: updatedData.lastSyncedAt });
    await saveMetrics(req.params.id, sync.source, sync.metrics, sync.isDemo);
    res.json({ content: record, sync });
  } catch (error) { next(error); }
});

app.get('/api/ads', async (req, res, next) => { try { res.json(await listAds(req.query.brand || 'nidal-junior')); } catch (error) { next(error); } });
app.post('/api/ads/sync', async (req, res, next) => { try { const brand = req.body.brand || 'nidal-junior'; const campaigns = await syncAds(brand); res.json(await saveAds(brand, campaigns)); } catch (error) { next(error); } });

app.post('/api/agent/generate', async (req, res, next) => {
  try {
    const { brand = 'nidal-junior', task = 'article', brief, context = '' } = req.body;
    if (!brief?.trim()) return res.status(400).json({ error: 'Brief obligatoire' });

    let enrichedContext = context;
    try {
      const existing = await listContents(brand);
      if (existing?.length) {
        const recentTitles = existing.slice(0, 15).map(c => `• ${c.data?.titre || c.data?.title || 'Sans titre'} (${c.data?.statut || 'brouillon'}, ${c.data?.format || 'article'})`).join('\n');
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\nContenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`
          : `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`;
      }
    } catch (e) {
      console.warn('Contexte existant non injecté:', e.message);
    }

    const generated = await generateAgentOutput({ brand, task, brief: brief.trim(), context: enrichedContext });
    const run = { id: crypto.randomUUID(), brand, task, brief: brief.trim(), ...generated, createdAt: new Date().toISOString() };
    await saveAgentRun(run);

    let savedContent = null;
    if (shouldAutoSave(brief) && generated.output) {
      const parsed = parseStructuredContent(generated.output, brand);
      if (parsed) {
        const contentId = crypto.randomUUID();
        savedContent = await upsertContent({
          id: contentId,
          brand,
          data: { ...parsed, id: contentId, brand },
          finalUrl: '',
          platform: 'Instagram + Facebook',
          syncStatus: 'not_connected'
        });
      }
    }

    res.json({ ...run, savedContent });
  } catch (error) { next(error); }
});

app.get('/api/editorial/agents', (_req, res) => {
  res.json(getEditorialAgents());
});

app.get('/api/editorial/generations', async (req, res, next) => {
  try {
    const list = await listEditorialGenerations(req.query.agent, req.query.brand);
    res.json(list);
  } catch (error) { next(error); }
});

app.post('/api/editorial/generate', async (req, res, next) => {
  try {
    const {
      agentKey = 'studio-junior',
      brand = (agentKey === 'planning-nidal' ? 'nidal' : 'nidal-junior'),
      topic,
      audience,
      objective,
      platform,
      format,
      targetDate,
      requiredInfo,
      cta,
      assets,
      includeNounou,
      includeStoryboard,
      language = 'Français',
      notes,
      revisionOf,
      context = ''
    } = req.body;

    const briefText = topic || req.body.brief;
    if (!briefText?.trim()) return res.status(400).json({ error: 'Sujet ou brief obligatoire' });

    let enrichedContext = context;
    try {
      const existing = await listContents(brand);
      if (existing?.length) {
        const recentTitles = existing.slice(0, 15).map(c => `• ${c.data?.titre || c.data?.title || 'Sans titre'} (${c.data?.statut || 'brouillon'}, ${c.data?.format || 'article'})`).join('\n');
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\nContenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`
          : `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`;
      }
    } catch (e) {
      console.warn('Contexte existant non injecté:', e.message);
    }

    const briefData = {
      topic: briefText.trim(),
      brief: briefText.trim(),
      audience,
      objective,
      platform,
      format,
      targetDate,
      requiredInfo,
      cta,
      assets,
      includeNounou: includeNounou !== undefined ? Boolean(includeNounou) : (agentKey === 'studio-junior'),
      includeStoryboard: Boolean(includeStoryboard || /reel|vidéo|video|storyboard/i.test(format || '')),
      language,
      notes,
      revisionOf
    };

    const generated = await generateEditorialOutput({
      agentKey,
      brand,
      briefData,
      context: enrichedContext
    });

    const generationId = crypto.randomUUID();
    const generationRecord = {
      id: generationId,
      agentKey,
      brand,
      brief: briefData,
      output: generated.output,
      structuredData: generated.structuredData,
      storyboard: generated.storyboard,
      qualityCheck: generated.qualityCheck,
      status: 'brouillon',
      model: generated.model,
      isDemo: generated.isDemo,
      createdAt: new Date().toISOString()
    };

    let savedContent = null;
    if (shouldAutoSave(briefText) && generated.structuredData) {
      const contentId = crypto.randomUUID();
      savedContent = await upsertContent({
        id: contentId,
        brand,
        data: { ...generated.structuredData, id: contentId, brand },
        finalUrl: '',
        platform: generated.structuredData.canal || 'Instagram + Facebook',
        syncStatus: 'not_connected'
      });
      generationRecord.contentId = contentId;
    }

    await saveEditorialGeneration(generationRecord);
    res.json({ ...generationRecord, savedContent });
  } catch (error) { next(error); }
});

app.post('/api/editorial/save-to-planning', async (req, res, next) => {
  try {
    const { generationId, structuredData, brand, targetStatus = 'brouillon' } = req.body;
    let data = structuredData;
    let targetBrand = brand;

    if (generationId) {
      const gen = await getEditorialGeneration(generationId);
      if (gen) {
        data = data || gen.structured_data;
        targetBrand = targetBrand || gen.brand_slug;
      }
    }

    if (!data || !data.titre) return res.status(400).json({ error: 'Données de contenu invalides' });

    const contentId = crypto.randomUUID();
    const contentPayload = {
      id: contentId,
      brand: targetBrand || 'nidal-junior',
      data: {
        ...data,
        id: contentId,
        brand: targetBrand || 'nidal-junior',
        statut: targetStatus,
        validation: targetStatus === 'publie' ? 'approuve' : 'a-valider'
      },
      finalUrl: '',
      platform: data.canal || data.plateforme || 'Instagram + Facebook',
      syncStatus: 'not_connected'
    };

    const saved = await upsertContent(contentPayload);

    if (generationId) {
      await saveEditorialGeneration({
        id: generationId,
        contentId,
        status: targetStatus
      });
    }

    res.json({ success: true, content: saved });
  } catch (error) { next(error); }
});

app.post('/api/editorial/transfer', async (req, res, next) => {
  try {
    const { fromAgent, toAgent, sourceGenerationId, notes = '' } = req.body;
    if (!fromAgent || !toAgent || !sourceGenerationId) {
      return res.status(400).json({ error: 'fromAgent, toAgent et sourceGenerationId sont obligatoires' });
    }

    const sourceGen = await getEditorialGeneration(sourceGenerationId);
    if (!sourceGen) return res.status(404).json({ error: 'Génération source introuvable' });

    const transferId = crypto.randomUUID();
    const transfer = await saveEditorialTransfer({
      id: transferId,
      fromAgent,
      toAgent,
      sourceGenerationId,
      notes,
      status: 'transfere'
    });

    res.json({ success: true, transfer, sourceGeneration: sourceGen });
  } catch (error) { next(error); }
});

app.delete('/api/editorial/generations/:id', async (req, res, next) => {
  try {
    const { confirm } = req.query;
    if (confirm !== 'true') {
      return res.status(400).json({ error: 'Confirmation explicite requise pour la suppression' });
    }
    const deleted = await deleteEditorialGeneration(req.params.id);
    res.json({ success: deleted });
  } catch (error) { next(error); }
});

app.use((req, res, next) => {
  if (/^\/(?:server\/|package\.json$|Dockerfile$|\.env)/.test(req.path)) return res.sendStatus(404);
  next();
});
app.use(express.static(root, { index: 'index.html', extensions: ['html'] }));
app.use((_req, res) => res.sendFile(path.join(root, 'index.html')));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Erreur serveur' });
});

process.on('uncaughtException', err => {
  console.error('Exception non capturee:', err);
});

process.on('unhandledRejection', reason => {
  console.error('Rejet de promesse non gere:', reason);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Nidal Content Hub demarre sur http://0.0.0.0:${port}`);
  initDatabase().catch(error => {
    console.error('Avertissement initialisation base:', error.message);
  });
});

function shutdown(signal) {
  console.log(`${signal} recu, fermeture progressive du serveur...`);
  server.close(async () => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
