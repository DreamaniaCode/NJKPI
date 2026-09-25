import crypto from 'node:crypto';
import fs from 'node:fs/promises';
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
  saveSocialProfiles, getSocialProfiles, getSocialProfileHistory,
  saveAudienceSnapshot, listAudienceSnapshots,
  savePublishJob, listPublishJobs, listDuePublishJobs
} from './repository.js';
import { metaConfigured, syncContentFromUrl, syncAds, syncSocialProfiles, syncAudienceConversions, publishSocialJob, diagnoseMetaAccess } from './services/meta.js';
import { normalizeUploadedMedia } from './services/media.js';
import { getMetaLiveCache, setMetaLiveCache, isMetaLiveCacheFresh } from './services/meta-live.js';
import { getAudienceCache, setAudienceCache, isAudienceCacheFresh } from './services/audience-cache.js';
import {
  agentConfigured, getAiProvider, generateAgentOutput, shouldAutoSave,
  parseStructuredContent, getEditorialAgents, generateEditorialOutput,
  parseStructuredEditorial, parseStoryboard, parseQualityCheck,
  SUPPORTED_AI_PROVIDERS
} from './services/agent.js';
import { initAuth, authenticate, authorize, loginUser, listUsers, createUser, updateUserRole, isAuthEnabled, verifyToken } from './middleware/auth.js';
import { generatePdfExport, generateExcelExport, generateMarkdownExport, generateCsvExport } from './services/export.js';
import { parseContentUrl, buildContentFromUrl } from './services/url-parser.js';
import { buildKpiContext, formatKpiContext, buildKpiAutomationBrief } from './services/kpi-ai.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadsDir = path.resolve(process.env.MEDIA_UPLOAD_DIR || path.join(root, 'uploads'));

app.disable('x-powered-by');
app.set('trust proxy', 1);
// Upload binaire direct : évite de transformer les images en base64/JSON.
app.use('/api/uploads', express.raw({
  type: ['image/*', 'video/*', 'application/octet-stream'],
  limit: process.env.MEDIA_UPLOAD_LIMIT || '50mb'
}));
app.use(express.json({ limit: '2mb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
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
  // Login et vérification de session doivent rester accessibles sans le
  // token legacy APP_ACCESS_TOKEN, sinon un utilisateur ne peut pas se connecter.
  if (req.path === '/auth/login' || req.path === '/auth/me') return next();

  const expected = process.env.APP_ACCESS_TOKEN;
  if (!expected) return next();

  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const legacyHeader = String(req.headers['x-access-token'] || '');

  // Compatibilité ancien mode APP_ACCESS_TOKEN.
  if (legacyHeader === expected || bearer === expected) return next();

  // Le nouveau mode JWT doit aussi être accepté par la barrière legacy.
  if (bearer && verifyToken(bearer)) return next();

  return res.status(401).json({ error: 'Acces refuse' });
}

async function getAiKpiContext(brand) {
  const [targetsRecord, contents, socialProfiles] = await Promise.all([
    getKpiTargets(brand),
    listContents(brand),
    getSocialProfiles(brand)
  ]);
  return buildKpiContext({ brand, targetsRecord, contents, socialProfiles });
}

app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.json({ build: '20260925-25', appVersion: process.env.APP_VERSION || null, now: new Date().toISOString() });
});

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
app.use('/api', (req, res, next) => {
  // Ces deux routes gèrent elles-mêmes l'authentification.
  if (req.path === '/auth/login' || req.path === '/auth/me') return next();
  return authenticate(req, res, next);
});

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
    const user = await createUser({ username, password, email, role, display_name });
    res.status(201).json(user);
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
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
    const { url, brand, requireVerifiedMetrics = false } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requise' });
    const parsed = parseContentUrl(url);
    if (!parsed.isValid) return res.status(400).json({ error: 'URL non reconnue', parsed });
    const brandSlug = brand || 'nidal-junior';

    // 1. Synchroniser / extraire les métadonnées et métriques en temps réel
    let syncData = null;
    try {
      syncData = await syncContentFromUrl({
        brand: brandSlug,
        finalUrl: parsed.normalizedUrl,
        platform: parsed.platform,
        requireVerifiedMetrics: Boolean(requireVerifiedMetrics)
      });
    } catch (e) {
      console.warn('Sync URL metrics différé:', e.message);
      if (requireVerifiedMetrics) {
        return res.status(422).json({
          error: e.message,
          verified: false,
          parsed
        });
      }
    }

    const skeleton = buildContentFromUrl(parsed);
    const metricsObj = syncData?.metrics || {
      portee: null,
      reactions: null,
      commentaires: null,
      partages: null,
      enregistrements: null,
      vues: null,
      clics: null
    };

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

    res.json({
      ok: true,
      content: { ...content, data: contentData },
      metrics: metricsObj,
      sync: syncData ? {
        source: syncData.metricsSource || syncData.source,
        verified: syncData.metricsVerified === true,
        warning: syncData.warning || syncData.insightsWarning || null,
        externalMediaId: syncData.externalMediaId || null,
        permalink: syncData.permalink || null
      } : null,
      parsed
    });
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
    const sync = await syncContentFromUrl({ brand, finalUrl, platform, requireVerifiedMetrics: true });
    const updatedData = { ...data, brand, finalUrl, resultats: { ...(data.resultats || {}), ...sync.metrics }, externalMediaId: sync.externalMediaId, syncStatus: sync.isDemo ? 'demo' : 'connected', lastSyncedAt: new Date().toISOString() };
    const record = await upsertContent({ id: req.params.id, brand, data: updatedData, finalUrl, externalMediaId: sync.externalMediaId, platform, syncStatus: updatedData.syncStatus, lastSyncedAt: updatedData.lastSyncedAt });
    await saveMetrics(req.params.id, sync.source, sync.metrics, sync.isDemo);
    res.json({ content: record, sync });
  } catch (error) { next(error); }
});


