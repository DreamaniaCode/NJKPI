const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

function rawBrandEnv(prefix, brand) {
  return process.env[`${prefix}_${brand === 'nidal-junior' ? 'NIDAL_JUNIOR' : 'NIDAL'}`];
}

function nidalJuniorSharesMeta() {
  // Nidal Junior publie sur les mêmes comptes officiels @gsnidal que GS Nidal.
  // Mettre META_NIDAL_JUNIOR_SHARE_NIDAL=false uniquement si un jour la marque
  // dispose réellement de comptes Facebook/Instagram séparés.
  return String(process.env.META_NIDAL_JUNIOR_SHARE_NIDAL ?? 'true').toLowerCase() !== 'false';
}

function brandEnv(prefix, brand) {
  if (brand === 'nidal-junior' && nidalJuniorSharesMeta()) {
    // La configuration GS Nidal vérifiée est prioritaire pour éviter qu'une
    // ancienne valeur Junior erronée (ID Instagram placé comme token, etc.)
    // casse la publication du sous-univers Nidal Junior.
    return rawBrandEnv(prefix, 'nidal') || rawBrandEnv(prefix, 'nidal-junior') || null;
  }
  return rawBrandEnv(prefix, brand) || null;
}

function resolvedInstagramUserId(brand) {
  const configured = brandEnv('META_IG_USER_ID', brand);
  return configured ? String(configured).trim() : null;
}

function resolvedFacebookPageId(brand) {
  const configured = resolvedFacebookPageId(brand);
  return configured ? String(configured).trim() : null;
}

function configuredPageToken(brand) {
  const value = brandEnv('META_PAGE_ACCESS_TOKEN', brand);
  // Un Page Access Token Meta n'est jamais un simple identifiant numérique.
  // Ne jamais réinterpréter un nombre comme Instagram User ID.
  if (/^\d+$/.test(String(value || '').trim())) return null;
  return value ? String(value).trim() : null;
}

