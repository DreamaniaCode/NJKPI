import crypto from 'node:crypto';
import dns from 'node:dns';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDatabase, databaseHealth } from './db.js';
import {
  listBrands, listContents, getContent, upsertContent, deleteContent,
  saveMetrics, saveAds, listAds, saveAgentRun, listLeads, updateLeadStatus, LEAD_STATUSES,
  saveEditorialGeneration, listEditorialGenerations, getEditorialGeneration,
  deleteEditorialGeneration, saveEditorialTransfer,
  getKpiTargets, saveKpiTargets,
  saveSocialProfiles, getSocialProfiles, getSocialProfileHistory,
  saveAudienceSnapshot, listAudienceSnapshots,
  savePublishJob, listPublishJobs, listDuePublishJobs, recoverStuckPublishJobs,
  saveMediaAsset, getMediaAsset
} from './repository.js';
import { metaConfigured, syncContentFromUrl, syncAds, syncSocialProfiles, syncAudienceConversions, publishSocialJob, diagnoseMetaAccess, preflightSocialPublishJob } from './services/meta.js';
import { startMetaSync, synchronizeBrand, syncStatus, intervalMinutes } from './services/meta-sync.js';
import { tableWorkbook } from './services/table-export.js';
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

const dnsResultOrder = ['ipv4first', 'ipv6first', 'verbatim'].includes(String(process.env.DNS_RESULT_ORDER || '').trim())
  ? String(process.env.DNS_RESULT_ORDER).trim()
  : 'ipv4first';
dns.setDefaultResultOrder(dnsResultOrder);

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadsDir = path.resolve(process.env.MEDIA_UPLOAD_DIR || path.join(root, 'uploads'));
const appTimeZone = String(process.env.APP_TIMEZONE || 'Africa/Casablanca').trim();

function mimeFromFilename(filename = '') {
  const ext = path.extname(String(filename)).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm'
  };
  return map[ext] || 'application/octet-stream';
}

async function persistLegacyUploadUrl(mediaUrl, req = null) {
  if (!mediaUrl) return mediaUrl;

  const requestBase = req ? (req.protocol + '://' + req.get('host')) : 'http://localhost';
  let parsed;
  try {
    parsed = new URL(mediaUrl, requestBase);
  } catch {
    return mediaUrl;
  }

  if (!parsed.pathname.startsWith('/uploads/')) return mediaUrl;

  const filename = path.basename(parsed.pathname);
  const localPath = path.join(uploadsDir, filename);

  let bytes;
  try {
    bytes = await fs.readFile(localPath);
  } catch {
    throw new Error(
      'Le média de cette publication n’existe plus sur le conteneur Coolify. ' +
      'Réuploadez la photo/vidéo avant de programmer : les anciens fichiers /uploads peuvent disparaître après un redeploy.'
    );
  }

  const assetId = crypto.randomUUID();
  await saveMediaAsset({
    id: assetId,
    filename,
    mimeType: mimeFromFilename(filename),
    bytes,
    size: bytes.length
  });

  const baseUrl = String(
    process.env.PUBLIC_BASE_URL
    || (parsed.origin && parsed.origin !== 'null' && parsed.origin !== 'http://localhost' ? parsed.origin : '')
    || requestBase
  ).replace(/\/$/, '');
  return baseUrl + '/media/' + assetId;
}