app.post('/api/contents/sync-all', async (req, res, next) => {
  try {
    const brand = req.body?.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const contents = await listContents(brand);
    const candidates = contents
      .filter(item => {
        const data = item.data || {};
        return Boolean(item.final_url || data.finalUrl);
      })
      .slice(0, Number(process.env.META_BULK_SYNC_LIMIT || 50));

    const results = [];
    let updated = 0;
    let failed = 0;

    for (const item of candidates) {
      const data = item.data || {};
      const finalUrl = item.final_url || data.finalUrl;
      const platform = item.platform || data.plateforme || '';

      try {
        const sync = await syncContentFromUrl({
          brand,
          finalUrl,
          platform,
          requireVerifiedMetrics: true
        });

        if (!sync?.metrics || sync.metricsVerified !== true) {
          throw new Error('Métriques Meta officielles non disponibles');
        }

        const updatedData = {
          ...data,
          brand,
          finalUrl,
          resultats: { ...(data.resultats || {}), ...sync.metrics },
          externalMediaId: sync.externalMediaId || data.externalMediaId || '',
          syncStatus: 'connected',
          lastSyncedAt: new Date().toISOString()
        };

        const record = await upsertContent({
          id: item.id,
          brand,
          data: updatedData,
          finalUrl,
          externalMediaId: sync.externalMediaId,
          platform,
          syncStatus: 'connected',
          lastSyncedAt: updatedData.lastSyncedAt
        });

        await saveMetrics(item.id, sync.source || 'meta', sync.metrics, false);
        updated++;
        results.push({ id: item.id, ok: true, content: record, source: sync.metricsSource || sync.source });
      } catch (error) {
        failed++;
        results.push({ id: item.id, ok: false, error: error.message });
      }
    }

    res.json({
      ok: true,
      brand,
      total: candidates.length,
      updated,
      failed,
      syncedAt: new Date().toISOString(),
      results
    });
  } catch (error) { next(error); }
});

