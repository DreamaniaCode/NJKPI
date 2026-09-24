import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDatabase, databaseHealth } from './db.js';
import {
  listBrands, listContents, getContent, upsertContent, deleteContent,
  saveMetrics, saveAds, listAds, saveAgentRun,
  saveEditorialGeneration, listEditorialGenerations, getEditorialGeneration,
  deleteEditorialGeneration, saveEditorialTransfer,
  getKpiTargets, saveKpiTargets,
  saveSocialProfiles, getSocialProfiles, getSocialProfileHistory
} from './repository.js';
import { metaConfigured, syncContentFromUrl, syncAds, syncSocialProfiles } from './services/meta.js';
import { getMetaLiveCache, setMetaLiveCache, isMetaLiveCacheFresh } from './services/meta-live.js';
import {
  agentConfigured, getAiProvider, generateAgentOutput, shouldAutoSave,
  parseStructuredContent, getEditorialAgents, generateEditorialOutput,
  parseStructuredEditorial, parseStoryboard, parseQualityCheck,
  SUPPORTED_AI_PROVIDERS
} from './services/agent.js';
import { initAuth, authenticate, authorize, loginUser, listUsers, createUser, updateUserRole, isAuthEnabled } from './middleware/auth.js';
import { generatePdfExport, generateExcelExport, generateMarkdownExport, generateCsvExport } from './services/export.js';
import { parseContentUrl, buildContentFromUrl } from './services/url-parser.js';
import { buildKpiContext, formatKpiContext, buildKpiAutomationBrief } from './services/kpi-ai.js';

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

async function getAiKpiContext(brand) {
  const [targetsRecord, contents] = await Promise.all([
    getKpiTargets(brand),
    listContents(brand)
  ]);
  return buildKpiContext({ brand, targetsRecord, contents });
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
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      aiFallback: process.env.OPENROUTER_API_KEY ? 'openrouter' : null,
      metaNidal: metaConfigured('nidal'),
      metaNidalJunior: metaConfigured('nidal-junior'),
      metaReady: hasMeta,
      metaStatus: hasMeta ? 'connected' : 'pending'
    }
  });
});

app.post('/webhooks/kpi-ai', async (req, res, next) => {
  try {
    const expected = process.env.NIDAL_WEBHOOK_SECRET;
    if (!expected) return res.status(503).json({ error: 'NIDAL_WEBHOOK_SECRET non configuré' });
    const supplied = req.headers['x-nidal-webhook-secret'];
    if (supplied !== expected) return res.status(401).json({ error: 'Webhook non autorisé' });

    const event = String(req.body?.event || 'kpi.updated');
    const brand = req.body?.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const kpiContext = await getAiKpiContext(brand);
    const formattedKpi = formatKpiContext(kpiContext);
    const brief = buildKpiAutomationBrief({ event, brand });

    const generated = await generateEditorialOutput({
      agentKey: 'kpi-manager',
      brand,
      briefData: {
        topic: brief,
        brief,
        audience: 'Équipe communication et direction',
        objective: 'Analyse KPI et recommandations éditoriales',
        platform: 'NJKPI',
        format: 'article',
        notes: 'Analyse interne uniquement. Ne rien publier automatiquement.'
      },
      context: formattedKpi,
      aiConfig: {}
    });

    const run = {
      id: crypto.randomUUID(),
      brand,
      task: 'kpi-automation',
      brief,
      output: generated.output,
      model: generated.model,
      isDemo: generated.isDemo,
      createdAt: new Date().toISOString()
    };
    await saveAgentRun(run);

    res.json({
      ok: true,
      event,
      brand,
      provider: generated.provider,
      model: generated.model,
      isDemo: generated.isDemo,
      kpiContext,
      analysis: generated.output
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', requireAccess);
app.use('/api', authenticate);

// ── Auth routes (pas de requireAccess sur login) ──────────────────────
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Identifiants requis' });
    const result = await loginUser(username, password);
    if (!result) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json(result);
  } catch (error) { next(error); }
});

app.get('/api/auth/me', async (req, res) => {
  // Try JWT auth
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (token) {
    try {
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(token);
      if (payload) return res.json({ user: payload, authEnabled: isAuthEnabled() });
    } catch {}
  }
  res.json({ user: null, authEnabled: isAuthEnabled() });
});

app.get('/api/auth/users', authorize('admin'), async (_req, res, next) => {
  try { res.json(await listUsers()); } catch (error) { next(error); }
});

app.post('/api/auth/users', authorize('admin'), async (req, res, next) => {
  try {
    const { username, password, email, role, display_name } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    const user = await createUser({ username, password, email, role, display_name });
    res.status(201).json(user);
  } catch (error) { next(error); }
});

app.put('/api/auth/users/:id/role', authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'editor', 'viewer'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
    await updateUserRole(req.params.id, role);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// ── Reset all data ────────────────────────────────────────────────────
app.delete('/api/data/reset', async (req, res, next) => {
  try {
    if (isAuthEnabled() && req.user && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    await repo.resetAllData();
    res.json({ ok: true, message: 'Toutes les données ont été supprimées et les indicateurs remis à zéro' });
  } catch (error) { next(error); }
});

// ── Export endpoints ──────────────────────────────────────────────────
app.get('/api/export/:format', async (req, res, next) => {
  try {
    const brand = req.query.brand || 'nidal-junior';
    const contents = await listContents(brand);
    const targets = await getKpiTargets(brand);
    const data = { contents, kpiTargets: targets, brand };

    switch (req.params.format) {
      case 'pdf': {
        const result = generatePdfExport(data, brand);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.buffer);
      }
      case 'excel': {
        const result = generateExcelExport(data, brand);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.buffer);
      }
      case 'markdown': {
        const result = generateMarkdownExport(data, brand);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.text);
      }
      case 'csv': {
        const result = generateCsvExport(data, brand);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.text);
      }
      default:
        return res.status(400).json({ error: 'Format non supporté. Utilisez: pdf, excel, markdown, csv' });
    }
  } catch (error) { next(error); }
});

