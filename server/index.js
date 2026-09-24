import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDatabase, databaseHealth } from './db.js';
import { listBrands, listContents, getContent, upsertContent, deleteContent, saveMetrics, saveAds, listAds, saveAgentRun } from './repository.js';
import { metaConfigured, syncContentFromUrl, syncAds } from './services/meta.js';
import { agentConfigured, getAiProvider, generateAgentOutput } from './services/agent.js';

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
    const { brand = 'nidal-junior', task = 'post', brief, context = '' } = req.body;
    if (!brief?.trim()) return res.status(400).json({ error: 'Brief obligatoire' });
    const generated = await generateAgentOutput({ brand, task, brief: brief.trim(), context });
    const run = { id: crypto.randomUUID(), brand, task, brief: brief.trim(), ...generated, createdAt: new Date().toISOString() };
    await saveAgentRun(run);
    res.json(run);
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

initDatabase()
  .then(connected => app.listen(port, '0.0.0.0', () => console.log(`Nidal Content Hub ecoute sur :${port} | PostgreSQL: ${connected ? 'connecte' : 'mode memoire'}`)))
  .catch(error => {
    console.error('Initialisation PostgreSQL impossible:', error);
    process.exit(1);
  });