app.get('/api/ads', async (req, res, next) => { try { res.json(await listAds(req.query.brand || 'nidal-junior')); } catch (error) { next(error); } });
app.post('/api/ads/sync', async (req, res, next) => { try { const brand = req.body.brand || 'nidal-junior'; const campaigns = await syncAds(brand); res.json(await saveAds(brand, campaigns)); } catch (error) { next(error); } });

app.post('/api/uploads', authenticate, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'Fichier image ou vidéo obligatoire.' });
    }

    const rawName = decodeURIComponent(String(req.headers['x-file-name'] || 'media'));
    const mime = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].toLowerCase();
    const allowedMime = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;
    if (!allowedMime.test(mime)) {
      return res.status(400).json({ error: 'Format non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, MOV ou WEBM.' });
    }

    const normalized = await normalizeUploadedMedia(req.body, mime, rawName);
    const filename = `${Date.now()}-${crypto.randomUUID()}${normalized.ext}`;

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), normalized.buffer);

    const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.status(201).json({
      ok: true,
      filename,
      originalName: rawName,
      mime: normalized.mime,
      originalMime: mime,
      convertedForMeta: normalized.converted,
      size: normalized.buffer.length,
      path: `/uploads/${filename}`,
      url: `${baseUrl}/uploads/${filename}`
    });
  } catch (error) { next(error); }
});

app.get('/api/audience-history', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    res.json(await listAudienceSnapshots(brand, req.query.limit || 168));
  } catch (error) { next(error); }
});

app.get('/api/publish/jobs', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : (req.query.brand === 'nidal-junior' ? 'nidal-junior' : null);
    res.json(await listPublishJobs(brand, req.query.limit || 100));
  } catch (error) { next(error); }
});

app.post('/api/publish/jobs', authenticate, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const brand = req.body.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const platforms = Array.isArray(req.body.platforms)
      ? req.body.platforms.filter(p => ['instagram', 'facebook'].includes(p))
      : [];
    if (!platforms.length) return res.status(400).json({ error: 'Sélectionnez Instagram et/ou Facebook.' });
    if (!String(req.body.message || '').trim() && !req.body.mediaUrl && !req.body.linkUrl) {
      return res.status(400).json({ error: 'Ajoutez un texte, un média ou un lien.' });
    }

    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
    if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ error: 'Date de publication invalide.' });

    const job = await savePublishJob({
      id: crypto.randomUUID(),
      brand,
      message: String(req.body.message || ''),
      mediaUrl: req.body.mediaUrl || null,
      linkUrl: req.body.linkUrl || null,
      mediaType: req.body.mediaType || (req.body.mediaUrl ? 'image' : 'text'),
      platforms,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
      automationMode: req.body.automationMode || 'manual'
    });

    res.status(201).json(job);
  } catch (error) { next(error); }
});

app.post('/api/publish/jobs/:id/run', authenticate, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const jobs = await listPublishJobs(null, 500);
    const job = jobs.find(item => item.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Publication programmée introuvable.' });

    const publishing = await savePublishJob({ ...job, status: 'publishing', error: null });
    try {
      const outcome = await publishSocialJob(publishing);
      const done = await savePublishJob({
        ...publishing,
        status: Object.keys(outcome.errors || {}).length ? 'partial' : 'published',
        result: outcome.result,
        error: Object.entries(outcome.errors || {}).map(([p, m]) => `${p}: ${m}`).join(' | ') || null,
        publishedAt: new Date().toISOString()
      });
      return res.json(done);
    } catch (error) {
      const failed = await savePublishJob({ ...publishing, status: 'failed', error: error.message });
      return res.status(502).json(failed);
    }
  } catch (error) { next(error); }
});