function zonedLocalDateTimeToUtc(dateText, timeText, timeZone = appTimeZone) {
  const matchDate = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const matchTime = String(timeText || '').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!matchDate || !matchTime) return null;

  const y = Number(matchDate[1]);
  const mo = Number(matchDate[2]);
  const d = Number(matchDate[3]);
  const h = Number(matchTime[1]);
  const mi = Number(matchTime[2]);
  const s = matchTime[3] === undefined ? 0 : Number(matchTime[3]);

  if (
    ![y, mo, d, h, mi, s].every(Number.isFinite)
    || mo < 1 || mo > 12
    || d < 1 || d > 31
    || h < 0 || h > 23
    || mi < 0 || mi > 59
    || s < 0 || s > 59
  ) {
    throw new Error('Date ou heure de publication invalide.');
  }

  const desiredWallMs = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!Number.isFinite(desiredWallMs)) {
    throw new Error('Date ou heure de publication invalide.');
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const wallMsAt = epochMs => {
    if (!Number.isFinite(epochMs)) {
      throw new Error('Date ou heure de publication invalide.');
    }
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(epochMs))
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, Number(part.value)])
    );
    const wallMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    if (!Number.isFinite(wallMs)) {
      throw new Error('Conversion du fuseau horaire impossible.');
    }
    return wallMs;
  };

  let candidate = desiredWallMs;
  for (let i = 0; i < 3; i++) {
    const observedWall = wallMsAt(candidate);
    candidate += desiredWallMs - observedWall;
  }

  const finalWall = wallMsAt(candidate);
  if (Math.abs(finalWall - desiredWallMs) > 1000) {
    throw new Error(`Heure locale invalide ou ambiguë pour le fuseau ${timeZone}.`);
  }

  const result = new Date(candidate);
  if (Number.isNaN(result.getTime())) {
    throw new Error('Date ou heure de publication invalide.');
  }
  return result;
}

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
  res.json({ build: '20261004-5', appVersion: process.env.APP_VERSION || null, now: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  const hasMeta = metaConfigured('nidal') || metaConfigured('nidal-junior');
  res.json({
    ok: true,
    database: await databaseHealth(),
    demoMode: process.env.DEMO_MODE === 'true',
    runtime: { node: process.version, dnsResultOrder: dns.getDefaultResultOrder(), appTimeZone },
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

app.post('/api/export/table.xlsx', authorize('admin', 'editor', 'viewer'), async (req, res, next) => {
  try {
    const buffer = await tableWorkbook(req.body);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="nidal-donnees.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(buffer));
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
const validBrand = value => ['nidal', 'nidal-junior'].includes(value);
app.get('/api/meta/status', (req, res) => {
  const brand = req.query.brand || 'nidal-junior';
  if (!validBrand(brand)) return res.status(400).json({ error: 'Marque invalide' });
  res.json({ ...syncStatus(brand), intervalMinutes, automatic: process.env.META_AUTO_SYNC !== 'false' && process.env.DEMO_MODE !== 'true', demo: process.env.DEMO_MODE === 'true' });
});
app.get('/api/leads', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const brand = req.query.brand || 'nidal-junior';
  if (!validBrand(brand)) return res.status(400).json({ error: 'Marque invalide' });
  try { res.json(await listLeads(brand)); } catch (error) { next(error); }
});
app.put('/api/leads/:id/status', authorize('admin', 'editor'), async (req, res, next) => {
  const brand = req.body.brand || 'nidal-junior';
  if (!validBrand(brand)) return res.status(400).json({ error: 'Marque invalide' });
  if (!LEAD_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide : RDV, Refus, Reporté ou En attente' });
  try {
    const lead = await updateLeadStatus(brand, req.params.id, req.body.status);
    if (!lead) return res.status(404).json({ error: 'Lead introuvable' });
    res.json(lead);
  } catch (error) { next(error); }
});
app.post('/api/meta/sync', authorize('admin', 'editor'), async (req, res, next) => {
  const brand = req.body.brand || 'nidal-junior';
  if (!validBrand(brand)) return res.status(400).json({ error: 'Marque invalide' });
  try { res.json(await synchronizeBrand(brand)); } catch (error) { next(error); }
});
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
    const assetId = crypto.randomUUID();
    const filename = `${Date.now()}-${assetId}${normalized.ext}`;

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), normalized.buffer);

    await saveMediaAsset({
      id: assetId,
      filename,
      mimeType: normalized.mime,
      bytes: normalized.buffer,
      size: normalized.buffer.length
    });

    const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.status(201).json({
      ok: true,
      assetId,
      filename,
      originalName: rawName,
      mime: normalized.mime,
      originalMime: mime,
      convertedForMeta: normalized.converted,
      size: normalized.buffer.length,
      path: `/media/${assetId}`,
      url: `${baseUrl}/media/${assetId}`,
      persistent: true
    });
  } catch (error) { next(error); }
});

app.get('/media/:id', async (req, res, next) => {
  try {
    const asset = await getMediaAsset(req.params.id);
    if (!asset) return res.sendStatus(404);

    const bytes = Buffer.isBuffer(asset.bytes) ? asset.bytes : Buffer.from(asset.bytes || []);
    res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(bytes);
  } catch (error) {
    next(error);
  }
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
    const requestedPlatforms = Array.isArray(req.body.platforms)
      ? req.body.platforms.filter(p => ['instagram', 'facebook'].includes(p))
      : [];
    const platforms = brand === 'nidal-junior'
      ? requestedPlatforms.filter(p => p === 'instagram')
      : requestedPlatforms;
    if (!platforms.length) {
      return res.status(400).json({
        error: brand === 'nidal-junior'
          ? 'Nidal Junior publie uniquement sur Instagram.'
          : 'Sélectionnez Instagram et/ou Facebook.'
      });
    }

    if (brand === 'nidal-junior' && platforms.includes('instagram')) {
      const diagnostic = await diagnoseMetaAccess('nidal-junior');
      if (!diagnostic.instagramDirectTokenConfigured) {
        return res.status(400).json({
          error: 'Instagram Nidal Junior non connecté : META_IG_ACCESS_TOKEN_NIDAL_JUNIOR n’est pas configuré sur le serveur.',
          code: 'NIDAL_JUNIOR_INSTAGRAM_TOKEN_MISSING',
          diagnostic
        });
      }
      if (!diagnostic.instagramDirectTokenValid) {
        return res.status(400).json({
          error: 'Le token Instagram Login de Nidal Junior est invalide ou ne permet pas d’accéder au compte professionnel.',
          code: 'NIDAL_JUNIOR_INSTAGRAM_TOKEN_INVALID',
          diagnostic
        });
      }
    }

    if (!String(req.body.message || '').trim() && !req.body.mediaUrl && !req.body.linkUrl) {
      return res.status(400).json({ error: 'Ajoutez un texte, un média ou un lien.' });
    }

    const rawMetadata = req.body.metadata && typeof req.body.metadata === 'object'
      ? req.body.metadata
      : {};

    const requestedTimezone = appTimeZone;

    let scheduledAt;
    if (
      req.body.automationMode === 'scheduled'
      && rawMetadata.localDate
      && rawMetadata.localTime
    ) {
      try {
        scheduledAt = zonedLocalDateTimeToUtc(
          String(rawMetadata.localDate),
          String(rawMetadata.localTime),
          requestedTimezone
        );
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    if (!scheduledAt) {
      scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
    }

    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: 'Date de publication invalide.' });
    }

    const metadata = {
      title: String(rawMetadata.title || '').slice(0, 250),
      hashtags: Array.isArray(rawMetadata.hashtags)
        ? rawMetadata.hashtags.map(tag => String(tag).slice(0, 100)).slice(0, 30)
        : [],
      contentId: rawMetadata.contentId ? String(rawMetadata.contentId).slice(0, 150) : null,
      imagePrompt: String(rawMetadata.imagePrompt || '').slice(0, 12000),
      videoScript: String(rawMetadata.videoScript || '').slice(0, 20000),
      storyboard: Array.isArray(rawMetadata.storyboard) ? rawMetadata.storyboard.slice(0, 100) : [],
      timezone: requestedTimezone.slice(0, 100),
      clientTimezone: String(rawMetadata.timezone || '').slice(0, 100),
      localDate: String(rawMetadata.localDate || '').slice(0, 20),
      localTime: String(rawMetadata.localTime || '').slice(0, 10),
      scheduledUtc: scheduledAt.toISOString()
    };

    let persistentMediaUrl = req.body.mediaUrl || null;
    if (persistentMediaUrl) {
      try {
        persistentMediaUrl = await persistLegacyUploadUrl(persistentMediaUrl, req);
      } catch (error) {
        return res.status(400).json({
          error: error.message,
          code: 'MEDIA_NOT_PERSISTENT'
        });
      }
    }

    const pendingJob = {
      id: crypto.randomUUID(),
      brand,
      message: String(req.body.message || ''),
      mediaUrl: persistentMediaUrl,
      linkUrl: req.body.linkUrl || null,
      mediaType: req.body.mediaType || (req.body.mediaUrl ? 'image' : 'text'),
      platforms,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
      automationMode: req.body.automationMode || 'manual',
      metadata
    };

    let preflight;
    try {
      preflight = await preflightSocialPublishJob(pendingJob);
    } catch (error) {
      return res.status(400).json({
        error: 'Pré-test Meta impossible : ' + (error?.message || error),
        code: 'META_PUBLISH_PREFLIGHT_FAILED'
      });
    }

    pendingJob.metadata = {
      ...pendingJob.metadata,
      preflight
    };

    const job = await savePublishJob(pendingJob);

    if (
      metadata.contentId
      && persistentMediaUrl
      && persistentMediaUrl !== req.body.mediaUrl
    ) {
      try {
        const linkedContent = await getContent(metadata.contentId);
        if (linkedContent) {
          await upsertContent({
            id: linkedContent.id,
            brand_slug: linkedContent.brand_slug,
            data: {
              ...(linkedContent.data || {}),
              mediaUrl: persistentMediaUrl
            },
            finalUrl: linkedContent.final_url,
            externalMediaId: linkedContent.external_media_id,
            platform: linkedContent.platform,
            syncStatus: linkedContent.sync_status,
            lastSyncedAt: linkedContent.last_synced_at
          });
        }
      } catch (contentMediaError) {
        console.warn('Migration URL média dans le contenu différée:', contentMediaError.message);
      }
    }

    res.status(201).json(job);
  } catch (error) { next(error); }
});