// ── URL import ────────────────────────────────────────────────────────
app.post('/api/import/url', async (req, res, next) => {
  try {
    const { url, brand } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requise' });
    const parsed = parseContentUrl(url);
    if (!parsed.isValid) return res.status(400).json({ error: 'URL non reconnue', parsed });
    const brandSlug = brand || 'nidal-junior';

    // 1. Synchroniser / extraire les métadonnées et métriques en temps réel
    let syncData = null;
    try {
      syncData = await syncContentFromUrl({ brand: brandSlug, finalUrl: parsed.normalizedUrl, platform: parsed.platform });
    } catch (e) {
      console.warn('Sync URL metrics différé:', e.message);
    }

    const skeleton = buildContentFromUrl(parsed);
    const metricsObj = syncData?.metrics || { portee: 0, reactions: 0, commentaires: 0, partages: 0, enregistrements: 0, vues: 0 };

    const contentData = {
      ...skeleton,
      titre: syncData?.title || skeleton.titre,
      message: syncData?.caption || skeleton.notes || '',
      format: syncData?.format || skeleton.format || 'post',
      plateforme: syncData?.platform || skeleton.plateforme || 'Instagram (IG)',
      brand: brandSlug,
      mediaUrl: syncData?.mediaUrl || null,
      resultats: metricsObj,
      syncStatus: syncData?.isDemo ? 'demo' : 'connected',
      lastSyncedAt: new Date().toISOString()
    };

    const content = await upsertContent({
      brand_slug: brandSlug,
      data: contentData,
      final_url: parsed.normalizedUrl,
      platform: contentData.plateforme,
      sync_status: contentData.syncStatus
    });

    if (syncData) {
      await saveMetrics(content.id, syncData.source || 'meta', syncData.metrics, Boolean(syncData.isDemo));
    }

    res.json({ ok: true, content: { ...content, data: contentData }, metrics: metricsObj, parsed });
  } catch (error) { next(error); }
});

app.post('/api/import/bulk-urls', async (req, res, next) => {
  try {
    const { urls, brand } = req.body;
    if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ error: 'Liste d\'URLs requise' });
    const results = [];
    for (const url of urls.slice(0, 20)) {
      try {
        const parsed = parseContentUrl(url);
        if (!parsed.isValid) { results.push({ url, error: 'URL non reconnue' }); continue; }
        const skeleton = buildContentFromUrl(parsed);
        const content = await upsertContent({ brand_slug: brand || 'nidal-junior', data: skeleton, final_url: parsed.normalizedUrl, platform: parsed.platform, sync_status: 'pending' });
        results.push({ url, ok: true, content, parsed });
      } catch (e) { results.push({ url, error: e.message }); }
    }
    res.json({ ok: true, results, imported: results.filter(r => r.ok).length, total: results.length });
  } catch (error) { next(error); }
});

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

app.get('/api/social/live', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const ttlSeconds = Number(process.env.META_LIVE_CACHE_SECONDS || 60);
    const force = String(req.query.refresh || '') === '1';

    if (!force && isMetaLiveCacheFresh(brand, ttlSeconds)) {
      return res.json({ ok: true, cached: true, ...getMetaLiveCache(brand) });
    }

    const synced = await syncSocialProfiles({ brand });
    const saved = await saveSocialProfiles(brand, synced);
    const live = setMetaLiveCache(brand, {
      brand,
      syncedAt: synced.syncedAt,
      instagram: synced.instagram,
      facebook: synced.facebook,
      errors: synced.errors || [],
      saved
    });
    res.json({ ok: true, cached: false, ...live });
  } catch (error) { next(error); }
});