function normalizedUrl(value) {
  try {
    const url = new URL(value);
    const hostPath = `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/$/, '').toLowerCase();
    if (/facebook\.com\/photo$/i.test(hostPath)) {
      const fbid = url.searchParams.get('fbid');
      return fbid ? `${hostPath}?fbid=${fbid}` : hostPath;
    }
    return hostPath;
  } catch { return String(value || '').replace(/\/$/, '').toLowerCase(); }
}

function facebookObjectRef(value) {
  try {
    const url = new URL(value);
    const fbid = url.searchParams.get('fbid');
    if (fbid) return { type: 'photo', id: fbid };

    const patterns = [
      { type: 'post', re: /\/posts\/([A-Za-z0-9_.-]+)/i },
      { type: 'video', re: /\/videos\/(\d+)/i },
      { type: 'reel', re: /\/reel\/(\d+)/i }
    ];
    for (const item of patterns) {
      const match = url.pathname.match(item.re);
      if (match) return { type: item.type, id: match[1] };
    }
  } catch {}
  return null;
}

async function graph(path, params = {}, accessToken = process.env.META_ACCESS_TOKEN) {
  const token = accessToken;
  if (!token) throw new Error('META_ACCESS_TOKEN non configure');
  const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, '')}`);
  Object.entries({ ...params, access_token: token }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Meta API ${response.status}`);
  return payload;
}

async function graphPost(path, params = {}, accessToken = process.env.META_ACCESS_TOKEN) {
  const token = accessToken;
  if (!token) throw new Error('META_ACCESS_TOKEN non configure');
  const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, '')}`);
  Object.entries({ ...params, access_token: token }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { method: 'POST' });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Meta API ${response.status}`);
  return payload;
}

const PAGE_TOKEN_CACHE = new Map();

async function resolvePageAccessToken(brand) {
  let pageId = resolvedFacebookPageId(brand);
  const igUserId = resolvedInstagramUserId(brand);

  const cachedKey = pageId || (igUserId ? `ig:${igUserId}` : null);
  if (cachedKey) {
    const cached = PAGE_TOKEN_CACHE.get(cachedKey);
    if (cached) return cached;
  }

  const configured = configuredPageToken(brand);
  if (configured) {
    try {
      const identity = await graph('me', {
        fields: 'id,name,instagram_business_account{id,username}'
      }, configured);

      const tokenPageId = identity?.id ? String(identity.id) : null;
      const tokenIgId = identity?.instagram_business_account?.id
        ? String(identity.instagram_business_account.id)
        : null;

      if (!pageId && tokenPageId) {
        pageId = tokenPageId;
      }

      const pageMatches = pageId && tokenPageId && String(tokenPageId) === String(pageId);
      const instagramMatches = !igUserId || !tokenIgId || String(tokenIgId) === String(igUserId);

      if (pageMatches && instagramMatches) {
        PAGE_TOKEN_CACHE.set(pageId, configured);
        if (igUserId) PAGE_TOKEN_CACHE.set(`ig:${igUserId}`, configured);
        return configured;
      }

      console.warn(
        `[Meta] Page token configuré ne correspond pas à la configuration résolue (` +
        `page attendue=${pageId || 'inconnue'}, page token=${tokenPageId || 'inconnue'}, ` +
        `IG attendu=${igUserId || 'inconnu'}, IG token=${tokenIgId || 'inconnu'}). Tentative via /me/accounts.`
      );
    } catch (error) {
      console.warn('[Meta] Page token configuré invalide, tentative via /me/accounts:', error.message);
    }
  }

  let payload;
  try {
    payload = await graph('me/accounts', {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      limit: 100
    });
  } catch (error) {
    let permissionDetail = '';
    try {
      const perms = await graph('me/permissions', {}, process.env.META_ACCESS_TOKEN);
      const granted = (perms.data || []).filter(item => item.status === 'granted').map(item => item.permission);
      const required = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
      const missing = required.filter(permission => !granted.includes(permission));
      permissionDetail = missing.length
        ? ` Permissions manquantes sur META_ACCESS_TOKEN: ${missing.join(', ')}.`
        : ' Permissions Page principales détectées.';
    } catch {}

    throw new Error(
      `Impossible d'obtenir le Page Access Token Meta pour ${brand}.` +
      permissionDetail +
      ` Détail Meta: ${error.message}`
    );
  }

  const pages = payload.data || [];

  // Si META_PAGE_ID n'est pas encore renseigné, retrouver automatiquement
  // la Page liée à l'Instagram Business Account configuré.
  if (!pageId && igUserId) {
    const linked = pages.find(item => String(item.instagram_business_account?.id || '') === String(igUserId));
    if (linked?.id) {
      pageId = String(linked.id);
      console.log(`[Meta] Page ${pageId} auto-détectée pour Instagram ${igUserId} (${brand}).`);
      if (linked.access_token) {
        PAGE_TOKEN_CACHE.set(pageId, linked.access_token);
        PAGE_TOKEN_CACHE.set(`ig:${igUserId}`, linked.access_token);
        return linked.access_token;
      }
    }
  }

  if (!pageId) {
    const pageSummary = pages.length
      ? pages.map(item => `${item.name || 'Page'} (${item.id}) → IG ${item.instagram_business_account?.id || 'non lié'}`).join(', ')
      : 'aucune Page retournée';

    throw new Error(
      `Aucune Page Facebook exploitable trouvée pour ${brand}. Instagram attendu: ${igUserId || 'non configuré'}. ` +
      `/me/accounts: ${pageSummary}. Vérifiez que le token Meta autorise bien la Page @gsnidal et les permissions ` +
      'pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic et instagram_content_publish.'
    );
  }

  const page = pages.find(item => String(item.id) === String(pageId));
  if (!page?.access_token) {
    throw new Error(
      `Aucun Page Access Token trouvé pour la Page ${pageId}. Vérifiez pages_show_list, pages_read_engagement, pages_manage_posts et que le compte admin gère cette Page.`
    );
  }

  try {
    const identity = await graph('me', { fields: 'id,name' }, page.access_token);
    if (String(identity?.id) !== String(pageId)) {
      throw new Error(`le token obtenu correspond à ${identity?.id || 'un autre objet'}`);
    }
  } catch (error) {
    throw new Error(`Page Access Token Facebook non valide pour ${pageId}: ${error.message}`);
  }

  PAGE_TOKEN_CACHE.set(pageId, page.access_token);
  if (igUserId) PAGE_TOKEN_CACHE.set(`ig:${igUserId}`, page.access_token);
  return page.access_token;
}

async function pageGraph(brand, path, params = {}) {
  const pageToken = await resolvePageAccessToken(brand);
  return graph(path, params, pageToken);
}