async function markContentPublishedFromJob(job, outcome) {
  const contentId = job?.metadata?.contentId;
  if (!contentId) return;

  try {
    const content = await getContent(contentId);
    if (!content) return;

    const result = outcome?.result || {};
    const platformResult = result.instagram || result.facebook || {};
    const now = new Date().toISOString();
    const finalUrl = platformResult.permalink || content.final_url || content.data?.finalUrl || '';
    const externalMediaId = platformResult.id || platformResult.media_id || content.external_media_id || null;

    await upsertContent({
      id: content.id,
      brand_slug: content.brand_slug,
      data: {
        ...(content.data || {}),
        statut: 'publie',
        validation: 'approuve',
        finalUrl,
        publishedAt: now,
        mediaUrl: content.data?.mediaUrl || job.media_url || '',
        tags: Array.isArray(content.data?.tags) && content.data.tags.length
          ? content.data.tags
          : (Array.isArray(job.metadata?.hashtags) ? job.metadata.hashtags : []),
        hashtags: Array.isArray(content.data?.hashtags) && content.data.hashtags.length
          ? content.data.hashtags
          : (Array.isArray(job.metadata?.hashtags) ? job.metadata.hashtags : []),
        imagePrompt: content.data?.imagePrompt || job.metadata?.imagePrompt || '',
        videoScript: content.data?.videoScript || job.metadata?.videoScript || '',
        storyboard: Array.isArray(content.data?.storyboard) && content.data.storyboard.length
          ? content.data.storyboard
          : (Array.isArray(job.metadata?.storyboard) ? job.metadata.storyboard : [])
      },
      finalUrl,
      externalMediaId,
      platform: content.platform,
      syncStatus: 'connected',
      lastSyncedAt: now
    });
  } catch (error) {
    console.warn('Mise à jour du contenu après publication Meta:', error.message);
  }
}