app.get('/api/audience-conversions', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    const ttlSeconds = Number(process.env.META_AUDIENCE_CACHE_SECONDS || 900);
    const force = String(req.query.refresh || '') === '1';

    if (!force && isAudienceCacheFresh(brand, ttlSeconds)) {
      return res.json({ ok: true, cached: true, ...getAudienceCache(brand) });
    }

    const payload = await syncAudienceConversions(brand);
    // Chaque vraie lecture Meta non mise en cache devient un point d'historique.
    // Cela donne un premier point immédiatement après "Actualiser Meta", sans attendre une heure.
    await saveAudienceSnapshot(brand, payload);
    const cached = setAudienceCache(brand, payload);
    res.json({ ok: true, cached: false, ...cached });
  } catch (error) { next(error); }
});

app.get('/api/meta/diagnostics', async (req, res, next) => {
  try {
    const brand = req.query.brand === 'nidal' ? 'nidal' : 'nidal-junior';
    res.json(await diagnoseMetaAccess(brand));
  } catch (error) { next(error); }
});

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
        const recentImagePrompts = existing
          .map(c => c.data?.imagePrompt || c.data?.promptImage || '')
          .filter(Boolean)
          .slice(0, 10)
          .map((prompt, index) => `• Visuel précédent ${index + 1}: ${String(prompt).slice(0, 450)}`)
          .join('\n');

        const visualContext = recentImagePrompts
          ? `\n\nPROMPTS IMAGE RÉCENTS À NE PAS RÉPÉTER NI PARAPHRASER DE TROP PRÈS :\n${recentImagePrompts}`
          : '';

        const recentContext = `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}${visualContext}`;
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\n${recentContext}`
          : recentContext;
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

function extractProfessionalPlanItems(output = '') {
  const text = String(output || '');
  const marker = text.indexOf('===PLAN_JSON===');
  const candidates = [];

  if (marker >= 0) {
    const tail = text.slice(marker + '===PLAN_JSON==='.length);
    const fenced = tail.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.push(fenced[1]);
    candidates.push(tail);
  }

  const generic = text.match(/```json\s*([\s\S]*?)```/i);
  if (generic?.[1]) candidates.push(generic[1]);

  for (const raw of candidates) {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) continue;
      const parsed = JSON.parse(raw.slice(start, end + 1));
      const items = Array.isArray(parsed?.planItems) ? parsed.planItems : [];
      if (!items.length) continue;

      return items.map((item, index) => ({
        dayNumber: Number(item.dayNumber || index + 1),
        date: String(item.date || ''),
        publishTime: String(item.publishTime || '18:30'),
        title: String(item.title || `Contenu jour ${index + 1}`),
        format: String(item.format || 'post').toLowerCase(),
        platform: String(item.platform || 'Instagram + Facebook'),
        funnelStage: String(item.funnelStage || ''),
        objective: String(item.objective || ''),
        topic: String(item.topic || item.title || ''),
        angle: String(item.angle || ''),
        hook: String(item.hook || ''),
        caption: String(item.caption || ''),
        cta: String(item.cta || ''),
        visualType: String(item.visualType || (/reel|video|vidéo/i.test(item.format || '') ? 'video' : 'photo')),
        imagePrompt: String(item.imagePrompt || ''),
        videoScript: String(item.videoScript || ''),
        storyboard: Array.isArray(item.storyboard) ? item.storyboard : [],
        companionStory: item.companionStory || null,
        hashtags: Array.isArray(item.hashtags) ? item.hashtags.slice(0, 5) : [],
        primaryKpi: String(item.primaryKpi || ''),
        rationale: String(item.rationale || ''),
        basedOnData: Array.isArray(item.basedOnData) ? item.basedOnData : []
      }));
    } catch {}
  }

  return [];
}

app.post('/api/editorial/pro-plan', async (req, res, next) => {
  try {
    const {
      brand = 'nidal',
      days = 30,
      objective = 'croissance, engagement et inscriptions',
      notes = '',
      aiConfig = {}
    } = req.body || {};

    const targetBrand = brand === 'nidal-junior' ? 'nidal-junior' : 'nidal';
    const agentKey = targetBrand === 'nidal' ? 'planning-nidal' : 'studio-junior';
    const horizon = [7, 14, 30].includes(Number(days)) ? Number(days) : 30;

    const [contents, targetsRecord, socialProfiles, audienceRows, ads] = await Promise.all([
      listContents(targetBrand).catch(() => []),
      getKpiTargets(targetBrand).catch(() => ({ targets: {} })),
      getSocialProfiles(targetBrand).catch(() => ({})),
      listAudienceSnapshots(targetBrand, 3).catch(() => []),
      listAds(targetBrand).catch(() => [])
    ]);

    const normalized = (contents || []).map(row => {
      const data = row.data || {};
      const results = data.resultats || {};
      const format = String(data.format || 'post').toLowerCase();
      const platform = String(data.plateforme || row.platform || '');
      const interactions = ['reactions', 'commentaires', 'partages', 'enregistrements']
        .reduce((sum, key) => sum + Number(results[key] || 0), 0);
      return {
        title: data.titre || data.title || 'Sans titre',
        format,
        platform,
        status: data.statut || 'brouillon',
        date: data.datePublication || row.created_at || null,
        reach: Number(results.portee || 0),
        views: Number(results.vues || 0),
        comments: Number(results.commentaires || 0),
        reactions: Number(results.reactions || 0),
        shares: Number(results.partages || 0),
        saves: Number(results.enregistrements || 0),
        conversions: Number(results.conversions || 0),
        interactions,
        pillar: data.pilier || '',
        objective: data.objectif || '',
        finalUrl: row.final_url || data.finalUrl || ''
      };
    });

    const published = normalized.filter(item => /publi/i.test(item.status) || item.finalUrl);
    const formatCounts = normalized.reduce((acc, item) => {
      const key = /reel/.test(item.format) ? 'reel'
        : /story/.test(item.format) ? 'story'
        : /video|vidéo/.test(item.format) ? 'video'
        : /carrousel/.test(item.format) ? 'carrousel'
        : 'post';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { post: 0, reel: 0, story: 0, video: 0, carrousel: 0 });

    const topContent = [...published]
      .sort((a, b) => ((b.interactions * 10) + b.reach + b.views) - ((a.interactions * 10) + a.reach + a.views))
      .slice(0, 10);

    const recentContent = [...normalized]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 25);

    const audience = audienceRows?.[0]?.payload || null;
    const igProfile = socialProfiles?.instagram?.profile || socialProfiles?.instagram || null;
    const fbProfile = socialProfiles?.facebook?.profile || socialProfiles?.facebook || null;

    const adsSummary = (ads || []).slice(0, 20).map(row => {
      const insight = row.insights || {};
      const spend = Number(insight.spend || 0);
      const reach = Number(insight.reach || 0);
      const impressions = Number(insight.impressions || 0);
      const clicks = Number(insight.clicks || 0);
      const actions = Array.isArray(insight.actions) ? insight.actions : [];
      return {
        name: row.name || insight.campaign_name || 'Campagne',
        status: row.status || insight.status || null,
        spend,
        reach,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
        cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : null,
        cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : null,
        frequency: reach > 0 ? Number((impressions / reach).toFixed(2)) : null,
        actions
      };
    });

    const paidTotals = adsSummary.reduce((acc, campaign) => {
      acc.spend += campaign.spend;
      acc.reach += campaign.reach;
      acc.impressions += campaign.impressions;
      acc.clicks += campaign.clicks;
      for (const action of campaign.actions || []) {
        const key = String(action.action_type || action.type || 'other');
        acc.actions[key] = (acc.actions[key] || 0) + Number(action.value || 0);
      }
      return acc;
    }, { spend: 0, reach: 0, impressions: 0, clicks: 0, actions: {} });

    paidTotals.ctr = paidTotals.impressions > 0
      ? Number(((paidTotals.clicks / paidTotals.impressions) * 100).toFixed(2))
      : null;
    paidTotals.cpc = paidTotals.clicks > 0
      ? Number((paidTotals.spend / paidTotals.clicks).toFixed(2))
      : null;
    paidTotals.cpm = paidTotals.impressions > 0
      ? Number(((paidTotals.spend / paidTotals.impressions) * 1000).toFixed(2))
      : null;

    const dataContext = {
      generatedAt: new Date().toISOString(),
      horizonDays: horizon,
      brand: targetBrand,
      kpiTargets: targetsRecord?.targets || {},
      contentInventory: {
        total: normalized.length,
        published: published.length,
        formats: formatCounts,
        recent: recentContent,
        topPerformers: topContent
      },
      social: {
        instagram: igProfile ? {
          followers: igProfile.followers ?? igProfile.followers_count ?? null,
          reach: igProfile.insights?.reach ?? null,
          accountsEngaged: igProfile.insights?.accountsEngaged ?? null,
          mediaCount: igProfile.mediaCount ?? igProfile.media_count ?? null,
          syncedAt: socialProfiles?.instagram?.synced_at || null
        } : null,
        facebook: fbProfile ? {
          followers: fbProfile.followers ?? fbProfile.followers_count ?? null,
          reach: fbProfile.insights?.reach ?? null,
          views: fbProfile.insights?.views ?? null,
          interactions: fbProfile.insights?.interactions ?? null,
          comments: fbProfile.insights?.comments ?? null,
          syncedAt: socialProfiles?.facebook?.synced_at || null
        } : null
      },
      audienceSnapshot: audience,
      paidMedia: {
        totals: paidTotals,
        campaigns: adsSummary
      }
    };

    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const strategyBrief = `