export async function diagnoseMetaAccess(brand) {
  const pageId = resolvedFacebookPageId(brand);
  const rawJuniorPageToken = brand === 'nidal-junior'
    ? rawBrandEnv('META_PAGE_ACCESS_TOKEN', 'nidal-junior')
    : null;
  const rawJuniorIgId = brand === 'nidal-junior'
    ? rawBrandEnv('META_IG_USER_ID', 'nidal-junior')
    : null;
  const rawNidalIgId = rawBrandEnv('META_IG_USER_ID', 'nidal');
  const usingSharedNidal = brand === 'nidal-junior' && nidalJuniorSharesMeta();

  const configurationWarnings = [];
  if (rawJuniorPageToken && /^\d+$/.test(String(rawJuniorPageToken).trim())) {
    configurationWarnings.push(
      'META_PAGE_ACCESS_TOKEN_NIDAL_JUNIOR contient un identifiant numérique au lieu d’un Page Access Token. Cette valeur est désormais ignorée.'
    );
  }
  if (usingSharedNidal && rawJuniorIgId && rawNidalIgId && String(rawJuniorIgId) !== String(rawNidalIgId)) {
    configurationWarnings.push(
      'META_IG_USER_ID_NIDAL_JUNIOR diffère du compte officiel GS Nidal. La configuration GS Nidal partagée est utilisée pour @gsnidal.'
    );
  }

  const result = {
    brand,
    pageId,
    metaConfigSource: usingSharedNidal ? 'shared-nidal' : 'brand-specific',
    sharesNidalMeta: usingSharedNidal,
    userTokenConfigured: Boolean(process.env.META_ACCESS_TOKEN),
    pageTokenConfigured: Boolean(configuredPageToken(brand)),
    instagramUserIdConfigured: Boolean(resolvedInstagramUserId(brand)),
    instagramUserId: resolvedInstagramUserId(brand),
    configurationWarnings,
    userPermissions: [],
    missingUserPermissions: [],
    pageTokenValid: false,
    pageIdentity: null,
    errors: []
  };

  if (process.env.META_ACCESS_TOKEN) {
    try {
      const perms = await graph('me/permissions', {}, process.env.META_ACCESS_TOKEN);
      result.userPermissions = (perms.data || [])
        .filter(item => item.status === 'granted')
        .map(item => item.permission);
      const required = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
      result.missingUserPermissions = required.filter(permission => !result.userPermissions.includes(permission));
    } catch (error) {
      result.errors.push(`user permissions: ${error.message}`);
    }
  }

  try {
    const token = await resolvePageAccessToken(brand);
    const identity = await graph('me', { fields: 'id,name' }, token);
    result.pageIdentity = identity;
    const effectivePageId = pageId || identity?.id || null;
    if (!result.pageId && effectivePageId) result.pageId = String(effectivePageId);
    result.pageTokenValid = Boolean(effectivePageId) && String(identity?.id) === String(effectivePageId);
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

export function metaConfigured(brand) {
  return Boolean(process.env.META_ACCESS_TOKEN && (resolvedFacebookPageId(brand) || resolvedInstagramUserId(brand)));
}

async function syncInstagramAccountInsights(igUserId) {
  const metrics = ['profile_views', 'reach', 'accounts_engaged'];
  const values = {};
  const errors = [];

  for (const metric of metrics) {
    try {
      const payload = await graph(`${igUserId}/insights`, {
        metric,
        period: 'day',
        metric_type: 'total_value'
      });
      const item = payload.data?.[0];
      values[metric] = Number(item?.total_value?.value ?? item?.values?.[0]?.value ?? item?.value ?? 0);
    } catch (error) {
      errors.push({ metric, message: error.message });
    }
  }

  return {
    period: 'day',
    metricType: 'total_value',
    profileViews: values.profile_views ?? null,
    reach: values.reach ?? null,
    accountsEngaged: values.accounts_engaged ?? null,
    errors
  };
}

async function syncInstagramProfile(brand) {
  const igUserId = resolvedInstagramUserId(brand);
  if (!igUserId) throw new Error(`META_IG_USER_ID non configuré pour ${brand}`);

  const fields = 'id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url';
  const profile = await graph(igUserId, { fields });
  const insights = await syncInstagramAccountInsights(igUserId);
  const hasInsights = [insights.profileViews, insights.reach, insights.accountsEngaged].some(value => value !== null);

  return {
    platform: 'instagram',
    source: 'meta-api',
    externalId: profile.id,
    username: profile.username || null,
    name: profile.name || null,
    biography: profile.biography || '',
    website: profile.website || '',
    followers: Number(profile.followers_count || 0),
    follows: Number(profile.follows_count || 0),
    mediaCount: Number(profile.media_count || 0),
    profilePictureUrl: profile.profile_picture_url || null,
    profileUrl: profile.username ? `https://www.instagram.com/${profile.username}/` : null,
    insightsAvailable: hasInsights,
    insights
  };
}

async function syncFacebookPageInsights(brand, pageId) {
  const token = await resolvePageAccessToken(brand);
  const candidates = [
    ['page_media_view', 'page_total_media_view_unique', 'page_post_engagements'],
    ['page_views_total', 'page_post_engagements']
  ];

  const until = new Date();
  const since = new Date(until.getTime() - 27 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);
  const errors = [];

  for (const metrics of candidates) {
    try {
      const payload = await graph(`${pageId}/insights`, {
        metric: metrics.join(','),
        period: 'day',
        since: fmt(since),
        until: fmt(until)
      }, token);

      const data = payload.data || [];
      const byName = Object.fromEntries(data.map(item => [item.name, item]));

      const sumSeries = item => Array.isArray(item?.values)
        ? item.values.reduce((sum, row) => sum + Number(row?.value || 0), 0)
        : null;

      const reachItem = byName.page_total_media_view_unique;
      const viewsItem = byName.page_media_view || byName.page_views_total;
      const engagementItem = byName.page_post_engagements;

      const reach = reachItem ? sumSeries(reachItem) : null;
      const views = viewsItem ? sumSeries(viewsItem) : null;
      const engagements = engagementItem ? sumSeries(engagementItem) : null;

      if (reach !== null || views !== null || engagements !== null) {
        return {
          period: 'last_28_days',
          reach,
          views,
          engagements,
          metricsUsed: metrics,
          errors
        };
      }
    } catch (error) {
      errors.push({ metrics, message: error.message });
    }
  }

  return { period: 'last_28_days', reach: null, views: null, engagements: null, metricsUsed: [], errors };
}

async function syncFacebookProfile(brand) {
  const pageId = resolvedFacebookPageId(brand);
  if (!pageId) throw new Error(`META_PAGE_ID non configuré pour ${brand}`);

  const fields = 'id,name,username,about,description,category,website,link,fan_count,followers_count,picture.type(large)';
  const profile = await pageGraph(brand, pageId, { fields });

  const [pageInsights, contentInsights] = await Promise.all([
    syncFacebookPageInsights(brand, pageId),
    getFacebookTopContent(
      brand,
      Number(process.env.META_FACEBOOK_LIVE_POST_LIMIT || 50)
    )
  ]);
  const analyzedPosts = contentInsights.items || [];
  const availableCounts = { reach: 0, views: 0 };
  const aggregate = analyzedPosts.reduce((acc, item) => {
    const metrics = item.metrics || {};

    if (metrics.reach !== null && metrics.reach !== undefined) {
      acc.reach += Number(metrics.reach || 0);
      availableCounts.reach++;
    }
    if (metrics.views !== null && metrics.views !== undefined) {
      acc.views += Number(metrics.views || 0);
      availableCounts.views++;
    }

    acc.interactions += Number(metrics.interactions || 0);
    acc.comments += Number(metrics.comments || 0);
    acc.shares += Number(metrics.shares || 0);
    acc.reactions += Number(metrics.reactions || 0);
    return acc;
  }, { reach: 0, views: 0, interactions: 0, comments: 0, shares: 0, reactions: 0 });

  const insightsAvailable = !contentInsights.error && analyzedPosts.length > 0;

  return {
    platform: 'facebook',
    source: 'meta-api',
    externalId: profile.id,
    username: profile.username || null,
    name: profile.name || null,
    biography: profile.about || profile.description || '',
    category: profile.category || '',
    website: profile.website || '',
    followers: Number(profile.followers_count ?? profile.fan_count ?? 0),
    follows: null,
    mediaCount: analyzedPosts.length || null,
    profilePictureUrl: profile.picture?.data?.url || null,
    profileUrl: profile.link || (profile.id ? `https://www.facebook.com/${profile.id}` : null),
    insightsAvailable,
    insights: {
      scope: pageInsights.reach !== null || pageInsights.views !== null
        ? 'page-last-28-days'
        : 'recent-published-posts',
      period: pageInsights.period,
      analyzedPosts: analyzedPosts.length,
      reach: pageInsights.reach !== null
        ? pageInsights.reach
        : (availableCounts.reach ? aggregate.reach : null),
      views: pageInsights.views !== null
        ? pageInsights.views
        : (availableCounts.views ? aggregate.views : null),
      interactions: pageInsights.engagements !== null
        ? pageInsights.engagements
        : aggregate.interactions,
      comments: aggregate.comments,
      shares: aggregate.shares,
      reactions: aggregate.reactions,
      topContent: analyzedPosts.slice(0, 3),
      pageMetricsUsed: pageInsights.metricsUsed,
      pageInsightErrors: pageInsights.errors,
      error: contentInsights.error || null
    }
  };
}

export async function syncSocialProfiles({ brand, instagramUrl = '', facebookUrl = '' }) {
  const result = {
    brand,
    syncedAt: new Date().toISOString(),
    instagram: null,
    facebook: null,
    errors: []
  };

  if (process.env.META_ACCESS_TOKEN && process.env.DEMO_MODE !== 'true') {
    if (resolvedInstagramUserId(brand)) {
      try { result.instagram = await syncInstagramProfile(brand); }
      catch (error) { result.errors.push({ platform: 'instagram', source: 'meta-api', message: error.message }); }
    }
    if (resolvedFacebookPageId(brand)) {
      try { result.facebook = await syncFacebookProfile(brand); }
      catch (error) { result.errors.push({ platform: 'facebook', source: 'meta-api', message: error.message }); }
    }
  }

  if (!result.instagram && instagramUrl) {
    const fallback = await scrapeSocialProfile(instagramUrl);
    if (fallback.success) result.instagram = fallback;
    else result.errors.push({ platform: 'instagram', source: 'public', message: fallback.error });
  }

  if (!result.facebook && facebookUrl) {
    const fallback = await scrapeSocialProfile(facebookUrl);
    if (fallback.success) result.facebook = fallback;
    else result.errors.push({ platform: 'facebook', source: 'public', message: fallback.error });
  }

  if (!result.instagram && !result.facebook) {
    throw new Error('Aucun profil social synchronisé. Configurez Meta API ou fournissez un lien Instagram/Facebook public.');
  }

  return result;
}

import { scrapeSocialPost, scrapeSocialProfile } from './public-scraper.js';
import { ensureInstagramCompatibleMediaUrl } from './media.js';

export async function syncContentFromUrl({
  brand,
  finalUrl,
  platform,
  requireVerifiedMetrics = false
}) {
  const hasOfficialMeta = metaConfigured(brand) && process.env.DEMO_MODE !== 'true';

  // 1. Pour des métriques réelles, l'API Meta officielle est la source de vérité.
  if (hasOfficialMeta) {
    try {
      const synced = (/instagram/i.test(platform) || /instagram\.com/i.test(finalUrl))
        ? await syncInstagram(brand, finalUrl)
        : await syncFacebook(brand, finalUrl);
      return { ...synced, metricsVerified: true, metricsSource: 'meta-api' };
    } catch (apiError) {
      console.warn('Meta Graph API n’a pas pu identifier ce contenu:', apiError.message);
      if (requireVerifiedMetrics) {
        throw new Error(`Impossible de récupérer les métriques officielles Meta pour ce lien : ${apiError.message}`);
      }
    }
  } else if (requireVerifiedMetrics) {
    if (process.env.DEMO_MODE === 'true') {
      throw new Error('DEMO_MODE=true : les métriques officielles Meta sont désactivées. Mettez DEMO_MODE=false sur Coolify.');
    }
    throw new Error('Meta API n’est pas configurée pour cette marque.');
  }

  // 2. Lecture publique uniquement pour enrichir le contenu.
  // Les chiffres Facebook/Instagram trouvés dans les métadonnées HTML ne sont
  // PAS considérés comme des Insights réels et ne doivent pas être présentés comme tels.
  try {
    const scraped = await scrapeSocialPost(finalUrl);
    if (scraped.success) {
      return {
        source: /instagram/i.test(platform || finalUrl) ? 'instagram' : 'facebook',
        externalMediaId: null,
        permalink: scraped.cleanUrl || finalUrl,
        isDemo: false,
        metricsVerified: false,
        metricsSource: 'public-unverified',
        warning: 'Métadonnées publiques uniquement : chiffres non certifiés par Meta API.',
        metrics: null,
        title: scraped.title,
        caption: scraped.caption,
        format: scraped.format,
        mediaUrl: scraped.mediaUrl,
        platform: scraped.platform
      };
    }
  } catch (scrapeErr) {
    console.warn('Lecture publique échouée:', scrapeErr.message);
  }

  // 3. Ne plus inventer de métriques quand la synchronisation réelle échoue.
  return {
    source: /instagram/i.test(platform || finalUrl) ? 'instagram' : 'facebook',
    externalMediaId: null,
    permalink: finalUrl,
    isDemo: false,
    metricsVerified: false,
    metricsSource: 'unavailable',
    warning: 'Aucune métrique réelle disponible pour ce lien.',
    metrics: null
  };
}

async function syncInstagram(brand, finalUrl) {
  const userId = resolvedInstagramUserId(brand);
  if (!userId) throw new Error(`Compte Instagram non configure pour ${brand}`);
  const media = await graph(`${userId}/media`, { fields: 'id,permalink,media_type,timestamp,caption,like_count,comments_count', limit: 100 });
  const target = media.data?.find(item => normalizedUrl(item.permalink) === normalizedUrl(finalUrl));
  if (!target) throw new Error('Publication Instagram introuvable dans les 100 medias recents');
  const metricSets = [
    'reach,total_interactions,likes,comments,saved,shares,views',
    'reach,likes,comments,saved,shares,plays',
    'reach,likes,comments,saved'
  ];
  let insights = null;
  let lastError = null;
  for (const metric of metricSets) {
    try { insights = await graph(`${target.id}/insights`, { metric }); break; }
    catch (error) { lastError = error; }
  }
  if (!insights) throw lastError;
  const values = Object.fromEntries((insights.data || []).map(item => [item.name, item.values?.[0]?.value ?? item.value ?? 0]));
  return {
    source: 'instagram', externalMediaId: target.id, permalink: target.permalink, isDemo: false, metricsVerified: true, metricsSource: 'meta-api',
    metrics: {
      portee: Number(values.reach || 0),
      reactions: Number(values.likes ?? target.like_count ?? 0),
      commentaires: Number(values.comments ?? target.comments_count ?? 0),
      partages: Number(values.shares || 0),
      enregistrements: Number(values.saved || 0),
      clics: null,
      vues: Number(values.views ?? values.plays ?? 0)
    }
  };
}

async function syncFacebook(brand, finalUrl) {
  const pageId = resolvedFacebookPageId(brand);
  if (!pageId) throw new Error(`Page Facebook non configurée pour ${brand}`);

  const ref = facebookObjectRef(finalUrl);
  const posts = await pageGraph(brand, `${pageId}/published_posts`, {
    fields: 'id,permalink_url,message,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true),attachments{target,url,type}',
    limit: 100
  });

  const target = (posts.data || []).find(item => {
    if (normalizedUrl(item.permalink_url) === normalizedUrl(finalUrl)) return true;

    if (ref?.id) {
      if (String(item.id) === String(ref.id)) return true;
      const attachments = item.attachments?.data || [];
      if (attachments.some(att => String(att.target?.id || '') === String(ref.id))) return true;
      if (attachments.some(att => normalizedUrl(att.url || '') === normalizedUrl(finalUrl))) return true;
    }

    return false;
  });

  if (!target) {
    const suffix = ref?.id ? ` (identifiant ${ref.id})` : '';
    throw new Error(`Publication Facebook introuvable dans les 100 publications récentes${suffix}`);
  }

  const metrics = process.env.META_PAGE_POST_METRICS || 'post_media_view,post_total_media_view_unique';
  let values = {};
  let insightsError = null;
  try {
    const insights = await pageGraph(brand, `${target.id}/insights`, { metric: metrics });
    values = Object.fromEntries((insights.data || []).map(item => [
      item.name,
      Number(item.values?.[0]?.value ?? item.total_value?.value ?? item.value ?? 0)
    ]));
  } catch (error) {
    // Likes/commentaires/partages restent exacts même si une métrique Insight
    // particulière n'est plus disponible dans la version courante de Meta.
    insightsError = error.message;
  }

  return {
    source: 'facebook',
    externalMediaId: target.id,
    permalink: target.permalink_url,
    isDemo: false,
    metricsVerified: true,
    metricsSource: 'meta-api',
    insightsWarning: insightsError,
    metrics: {
      portee: Object.prototype.hasOwnProperty.call(values, 'post_total_media_view_unique')
        ? Number(values.post_total_media_view_unique)
        : null,
      reactions: Number(target.reactions?.summary?.total_count || 0),
      commentaires: Number(target.comments?.summary?.total_count || 0),
      partages: Number(target.shares?.count || 0),
      enregistrements: null,
      clics: null,
      vues: Object.prototype.hasOwnProperty.call(values, 'post_media_view')
        ? Number(values.post_media_view)
        : null
    }
  };
}

async function getInstagramTopContent(brand, limit = 50) {
  const userId = resolvedInstagramUserId(brand);
  if (!userId) return { items: [], error: `META_IG_USER_ID non configuré pour ${brand}` };

  try {
    const media = await graph(`${userId}/media`, {
      fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url',
      limit: Math.max(1, Math.min(Number(limit) || 50, 100))
    });

    const candidates = (media.data || []).slice(0, Math.max(1, Math.min(Number(limit) || 50, 100)));
    const items = [];

    for (const item of candidates) {
      let metricValues = {};
      const metricSets = [
        'reach,views,saved,shares,total_interactions',
        'reach,plays,saved,shares,total_interactions',
        'reach,saved,shares'
      ];
      for (const metric of metricSets) {
        try {
          const insights = await graph(`${item.id}/insights`, { metric });
          metricValues = Object.fromEntries((insights.data || []).map(metricItem => [
            metricItem.name,
            Number(metricItem.values?.[0]?.value ?? metricItem.total_value?.value ?? metricItem.value ?? 0)
          ]));
          break;
        } catch {}
      }

      const likes = Number(item.like_count || 0);
      const comments = Number(item.comments_count || 0);
      const shares = Number(metricValues.shares || 0);
      const saves = Number(metricValues.saved || 0);
      const interactions = Number(metricValues.total_interactions || (likes + comments + shares + saves));

      items.push({
        id: item.id,
        platform: 'instagram',
        caption: item.caption || '',
        mediaType: item.media_type || item.media_product_type || 'UNKNOWN',
        permalink: item.permalink || '',
        timestamp: item.timestamp || null,
        thumbnailUrl: item.thumbnail_url || null,
        metrics: {
          reach: Number(metricValues.reach || 0),
          views: Number(metricValues.views ?? metricValues.plays ?? 0),
          likes,
          comments,
          shares,
          saves,
          interactions
        }
      });
    }

    items.sort((a, b) => {
      const aScore = (Number(a.metrics.reach || 0) * 2) + Number(a.metrics.views || 0) + (Number(a.metrics.interactions || 0) * 10);
      const bScore = (Number(b.metrics.reach || 0) * 2) + Number(b.metrics.views || 0) + (Number(b.metrics.interactions || 0) * 10);
      return bScore - aScore;
    });

    return { items, error: null };
  } catch (error) {
    return { items: [], error: error.message };
  }
}

async function getFacebookTopContent(brand, limit = 50) {
  const pageId = resolvedFacebookPageId(brand);
  if (!pageId) return { items: [], error: `META_PAGE_ID non configuré pour ${brand}` };

  try {
    const posts = await pageGraph(brand, `${pageId}/published_posts`, {
      fields: 'id,permalink_url,message,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)',
      limit: Math.max(1, Math.min(Number(limit) || 50, 100))
    });

    const items = [];
    const metrics = process.env.META_PAGE_POST_METRICS || 'post_media_view,post_total_media_view_unique';

    for (const post of posts.data || []) {
      let values = {};
      let insightsError = null;
      try {
        const insights = await pageGraph(brand, `${post.id}/insights`, { metric: metrics });
        values = Object.fromEntries((insights.data || []).map(metricItem => [
          metricItem.name,
          metricItem.values?.[0]?.value ?? metricItem.total_value?.value ?? metricItem.value ?? null
        ]));
      } catch (error) {
        insightsError = error.message;
      }

      const reactions = Number(post.reactions?.summary?.total_count || 0);
      const comments = Number(post.comments?.summary?.total_count || 0);
      const shares = Number(post.shares?.count || 0);
      const reach = Object.prototype.hasOwnProperty.call(values, 'post_total_media_view_unique')
        ? Number(values.post_total_media_view_unique)
        : null;
      const views = Object.prototype.hasOwnProperty.call(values, 'post_media_view')
        ? Number(values.post_media_view)
        : null;
      const interactions = reactions + comments + shares;

      items.push({
        id: post.id,
        platform: 'facebook',
        caption: post.message || '',
        mediaType: 'POST',
        permalink: post.permalink_url || '',
        timestamp: post.created_time || null,
        metrics: {
          reach,
          views,
          reactions,
          comments,
          shares,
          saves: null,
          interactions,
          insightsAvailable: reach !== null || views !== null,
          insightsError
        }
      });
    }

    items.sort((a, b) => {
      const aScore = (a.metrics.reach * 2) + a.metrics.views + (a.metrics.interactions * 10);
      const bScore = (b.metrics.reach * 2) + b.metrics.views + (b.metrics.interactions * 10);
      return bScore - aScore;
    });

    return { items, error: null };
  } catch (error) {
    return { items: [], error: error.message };
  }
}

async function getAdsAudienceBreakdowns(brand) {
  const accountId = brandEnv('META_AD_ACCOUNT_ID', brand);
  if (!accountId) {
    return {
      configured: false,
      campaigns: [],
      ageGender: [],
      regions: [],
      daily: [],
      errors: ['META_AD_ACCOUNT_ID non configuré']
    };
  }

  const actId = `act_${String(accountId).replace(/^act_/, '')}`;
  const result = { configured: true, campaigns: [], ageGender: [], regions: [], daily: [], errors: [] };

  try {
    const campaigns = await graph(`${actId}/insights`, {
      level: 'campaign',
      fields: 'campaign_id,campaign_name,impressions,reach,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type',
      date_preset: 'last_90d',
      limit: 200
    });
    result.campaigns = campaigns.data || [];
  } catch (error) {
    result.errors.push(`campaigns: ${error.message}`);
  }

  // Utiliser le niveau account pour éviter de sommer plusieurs campagnes
  // et d'afficher une portée démographique/géographique artificiellement gonflée.
  try {
    const audience = await graph(`${actId}/insights`, {
      level: 'account',
      fields: 'impressions,reach,clicks,spend',
      breakdowns: 'age,gender',
      date_preset: 'last_90d',
      limit: 200
    });
    result.ageGender = audience.data || [];
  } catch (error) {
    result.errors.push(`age/gender: ${error.message}`);
  }

  try {
    const regions = await graph(`${actId}/insights`, {
      level: 'account',
      fields: 'impressions,reach,clicks,spend',
      breakdowns: 'region',
      date_preset: 'last_90d',
      limit: 200
    });
    result.regions = regions.data || [];
  } catch (error) {
    result.errors.push(`region: ${error.message}`);
  }

  // Série quotidienne immédiatement exploitable par les graphiques :
  // pas besoin d'attendre plusieurs snapshots locaux.
  try {
    const daily = await graph(`${actId}/insights`, {
      level: 'account',
      fields: 'impressions,reach,clicks,spend',
      date_preset: 'last_30d',
      time_increment: 1,
      limit: 100
    });
    result.daily = daily.data || [];
  } catch (error) {
    result.errors.push(`daily: ${error.message}`);
  }

  return result;
}

export async function syncAudienceConversions(brand) {
  const normalizedBrand = brand === 'nidal' ? 'nidal' : 'nidal-junior';
  const [topInstagram, topFacebook, ads] = await Promise.all([
    getInstagramTopContent(normalizedBrand, Number(process.env.META_MEDIA_ANALYSIS_LIMIT || 50)),
    getFacebookTopContent(normalizedBrand, Number(process.env.META_MEDIA_ANALYSIS_LIMIT || 50)),
    getAdsAudienceBreakdowns(normalizedBrand)
  ]);

  const campaignSummary = (ads.campaigns || []).reduce((acc, row) => {
    acc.spend += Number(row.spend || 0);
    acc.impressions += Number(row.impressions || 0);
    acc.reach += Number(row.reach || 0);
    acc.clicks += Number(row.clicks || 0);
    for (const action of row.actions || []) {
      const key = action.action_type || 'other';
      acc.actions[key] = (acc.actions[key] || 0) + Number(action.value || 0);
    }
    return acc;
  }, { spend: 0, impressions: 0, reach: 0, clicks: 0, actions: {} });

  return {
    brand: normalizedBrand,
    syncedAt: new Date().toISOString(),
    instagram: {
      analyzedMedia: topInstagram.items.length,
      topContent: topInstagram.items,
      error: topInstagram.error
    },
    facebook: {
      analyzedMedia: topFacebook.items.length,
      topContent: topFacebook.items,
      error: topFacebook.error
    },
    ads: {
      ...ads,
      summary: campaignSummary
    }
  };
}

export async function syncAds(brand) {
  const accountId = brandEnv('META_AD_ACCOUNT_ID', brand);
  const demo = process.env.DEMO_MODE === 'true' || !process.env.META_ACCESS_TOKEN || !accountId;
  if (demo) return demoAds(brand);
  const payload = await graph(`act_${String(accountId).replace(/^act_/, '')}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,impressions,reach,clicks,spend,actions,cost_per_action_type',
    date_preset: 'last_30d',
    limit: 100
  });
  return (payload.data || []).map(item => ({ ...item, isDemo: false }));
}

function demoContentMetrics(finalUrl, platform) {
  const seed = [...String(finalUrl || platform || 'nidal')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const portee = 1200 + (seed % 2100);
  return {
    source: /instagram/i.test(platform || finalUrl) ? 'instagram' : 'facebook',
    externalMediaId: `demo_${seed}`,
    permalink: finalUrl,
    isDemo: true,
    isPending: !process.env.META_ACCESS_TOKEN,
    metrics: { portee, reactions: 80 + seed % 130, commentaires: 8 + seed % 25, partages: 5 + seed % 30, enregistrements: 12 + seed % 45, clics: 4 + seed % 25, vues: portee + 300 + seed % 900 }
  };
}

function demoAds(brand) {
  const isPending = !process.env.META_ACCESS_TOKEN;
  return [
    { campaign_id: `demo-${brand}-1`, campaign_name: 'Inscriptions Nidal', impressions: '28400', reach: '19100', clicks: '612', spend: '2150.00', actions: [{ action_type: 'lead', value: '74' }], isDemo: true, isPending },
    { campaign_id: `demo-${brand}-2`, campaign_name: 'Decouverte Nidal Junior', impressions: '17600', reach: '12800', clicks: '428', spend: '1375.00', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '53' }], isDemo: true, isPending }
  ];
}


async function publishFacebookPost(brand, job) {
  const pageId = resolvedFacebookPageId(brand);
  if (!pageId) throw new Error(`META_PAGE_ID non configuré pour ${brand}`);
  const pageToken = await resolvePageAccessToken(brand);

  let published;
  if (job.media_url && job.media_type === 'image') {
    published = await graphPost(`${pageId}/photos`, {
      url: job.media_url,
      caption: job.message || '',
      published: 'true'
    }, pageToken);
  } else {
    published = await graphPost(`${pageId}/feed`, {
      message: job.message || '',
      link: job.link_url || undefined
    }, pageToken);
  }

  const publishedId = published.post_id || published.id || null;
  let verification = null;
  if (publishedId) {
    try {
      verification = await graph(publishedId, {
        fields: 'id,created_time,permalink_url'
      }, pageToken);
    } catch {
      verification = { id: publishedId };
    }
  }

  return {
    ...published,
    verified: Boolean(publishedId),
    permalink: verification?.permalink_url || null,
    verification
  };
}

async function waitForInstagramContainer(containerId, accessToken, maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await graph(containerId, { fields: 'status_code,status' }, accessToken);
    const code = String(status.status_code || '').toUpperCase();

    if (code === 'FINISHED') return status;

    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(
        `Instagram n'a pas pu préparer le média (statut: ${code}${status.status ? ` — ${status.status}` : ''}). ` +
        'Vérifiez que le fichier est publiquement accessible et, pour une image, utilisez de préférence un JPEG.'
      );
    }

    // Certains conteneurs peuvent ne pas exposer immédiatement status_code.
    if (!code && attempt >= 3) return status;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Instagram n’a pas terminé le traitement du média après 60 secondes.');
}

async function publishInstagramPost(brand, job) {
  const igUserId = resolvedInstagramUserId(brand);
  if (!igUserId) throw new Error(`META_IG_USER_ID non configuré pour ${brand}`);
  if (!job.media_url) throw new Error('Instagram exige une photo ou vidéo.');

  // Le projet utilise "Instagram API with Facebook Login".
  // Meta documente la publication avec le Page Access Token lié au compte IG pro.
  const publishToken = await resolvePageAccessToken(brand);

  const mediaType = String(job.media_type || 'image').toLowerCase();
  const createParams = { caption: job.message || '' };
  const isVideo = mediaType === 'video' || mediaType === 'reel';

  let publishMediaUrl = job.media_url;
  if (!isVideo) {
    const prepared = await ensureInstagramCompatibleMediaUrl(job.media_url, mediaType);
    publishMediaUrl = prepared.url || job.media_url;
  }

  if (isVideo) {
    createParams.media_type = 'REELS';
    createParams.video_url = publishMediaUrl;
  } else {
    createParams.image_url = publishMediaUrl;
  }

  const container = await graphPost(`${igUserId}/media`, createParams, publishToken);
  if (!container?.id) throw new Error('Meta n’a pas retourné de conteneur Instagram.');

  await waitForInstagramContainer(container.id, publishToken);

  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: container.id
  }, publishToken);
  if (!published?.id) throw new Error('Instagram n’a pas confirmé la publication.');

  let verification = null;
  try {
    verification = await graph(published.id, {
      fields: 'id,permalink,media_type,timestamp'
    }, publishToken);
  } catch {
    verification = { id: published.id };
  }

  return {
    ...published,
    creation_id: container.id,
    verified: Boolean(published.id),
    permalink: verification?.permalink || null,
    verification
  };
}

export async function publishSocialJob(job) {
  const brand = job.brand_slug || job.brand || 'nidal-junior';
  const platforms = Array.isArray(job.platforms) ? job.platforms : [];
  const result = {};
  const errors = {};

  if (platforms.includes('instagram')) {
    try { result.instagram = await publishInstagramPost(brand, job); }
    catch (error) { errors.instagram = error.message; }
  }

  if (platforms.includes('facebook')) {
    try { result.facebook = await publishFacebookPost(brand, job); }
    catch (error) { errors.facebook = error.message; }
  }

  if (!Object.keys(result).length) {
    throw new Error(Object.values(errors).join(' | ') || 'Aucune plateforme sélectionnée');
  }

  return { result, errors };
}