app.post('/api/publish/jobs/:id/run', authenticate, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const jobs = await listPublishJobs(null, 500);
    const job = jobs.find(item => item.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Publication programmée introuvable.' });

    let runnableJob = job;
    if (job.media_url && String(job.media_url).includes('/uploads/')) {
      try {
        runnableJob = {
          ...job,
          mediaUrl: await persistLegacyUploadUrl(job.media_url, req),
          metadata: {
            ...(job.metadata || {}),
            legacyMediaMigratedAt: new Date().toISOString(),
            legacyMediaUrl: job.media_url
          }
        };
      } catch (mediaError) {
        const failed = await savePublishJob({
          ...job,
          status: 'failed',
          error: mediaError.message
        });
        return res.status(400).json(failed);
      }
    }

    const publishing = await savePublishJob({ ...runnableJob, status: 'publishing', error: null });
    try {
      const outcome = await publishSocialJob(publishing);
      await markContentPublishedFromJob(publishing, outcome);
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

app.post('/api/publish/queue/run', authenticate, authorize('admin', 'editor'), async (_req, res, next) => {
  try {
    await runPublishQueue();
    res.json({ ok: true, scheduler: { ...publishQueueState } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/publish/jobs/:id/retry', authenticate, authorize('admin', 'editor'), async (req, res, next) => {
  try {
    const jobs = await listPublishJobs(null, 500);
    const job = jobs.find(item => item.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Publication introuvable.' });
    if (!['failed', 'partial'].includes(job.status)) {
      return res.status(400).json({ error: `Le statut ${job.status} ne nécessite pas de réessai.` });
    }

    const retryAt = new Date(Date.now() + 2000).toISOString();
    const updated = await savePublishJob({
      ...job,
      status: 'scheduled',
      scheduledAt: retryAt,
      error: null,
      publishedAt: null,
      metadata: {
        ...(job.metadata || {}),
        retryCount: 0,
        manualRetryAt: new Date().toISOString(),
        originalScheduledAt: job.metadata?.originalScheduledAt || job.scheduled_at
      }
    });

    setTimeout(() => {
      runPublishQueue().catch(err => console.warn('Réessai publication:', err.message));
    }, 2500);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get('/api/publish/queue/status', authenticate, authorize('admin', 'editor'), async (_req, res, next) => {
  try {
    const jobs = await listPublishJobs(null, 500);
    const now = Date.now();
    const scheduled = jobs.filter(job => job.status === 'scheduled');
    const overdue = scheduled.filter(job => new Date(job.scheduled_at).getTime() <= now);
    const nextJob = scheduled
      .filter(job => new Date(job.scheduled_at).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] || null;

    const localNow = new Intl.DateTimeFormat('fr-CA', {
      timeZone: appTimeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    }).format(new Date());

    res.json({
      ok: true,
      now: new Date().toISOString(),
      timezone: appTimeZone,
      localNow,
      scheduler: { ...publishQueueState },
      counts: {
        total: jobs.length,
        scheduled: scheduled.length,
        overdue: overdue.length,
        publishing: jobs.filter(job => job.status === 'publishing').length,
        failed: jobs.filter(job => job.status === 'failed').length,
        partial: jobs.filter(job => job.status === 'partial').length,
        published: jobs.filter(job => job.status === 'published').length
      },
      overdueJobs: overdue.slice(0, 10).map(job => ({
        id: job.id,
        brand: job.brand_slug,
        scheduledAt: job.scheduled_at,
        platforms: job.platforms,
        error: job.error || null
      })),
      nextJob: nextJob ? {
        id: nextJob.id,
        brand: nextJob.brand_slug,
        scheduledAt: nextJob.scheduled_at,
        platforms: nextJob.platforms
      } : null
    });
  } catch (error) {
    next(error);
  }
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

app.post('/api/editorial/provider-test', async (req, res) => {
  const startedAt = Date.now();
  const aiConfig = req.body?.aiConfig || {};

  try {
    const result = await generateEditorialOutput({
      agentKey: 'studio-junior',
      brand: 'nidal-junior',
      briefData: {
        topic: 'Test technique API',
        brief: 'Réponds exactement par OK, sans autre texte.',
        format: 'test',
        platform: 'NJKPI',
        objective: 'Vérifier la connectivité API',
        language: 'Français'
      },
      context: '',
      aiConfig: { ...aiConfig, testMode: true }
    });

    res.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt,
      output: String(result.output || '').slice(0, 120)
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      provider: aiConfig.provider || getAiProvider(),
      model: aiConfig.model || null,
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error)
    });
  }
});

app.get('/api/editorial/generations', async (req, res, next) => {
  try {
    const list = await listEditorialGenerations(req.query.agent, req.query.brand);
    res.json(list);
  } catch (error) { next(error); }
});

function compactAiContext(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[reduit]';
  if (typeof value === 'string') return value.length > 1200 ? value.slice(0, 1200) + '…' : value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => compactAiContext(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, compactAiContext(item, depth + 1)]));
  }
  return value;
}
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

async function buildProfessionalPlan(body = {}, onProgress = () => {}) {
  const reportProgress = (progress, message, detail = '', meta = {}) => {
    try {
      onProgress({
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        message,
        detail,
        ...meta
      });
    } catch {}
  };

  try {
    const {
      brand = 'nidal',
      days = 30,
      objective = 'croissance, engagement et inscriptions',
      language = 'Français',
      audience: requestedAudience = '',
      notes = '',
      aiConfig = {}
    } = body || {};

    const targetBrand = brand === 'nidal-junior' ? 'nidal-junior' : 'nidal';
    const juniorInstagramOnly = targetBrand === 'nidal-junior';
    const agentKey = targetBrand === 'nidal' ? 'planning-nidal' : 'studio-junior';
    const horizon = [7, 14, 30].includes(Number(days)) ? Number(days) : 30;
    const planAiConfig = { ...aiConfig, planMode: true };

    // Le plan Cloudflare utilise réellement Llama Fast en première intention :
    // refléter ce choix dans le job et dans les lots suivants, au lieu d'afficher
    // Qwen alors qu'il n'est pas envoyé en premier.
    if (
      String(planAiConfig.provider || '').toLowerCase() === 'cloudflare'
      && String(planAiConfig.model || '') === '@cf/qwen/qwen3.8-27b'
    ) {
      planAiConfig.model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    }

    reportProgress(
      10,
      'Collecte des données NJKPI',
      'Chargement des contenus, KPI, profils sociaux, audience et campagnes Meta Ads.',
      { stage: 'data', provider: planAiConfig.provider || 'auto', model: planAiConfig.model || 'auto', totalDays: horizon }
    );

    const [contents, targetsRecord, socialProfiles, audienceRows, ads] = await Promise.all([
      listContents(targetBrand).catch(() => []),
      getKpiTargets(targetBrand).catch(() => ({ targets: {} })),
      getSocialProfiles(targetBrand).catch(() => ({})),
      listAudienceSnapshots(targetBrand, 3).catch(() => []),
      listAds(targetBrand).catch(() => [])
    ]);

    reportProgress(
      22,
      'Données NJKPI chargées',
      `${(contents || []).length} contenus · ${(ads || []).length} campagnes Ads · audience et profils sociaux prêts pour l’analyse.`,
      { stage: 'data-ready', provider: planAiConfig.provider || 'auto', model: planAiConfig.model || 'auto', totalDays: horizon }
    );

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

    const rawAudience = audienceRows?.[0]?.payload || null;
    const audience = juniorInstagramOnly && rawAudience
      ? {
          brand: targetBrand,
          syncedAt: rawAudience.syncedAt || null,
          instagram: rawAudience.instagram || null,
          facebook: null
        }
      : rawAudience;
    const igProfile = socialProfiles?.instagram?.profile || socialProfiles?.instagram || null;
    const fbProfile = juniorInstagramOnly
      ? null
      : (socialProfiles?.facebook?.profile || socialProfiles?.facebook || null);

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
      kpiTargets: juniorInstagramOnly
        ? Object.fromEntries(
            Object.entries(targetsRecord?.targets || {})
              .filter(([key]) => !/^facebook/i.test(key))
              .map(([key, value]) => [
                key,
                {
                  target: value?.target ?? null,
                  eta: value?.eta ?? null,
                  note: value?.note || ''
                }
              ])
          )
        : (targetsRecord?.targets || {}),
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
        facebook: !juniorInstagramOnly && fbProfile ? {
          followers: fbProfile.followers ?? fbProfile.followers_count ?? null,
          reach: fbProfile.insights?.reach ?? null,
          views: fbProfile.insights?.views ?? null,
          interactions: fbProfile.insights?.interactions ?? null,
          comments: fbProfile.insights?.comments ?? null,
          syncedAt: socialProfiles?.facebook?.synced_at || null
        } : null
      },
      audienceSnapshot: compactAiContext(audience),
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
LANGUE OBLIGATOIRE DES CONTENUS : ${language || 'Français'}
PUBLIC CIBLE OBLIGATOIRE : ${requestedAudience || (juniorInstagramOnly ? 'Parents et familles Nidal Junior' : 'Parents, élèves et communauté GS Nidal')}
RÈGLE LANGUE/PUBLIC : chaque caption, hook, CTA, script, texte à l’écran et slide doit respecter cette langue et ce public. Le français n’est PAS autorisé par défaut si une autre langue est demandée.
PLATEFORME : ${juniorInstagramOnly ? 'Instagram Nidal Junior UNIQUEMENT' : 'Instagram + Facebook'}
${juniorInstagramOnly ? 'RÈGLE ABSOLUE : ne propose jamais Facebook, ne mélange aucun KPI GS Nidal, et chaque contenu doit être publiable sur Instagram.' : ''}
${notes ? `NOTES DU RESPONSABLE : ${notes}` : ''}

ANALYSE PROFONDE OBLIGATOIRE :
1. Audite les contenus organiques existants : formats, fréquence, sujets, meilleurs résultats, contenus faibles, répétitions et manques.
2. ${juniorInstagramOnly
  ? 'Analyse UNIQUEMENT Instagram Nidal Junior. Ignore totalement Facebook : cette marque n’a pas de Page Facebook.'
  : 'Analyse séparément Instagram et Facebook avec uniquement les métriques réellement disponibles.'}
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

    const dataContextText = `=== DONNÉES NJKPI À ANALYSER ===\n${JSON.stringify(dataContext, null, 2)}`;

    // Étape 1 : diagnostic stratégique court.
    reportProgress(
      30,
      'Diagnostic stratégique par l’IA',
      'Analyse des performances, formats, audience, conversions et Meta Ads.',
      { stage: 'diagnostic', provider: planAiConfig.provider || 'auto', model: planAiConfig.model || 'auto', totalDays: horizon }
    );

    let analysisGenerated;
    try {
      analysisGenerated = await generateEditorialOutput({
      agentKey,
      brand: targetBrand,
      briefData: {
        topic: 'Diagnostic Social Media & Growth basé sur les données réelles',
        brief: `
Analyse uniquement les données NJKPI ci-dessous.
Ne génère PAS encore le calendrier complet.
Livre un diagnostic professionnel, concret et priorisé :
- forces / faiblesses ;
- formats sous-utilisés ;
- problèmes détectés ;
- preuve chiffrée quand disponible ;
- hypothèses clairement signalées ;
- solutions ;
- KPI de validation ;
- ${juniorInstagramOnly ? 'Audience et performance Instagram uniquement' : 'Meta Ads / Audience / Conversions'} ;
- 5 priorités opérationnelles.
Réponse concise mais profonde, sans JSON.
`,
        format: 'analyse stratégique',
        platform: juniorInstagramOnly ? 'Instagram' : 'Instagram + Facebook + Meta Ads',
        objective,
        language: 'Français',
        notes
      },
      context: dataContextText,
      aiConfig: planAiConfig
    });
    } catch (error) {
      const activeProvider = planAiConfig.provider || 'auto';
      const activeModel = planAiConfig.model || 'auto';
      throw new Error(
        `Diagnostic stratégique — ${activeProvider}/${activeModel} : ${error?.message || error}`
      );
    }

    reportProgress(
      42,
      'Diagnostic stratégique terminé',
      `Réponse obtenue via ${analysisGenerated.provider || 'IA'} · ${analysisGenerated.model || 'modèle automatique'}.`,
      {
        stage: 'diagnostic-done',
        provider: analysisGenerated.provider || planAiConfig.provider || 'auto',
        model: analysisGenerated.model || planAiConfig.model || 'auto',
        totalDays: horizon
      }
    );

    // Si Gemini 3.8 est saturé et que l'étape diagnostic a réussi via un
    // modèle de secours, conserver ce modèle pour tous les lots suivants.
    // Même logique si la génération a dû basculer vers OpenRouter côté serveur.
    let effectivePlanAiConfig = {
      ...planAiConfig,
      provider: analysisGenerated.provider || aiConfig.provider,
      model: analysisGenerated.model || aiConfig.model,
      apiKey: analysisGenerated.provider && aiConfig.provider
        && analysisGenerated.provider !== aiConfig.provider
        ? ''
        : (aiConfig.apiKey || '')
    };

    // Étape 2 : produire le calendrier par petits lots.
    // Un seul appel pour 30 captions + scripts + prompts dépassait souvent 150 s.
    const planItems = [];
    const batchSize = 5;
    for (let offset = 0; offset < horizon; offset += batchSize) {
      const count = Math.min(batchSize, horizon - offset);
      const batchStartDate = new Date(startDate + 'T00:00:00Z');
      batchStartDate.setUTCDate(batchStartDate.getUTCDate() + offset);
      const batchStartIso = batchStartDate.toISOString().slice(0, 10);

      const batchBrief = `
Tu construis les jours ${offset + 1} à ${offset + count} du calendrier Social Media ${juniorInstagramOnly ? 'Nidal Junior' : 'Nidal'}.
Le diagnostic stratégique est fourni dans le contexte.
Crée EXACTEMENT ${count} contenus à partir du ${batchStartIso}.
LANGUE OBLIGATOIRE DE CHAQUE CONTENU : ${language || 'Français'}.
PUBLIC CIBLE OBLIGATOIRE : ${requestedAudience || (juniorInstagramOnly ? 'Parents et familles Nidal Junior' : 'Parents, élèves et communauté GS Nidal')}.
Adapte hooks, captions, CTA, scripts et visuels à ce public. N'utilise pas le français si une autre langue a été demandée.
${juniorInstagramOnly ? 'PLATEFORME OBLIGATOIRE POUR CHAQUE CONTENU : Instagram uniquement. Ne mentionne jamais Facebook.' : ''}

Pour chaque jour : date, heure, titre clair, format, plateforme, tunnel, objectif,
sujet, angle, hook, caption complète prête à publier, CTA, 5 hashtags, KPI,
justification liée aux données, prompt photo si visuel, script vidéo complet +
storyboard si Reel/Vidéo, Story associée si pertinent.

Réponds UNIQUEMENT avec :
===PLAN_JSON===
{"planItems":[...]}
JSON valide, sans commentaire avant ou après.
`;

      const batchStartProgress = 45 + Math.floor((offset / horizon) * 48);
      reportProgress(
        batchStartProgress,
        `Création du planning · jours ${offset + 1} à ${offset + count}`,
        `Génération des contenus prêts à publier avec ${effectivePlanAiConfig.provider || 'auto'} · ${effectivePlanAiConfig.model || 'modèle automatique'}.`,
        {
          stage: 'planning-batch',
          provider: effectivePlanAiConfig.provider || 'auto',
          model: effectivePlanAiConfig.model || 'auto',
          completedDays: offset,
          totalDays: horizon
        }
      );

      let batchGenerated;
      try {
        batchGenerated = await generateEditorialOutput({
          agentKey,
          brand: targetBrand,
          briefData: {
            topic: `Planning Social Media jours ${offset + 1}-${offset + count}`,
            brief: batchBrief,
            format: 'planning stratégique batch',
            platform: juniorInstagramOnly ? 'Instagram + Stories + Reels + Vidéos' : 'Instagram + Facebook + Stories + Reels + Vidéos',
            objective,
            language: 'Français',
            notes
          },
          context: `${dataContextText}\n\n=== DIAGNOSTIC STRATÉGIQUE ===\n${analysisGenerated.output.slice(0, 12000)}`,
          aiConfig: effectivePlanAiConfig
        });
      } catch (error) {
        const activeProvider = effectivePlanAiConfig.provider || 'auto';
        const activeModel = effectivePlanAiConfig.model || 'auto';
        throw new Error(
          `Planning jours ${offset + 1}-${offset + count} — ${activeProvider}/${activeModel} : ${error?.message || error}`
        );
      }

      // Si un lot a dû changer de modèle/fournisseur, conserver ce choix pour
      // les lots suivants afin de ne pas retenter un modèle déjà saturé.
      if (batchGenerated.provider || batchGenerated.model) {
        const providerChanged = batchGenerated.provider
          && effectivePlanAiConfig.provider
          && batchGenerated.provider !== effectivePlanAiConfig.provider;
        effectivePlanAiConfig = {
          ...effectivePlanAiConfig,
          provider: batchGenerated.provider || effectivePlanAiConfig.provider,
          model: batchGenerated.model || effectivePlanAiConfig.model,
          apiKey: providerChanged ? '' : (effectivePlanAiConfig.apiKey || ''),
          planMode: true
        };
      }

      const batchItems = extractProfessionalPlanItems(batchGenerated.output);
      for (let i = 0; i < batchItems.length && i < count; i++) {
        const item = batchItems[i];
        item.dayNumber = offset + i + 1;
        if (!item.date) {
          const d = new Date(startDate + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + offset + i);
          item.date = d.toISOString().slice(0, 10);
        }
        if (juniorInstagramOnly) {
          item.platform = 'Instagram';
        }
        planItems.push(item);
      }

      reportProgress(
        45 + Math.floor(((offset + count) / horizon) * 48),
        `Planning généré · ${Math.min(offset + count, horizon)}/${horizon} jours`,
        `Dernier lot traité via ${batchGenerated.provider || effectivePlanAiConfig.provider || 'IA'} · ${batchGenerated.model || effectivePlanAiConfig.model || 'modèle automatique'}.`,
        {
          stage: 'planning-progress',
          provider: batchGenerated.provider || effectivePlanAiConfig.provider || 'auto',
          model: batchGenerated.model || effectivePlanAiConfig.model || 'auto',
          completedDays: Math.min(offset + count, horizon),
          totalDays: horizon
        }
      );
    }

    const generated = {
      ...analysisGenerated,
      output: `${analysisGenerated.output}\n\n===PLAN_JSON===\n${JSON.stringify({ planItems }, null, 2)}`
    };

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

    reportProgress(
      96,
      'Finalisation du plan',
      'Contrôle du calendrier et enregistrement du résultat dans NJKPI.',
      {
        stage: 'saving',
        provider: generated.provider || effectivePlanAiConfig.provider || 'auto',
        model: generated.model || effectivePlanAiConfig.model || 'auto',
        completedDays: horizon,
        totalDays: horizon
      }
    );

    await saveEditorialGeneration(record);

    reportProgress(
      99,
      'Plan enregistré',
      `${horizon} jours prêts à être affichés.`,
      {
        stage: 'saved',
        provider: generated.provider || effectivePlanAiConfig.provider || 'auto',
        model: generated.model || effectivePlanAiConfig.model || 'auto',
        completedDays: horizon,
        totalDays: horizon
      }
    );
    return { ...record, dataAudit: dataContext, planItems };
  } catch (error) {
    throw error;
  }
}

const professionalPlanJobs = new Map();

app.post('/api/editorial/pro-plan', async (req, res) => {
  const jobId = crypto.randomUUID();
  professionalPlanJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    progress: 5,
    message: 'Analyse mise en file d’attente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null,
    detail: 'Initialisation du job d’analyse.',
    stage: 'queued',
    provider: req.body?.aiConfig?.provider || 'auto',
    model: req.body?.aiConfig?.model || 'auto',
    completedDays: 0,
    totalDays: [7, 14, 30].includes(Number(req.body?.days)) ? Number(req.body.days) : 30
  });

  res.status(202).json({ jobId, status: 'queued', progress: 5 });

  setImmediate(async () => {
    const job = professionalPlanJobs.get(jobId);
    if (!job) return;
    job.status = 'running';
    job.progress = 8;
    job.message = 'Démarrage de l’analyse';
    job.detail = 'Préparation de la collecte des données NJKPI.';
    job.stage = 'starting';
    job.updatedAt = new Date().toISOString();

    try {
      const result = await buildProfessionalPlan(req.body || {}, update => {
        Object.assign(job, update, {
          status: 'running',
          updatedAt: new Date().toISOString()
        });
      });
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Analyse et planning terminés';
      job.detail = 'Le plan professionnel est prêt.';
      job.stage = 'completed';
      job.completedDays = job.totalDays;
      job.provider = result?.provider || job.provider;
      job.model = result?.model || job.model;
      job.result = result;
      job.updatedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'failed';
      job.progress = 100;
      job.message = 'Échec de l’analyse';
      job.detail = error?.message || String(error);
      job.stage = 'failed';
      job.error = error?.message || String(error);
      job.updatedAt = new Date().toISOString();
    }

    setTimeout(() => professionalPlanJobs.delete(jobId), 30 * 60 * 1000);
  });
});

app.get('/api/editorial/pro-plan/:jobId', async (req, res) => {
  const job = professionalPlanJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Analyse introuvable ou expirée', code: 'PLAN_JOB_NOT_FOUND' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    detail: job.detail,
    stage: job.stage,
    provider: job.provider,
    model: job.model,
    completedDays: job.completedDays,
    totalDays: job.totalDays,
    error: job.error,
    result: job.status === 'completed' ? job.result : undefined,
    updatedAt: job.updatedAt
  });
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

// Une route /api inconnue ne doit jamais tomber sur index.html : le client
// attend du JSON et doit recevoir une erreur exploitable, même pendant un déploiement.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Route API introuvable: ${req.method} ${req.originalUrl}`,
    code: 'API_ROUTE_NOT_FOUND'
  });
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
    res.setHeader('X-Nidal-Build', '20261004-5');
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

const publishQueueState = {
  startedAt: null,
  lastTickAt: null,
  lastCompletedAt: null,
  lastError: null,
  lastDueCount: 0,
  lastProcessedIds: [],
  running: false,
  intervalSeconds: null
};

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

let publishQueueRunning = false;

function isRetryablePublishError(error, retryCount = 0) {
  if (Number(retryCount) >= 4) return false;

  const message = String(error?.message || error || '').toLowerCase();

  const permanent = /permission|missing permission|does not have permission|access token|oauth|not authorized|unsupported request|invalid parameter|invalid media|file type|account.*disabled|user.*disabled/.test(message);
  if (permanent) return false;

  return /timeout|timed\s*out|timedout|etimedout|temporar|network|fetch|download|media upload|processing|in_progress|econn|eai_again|rate.?limit|unavailable|try again|please wait|server error|http 5\d\d|5\d\d|n'est pas encore visible|n'a pas pu être confirmée/.test(message);
}

async function runPublishQueue() {
  if (publishQueueRunning) return;
  publishQueueRunning = true;
  publishQueueState.running = true;
  publishQueueState.lastTickAt = new Date().toISOString();
  publishQueueState.lastError = null;
  publishQueueState.lastProcessedIds = [];

  try {
    const due = await listDuePublishJobs(20);
    publishQueueState.lastDueCount = due.length;

    for (const job of due) {
      publishQueueState.lastProcessedIds.push(job.id);

      let effectiveJob = job;
      if (job.media_url && String(job.media_url).includes('/uploads/')) {
        try {
          const migratedMediaUrl = await persistLegacyUploadUrl(job.media_url);
          effectiveJob = {
            ...job,
            mediaUrl: migratedMediaUrl,
            metadata: {
              ...(job.metadata || {}),
              legacyMediaMigratedAt: new Date().toISOString(),
              legacyMediaUrl: job.media_url
            }
          };
        } catch (mediaError) {
          await savePublishJob({
            ...job,
            status: 'failed',
            error: mediaError.message,
            metadata: {
              ...(job.metadata || {}),
              lastRetryError: mediaError.message
            }
          });
          continue;
        }
      }

      const locked = await savePublishJob({ ...effectiveJob, status: 'publishing', error: null });
      try {
        const outcome = await publishSocialJob(locked);
        await markContentPublishedFromJob(locked, outcome);

        const outcomeErrors = Object.entries(outcome.errors || {});
        await savePublishJob({
          ...locked,
          status: outcomeErrors.length ? 'partial' : 'published',
          result: outcome.result,
          error: outcomeErrors.map(([p, m]) => `${p}: ${m}`).join(' | ') || null,
          publishedAt: new Date().toISOString()
        });
      } catch (error) {
        // Ne pas perdre définitivement un job sur une erreur réseau/transitoire.
        // On conserve l'erreur visible et on effectue jusqu'à 3 tentatives.
        const retryCount = Number(locked.metadata?.retryCount || 0);
        const canRetry = isRetryablePublishError(error, retryCount);

        if (canRetry) {
          const retryDelaysMinutes = [1, 2, 5, 10];
          const delayMinutes = retryDelaysMinutes[Math.min(retryCount, retryDelaysMinutes.length - 1)];
          const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          await savePublishJob({
            ...locked,
            status: 'scheduled',
            scheduledAt: retryAt,
            error: `Tentative ${retryCount + 1}/5 échouée : ${error.message}. Nouvel essai prévu dans ${delayMinutes} min.`,
            metadata: {
              ...(locked.metadata || {}),
              retryCount: retryCount + 1,
              originalScheduledAt: locked.metadata?.originalScheduledAt || locked.scheduled_at,
              lastRetryError: error.message,
              nextRetryAt: retryAt
            }
          });
        } else {
          await savePublishJob({
            ...locked,
            status: 'failed',
            error: error.message,
            metadata: {
              ...(locked.metadata || {}),
              lastRetryError: error.message
            }
          });
        }
      }
    }

    publishQueueState.lastCompletedAt = new Date().toISOString();
  } catch (error) {
    publishQueueState.lastError = error?.message || String(error);
    throw error;
  } finally {
    publishQueueRunning = false;
    publishQueueState.running = false;
  }
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Nidal Content Hub demarre sur http://0.0.0.0:${port}`);

  // Le scheduler est un service critique : il démarre immédiatement.
  // Il ne dépend plus de la fin des migrations legacy ni de la synchro KPI.
  const publishQueueSeconds = Math.max(2, Number(process.env.PUBLISH_QUEUE_SECONDS || 5));
  publishQueueState.startedAt = new Date().toISOString();
  publishQueueState.intervalSeconds = publishQueueSeconds;

  recoverStuckPublishJobs(
    Number(process.env.PUBLISH_STUCK_MINUTES || 10)
  ).then(recoveredPublishingJobs => {
    if (recoveredPublishingJobs) {
      console.warn(`${recoveredPublishingJobs} publication(s) interrompue(s) marquée(s) à vérifier après redémarrage.`);
    }
  }).catch(error => {
    console.warn('Récupération initiale de la file différée:', error.message);
  });

  runPublishQueue().catch(err => console.warn('File publication initiale:', err.message));
  setInterval(
    () => runPublishQueue().catch(err => console.warn('File publication:', err.message)),
    publishQueueSeconds * 1000
  );
  console.log(`File de publication active toutes les ${publishQueueSeconds}s.`);

  // Initialisation complète et services non critiques en parallèle.
  initDatabase().then(async () => {
    await initAuth();
    startMetaSync();

    if (process.env.META_HOURLY_SYNC_ENABLED !== 'false') {
      const metaSyncSeconds = Math.max(120, Number(process.env.META_BACKGROUND_SYNC_SECONDS || 300));
      runHourlyAudienceSync().catch(err => console.warn('Sync Meta initiale:', err.message));
      setInterval(
        () => runHourlyAudienceSync().catch(err => console.warn('Sync Meta automatique:', err.message)),
        metaSyncSeconds * 1000
      );
    }
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