MISSION : Tu es le Directeur Social Media & Growth senior de Nidal. Tu ne fournis pas seulement des idées : tu fournis des SOLUTIONS, un calendrier exécutable et des contenus quasiment prêts à programmer.

PÉRIODE : ${horizon} jours à partir du ${startDate}.
OBJECTIF BUSINESS : ${objective}
${notes ? `NOTES DU RESPONSABLE : ${notes}` : ''}

ANALYSE PROFONDE OBLIGATOIRE :
1. Audite les contenus organiques existants : formats, fréquence, sujets, meilleurs résultats, contenus faibles, répétitions et manques.
2. Analyse séparément Instagram et Facebook avec uniquement les métriques réellement disponibles.
3. Analyse PROFONDÉMENT Meta Ads / Audience / Conversions présents dans les données :
   - audience par âge, sexe, zone géographique, plateforme/placement si disponible ;
   - spend, reach, impressions, clicks, CTR, CPC, CPM, fréquence et actions/conversions ;
   - campagnes qui apportent le meilleur signal et campagnes faibles ;
   - comparaison paid vs organic lorsque les données le permettent.
4. Pour CHAQUE problème identifié, donne : PROBLÈME → PREUVE DANS LES DONNÉES → CAUSE PROBABLE (présentée comme hypothèse) → SOLUTION CONCRÈTE → KPI DE VALIDATION.
5. N'invente JAMAIS de métrique. Si elle manque, écris « donnée indisponible ».
6. Donne des priorités : urgent / cette semaine / à tester.