app.get('/api/social/profiles', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    res.json(await getSocialProfiles(brand));
  } catch (error) { next(error); }
});

app.get('/api/social/profiles/history', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const platform = ['instagram', 'facebook'].includes(req.query.platform) ? req.query.platform : null;
    res.json(await getSocialProfileHistory(brand, platform, req.query.limit));
  } catch (error) { next(error); }
});

app.post('/api/social/profiles/sync', async (req, res, next) => {
  try {
    const brand = req.body.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const synced = await syncSocialProfiles({
      brand,
      instagramUrl: req.body.instagramUrl || '',
      facebookUrl: req.body.facebookUrl || ''
    });
    const saved = await saveSocialProfiles(brand, synced);
    res.json({ ok: true, ...synced, saved });
  } catch (error) { next(error); }
});

app.get('/api/kpi/targets', async (req, res, next) => {
  try {
    const brand = req.query.brand || 'nidal-junior';
    res.json(await getKpiTargets(brand));
  } catch (error) { next(error); }
});

app.post('/api/kpi/targets', async (req, res, next) => {
  try {
    const brand = req.body.brand || 'nidal-junior';
    const targets = req.body.targets || {};
    res.json(await saveKpiTargets(brand, targets));
  } catch (error) { next(error); }
});

app.get('/api/kpi/ai-context', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    res.json(await getAiKpiContext(brand));
  } catch (error) { next(error); }
});

app.post('/api/agent/generate', async (req, res, next) => {
  try {
    const { brand = 'nidal-junior', task = 'article', brief, context = '' } = req.body;
    if (!brief?.trim()) return res.status(400).json({ error: 'Brief obligatoire' });

    let enrichedContext = context;
    try {
      const [existing, targetsRecord] = await Promise.all([
        listContents(brand),
        getKpiTargets(brand)
      ]);

      if (existing?.length) {
        const recentTitles = existing.slice(0, 15).map(c => `• ${c.data?.titre || c.data?.title || 'Sans titre'} (${c.data?.statut || 'brouillon'}, ${c.data?.format || 'article'})`).join('\n');
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\nContenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`
          : `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`;
      }

      const kpiContext = buildKpiContext({ brand, targetsRecord, contents: existing || [] });
      const formattedKpi = formatKpiContext(kpiContext);
      enrichedContext = enrichedContext
        ? `${enrichedContext}\n\n${formattedKpi}`
        : formattedKpi;
    } catch (e) {
      console.warn('Contexte KPI/existant non injecté:', e.message);
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

app.get('/api/editorial/providers', (_req, res) => {
  res.json({
    currentServerProvider: getAiProvider(),
    hasServerKey: agentConfigured(),
    providers: SUPPORTED_AI_PROVIDERS
  });
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
      duration,
      slideCount,
      targetDate,
      requiredInfo,
      cta,
      assets,
      includeNounou,
      includeStoryboard,
      language = 'Français',
      notes,
      revisionOf,
      context = '',
      aiConfig = {}
    } = req.body;

    const briefText = topic || req.body.brief;
    if (!briefText?.trim()) return res.status(400).json({ error: 'Sujet ou brief obligatoire' });

    let enrichedContext = context;
    try {
      const [existing, targetsRecord] = await Promise.all([
        listContents(brand),
        getKpiTargets(brand)
      ]);

      if (existing?.length) {
        const recentTitles = existing.slice(0, 15).map(c => `• ${c.data?.titre || c.data?.title || 'Sans titre'} (${c.data?.statut || 'brouillon'}, ${c.data?.format || 'article'})`).join('\n');
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\nContenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`
          : `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}`;
      }

      const kpiContext = buildKpiContext({ brand, targetsRecord, contents: existing || [] });
      const formattedKpi = formatKpiContext(kpiContext);
      enrichedContext = enrichedContext
        ? `${enrichedContext}\n\n${formattedKpi}`
        : formattedKpi;
    } catch (e) {
      console.warn('Contexte KPI/existant non injecté:', e.message);
    }

    const briefData = {
      topic: briefText.trim(),
      brief: briefText.trim(),
      audience,
      objective,
      platform,
      format,
      duration: duration || (/reel|vidéo|video/i.test(format || '') ? '30 secondes' : undefined),
      slideCount: slideCount || (/carrousel/i.test(format || '') ? '5 slides' : undefined),
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
      context: enrichedContext,
      aiConfig
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
      provider: generated.provider,
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
  if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.static(root, { index: 'index.html', extensions: ['html'] }));
app.use((_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(root, 'index.html'));
});

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
  initDatabase().then(() => initAuth()).catch(error => {
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