CALENDRIER :
- Crée EXACTEMENT ${horizon} entrées, une pour CHAQUE JOUR, même si certains jours sont plus légers.
- Chaque jour doit avoir un TITRE explicite qui permet de comprendre immédiatement le sujet.
- Mélange selon les besoins réels : Post photo, Carrousel, Reel, Story, Vidéo.
- Le plan doit corriger les manques détectés, pas répartir les formats au hasard.
- Chaque jour doit préciser une heure de publication conseillée. Si les données ne permettent pas de connaître la meilleure heure, indique que l'heure est une recommandation éditoriale à tester.

POUR CHAQUE JOUR, FOURNIS :
- date réelle ISO YYYY-MM-DD
- heure HH:MM
- titre clair
- format
- plateforme
- étape du tunnel
- objectif
- sujet + angle
- hook
- CAPTION COMPLÈTE prête à publier
- CTA
- exactement 5 hashtags
- KPI principal
- justification reliée aux données
- si PHOTO/CARROUSEL : concept visuel + prompt image IA complet et spécifique
- si REEL/VIDÉO : durée + SCRIPT VIDÉO COMPLET + storyboard scène par scène (temps, visuel, action, voix/texte, transition)
- si STORY : chaque écran + sticker/interactivité + CTA
- si pertinent, une Story d'accompagnement du post/reel.

QUALITÉ :
- Aucun contenu vague du type « partager un moment ».
- Aucun calendrier répétitif.
- Pas de scène visuelle générique enseignante + élèves assis aux tables sauf nécessité du sujet.
- Chaque caption doit être rédigée, pas seulement décrite.
- Chaque script doit être exploitable directement par l'équipe vidéo.
- Les recommandations publicitaires doivent se baser sur les chiffres Ads disponibles et ne jamais promettre un résultat.

À LA FIN DU TEXTE HUMAIN :
- 5 décisions prioritaires
- ce qu'il faut arrêter/réduire
- ce qu'il faut amplifier
- 3 tests A/B précis
- budget/ads : recommandations de réallocation UNIQUEMENT si les données le justifient
- données manquantes à collecter

FORMAT MACHINE OBLIGATOIRE :
Après l'analyse humaine, ajoute exactement le marqueur ===PLAN_JSON=== puis un bloc JSON valide avec cette structure :
{
  "planItems": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "publishTime": "HH:MM",
      "title": "Titre compréhensible",
      "format": "post|carrousel|reel|story|video",
      "platform": "Instagram + Facebook",
      "funnelStage": "Notoriété|Confiance|Engagement|Valeur|Conversion|Communauté",
      "objective": "...",
      "topic": "...",
      "angle": "...",
      "hook": "...",
      "caption": "caption complète prête à publier",
      "cta": "...",
      "visualType": "photo|carousel|video|story",
      "imagePrompt": "prompt complet ou chaîne vide si vidéo pure",
      "videoScript": "script complet ou chaîne vide si photo",
      "storyboard": [
        {"time":"00:00-00:03","visual":"...","action":"...","voiceOrText":"...","transition":"..."}
      ],
      "companionStory": {"frames":["..."],"interaction":"...","cta":"..."},
      "hashtags": ["#1","#2","#3","#4","#5"],
      "primaryKpi": "...",
      "rationale": "...",
      "basedOnData": ["constat data 1","constat data 2"]
    }
  ]
}
N'ajoute AUCUN commentaire dans le JSON et assure-toi qu'il contient exactement ${horizon} éléments.
`;

    const generated = await generateEditorialOutput({
      agentKey,
      brand: targetBrand,
      briefData: {
        topic: `Plan Social Media professionnel ${horizon} jours basé sur les données réelles`,
        brief: strategyBrief,
        format: 'planning stratégique',
        platform: 'Instagram + Facebook + Stories + Reels + Vidéos',
        objective,
        language: 'Français',
        notes
      },
      context: `=== DONNÉES NJKPI À ANALYSER ===\n${JSON.stringify(dataContext, null, 2)}`,
      aiConfig
    });

    const planItems = extractProfessionalPlanItems(generated.output);
    const generationId = crypto.randomUUID();
    const record = {
      id: generationId,
      agentKey,
      brand: targetBrand,
      brief: {
        topic: `Plan Social Media professionnel ${horizon} jours`,
        format: 'planning stratégique',
        horizon,
        objective,
        notes
      },
      output: generated.output,
      structuredData: {
        ...(generated.structuredData || {}),
        strategyPlan: true,
        horizonDays: horizon,
        startDate,
        dataAudit: dataContext,
        planItems
      },
      storyboard: generated.storyboard,
      qualityCheck: generated.qualityCheck,
      status: 'brouillon',
      model: generated.model,
      provider: generated.provider,
      isDemo: generated.isDemo,
      createdAt: new Date().toISOString()
    };

    await saveEditorialGeneration(record);
    res.json({ ...record, dataAudit: dataContext, planItems });
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
        const recentImagePrompts = existing
          .map(c => c.data?.imagePrompt || c.data?.promptImage || '')
          .filter(Boolean)
          .slice(0, 10)
          .map((prompt, index) => `• Visuel précédent ${index + 1}: ${String(prompt).slice(0, 450)}`)
          .join('\n');

        const visualContext = recentImagePrompts
          ? `\n\nPROMPTS IMAGE RÉCENTS À NE PAS RÉPÉTER NI PARAPHRASER DE TROP PRÈS :\n${recentImagePrompts}`
          : '';

        const recentContext = `Contenus récents existants dans l’application (éviter doublons) :\n${recentTitles}${visualContext}`;
        enrichedContext = enrichedContext
          ? `${enrichedContext}\n\n${recentContext}`
          : recentContext;
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
    const { generationId, structuredData, brand, targetStatus = 'brouillon', validated = false } = req.body;
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
        validation: validated || targetStatus === 'publie' ? 'approuve' : 'a-valider'
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
    res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Nidal-Build', '20260925-25');
  }
  next();
});
// Les médias doivent rester publics pour que Meta puisse les télécharger.
app.use('/uploads', express.static(uploadsDir, {
  fallthrough: true,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));
app.use(express.static(root, { index: 'index.html', extensions: ['html'], etag: false, lastModified: false, maxAge: 0 }));
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

async function runHourlyAudienceSync() {
  for (const brand of ['nidal', 'nidal-junior']) {
    try {
      if (!metaConfigured(brand)) continue;
      const payload = await syncAudienceConversions(brand);
      await saveAudienceSnapshot(brand, payload);
      try {
        const profiles = await syncSocialProfiles({ brand });
        await saveSocialProfiles(brand, profiles);
      } catch (profileError) {
        console.warn(`Snapshot profil ${brand} différé:`, profileError.message);
      }
    } catch (error) {
      console.warn(`Snapshot audience ${brand} différé:`, error.message);
    }
  }
}

async function runPublishQueue() {
  const due = await listDuePublishJobs(10);
  for (const job of due) {
    const locked = await savePublishJob({ ...job, status: 'publishing', error: null });
    try {
      const outcome = await publishSocialJob(locked);
      await savePublishJob({
        ...locked,
        status: Object.keys(outcome.errors || {}).length ? 'partial' : 'published',
        result: outcome.result,
        error: Object.entries(outcome.errors || {}).map(([p, m]) => `${p}: ${m}`).join(' | ') || null,
        publishedAt: new Date().toISOString()
      });
    } catch (error) {
      await savePublishJob({ ...locked, status: 'failed', error: error.message });
    }
  }
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Nidal Content Hub demarre sur http://0.0.0.0:${port}`);
  initDatabase().then(async () => {
    await initAuth();
    if (process.env.META_HOURLY_SYNC_ENABLED !== 'false') {
      await runHourlyAudienceSync();
      const metaSyncSeconds = Math.max(120, Number(process.env.META_BACKGROUND_SYNC_SECONDS || 300));
      setInterval(
        () => runHourlyAudienceSync().catch(err => console.warn('Sync Meta automatique:', err.message)),
        metaSyncSeconds * 1000
      );
    }
    await runPublishQueue();
    setInterval(() => runPublishQueue().catch(err => console.warn('File publication:', err.message)), 60 * 1000);
  }).catch(error => {
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
