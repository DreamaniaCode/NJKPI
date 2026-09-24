const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

function brandEnv(prefix, brand) {
  return process.env[`${prefix}_${brand === 'nidal-junior' ? 'NIDAL_JUNIOR' : 'NIDAL'}`];
}

function normalizedUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch { return String(value || '').replace(/\/$/, '').toLowerCase(); }
}

async function graph(path, params = {}) {
  const token = process.env.META_ACCESS_TOKEN;
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

export function metaConfigured(brand) {
  return Boolean(process.env.META_ACCESS_TOKEN && (brandEnv('META_PAGE_ID', brand) || brandEnv('META_IG_USER_ID', brand)));
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
  const igUserId = brandEnv('META_IG_USER_ID', brand);
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

async function syncFacebookProfile(brand) {
  const pageId = brandEnv('META_PAGE_ID', brand);
  if (!pageId) throw new Error(`META_PAGE_ID non configuré pour ${brand}`);

  const fields = 'id,name,username,about,description,category,website,link,fan_count,followers_count,picture.type(large)';
  const profile = await graph(pageId, { fields });

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
    mediaCount: null,
    profilePictureUrl: profile.picture?.data?.url || null,
    profileUrl: profile.link || (profile.id ? `https://www.facebook.com/${profile.id}` : null),
    insightsAvailable: false
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
    if (brandEnv('META_IG_USER_ID', brand)) {
      try { result.instagram = await syncInstagramProfile(brand); }
      catch (error) { result.errors.push({ platform: 'instagram', source: 'meta-api', message: error.message }); }
    }
    if (brandEnv('META_PAGE_ID', brand)) {
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

export async function syncContentFromUrl({ brand, finalUrl, platform }) {
  // 1. Si Meta API officielle est configurée, essayer l'API officielle
  if (metaConfigured(brand) && process.env.DEMO_MODE !== 'true') {
    try {
      if (/instagram/i.test(platform) || /instagram\.com/i.test(finalUrl)) {
        return await syncInstagram(brand, finalUrl);
      }
      return await syncFacebook(brand, finalUrl);
    } catch (apiError) {
      console.warn('Meta Graph API indisponible, tentative de lecture publique:', apiError.message);
    }
  }

  // 2. Extraction publique en temps réel des métadonnées et vrais likes/commentaires
  try {
    const scraped = await scrapeSocialPost(finalUrl);
    if (scraped.success && scraped.metrics) {
      return {
        source: /instagram/i.test(platform || finalUrl) ? 'instagram' : 'facebook',
        externalMediaId: `scraped_${Date.now()}`,
        permalink: scraped.cleanUrl || finalUrl,
        isDemo: false,
        metrics: scraped.metrics,
        title: scraped.title,
        caption: scraped.caption,
        format: scraped.format,
        mediaUrl: scraped.mediaUrl,
        platform: scraped.platform
      };
    }
  } catch (scrapeErr) {
    console.warn('Scraping public échoué:', scrapeErr.message);
  }

  // 3. Fallback mode démo si tout échoue
  return demoContentMetrics(finalUrl, platform);
}

async function syncInstagram(brand, finalUrl) {
  const userId = brandEnv('META_IG_USER_ID', brand);
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
    source: 'instagram', externalMediaId: target.id, permalink: target.permalink, isDemo: false,
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
  const pageId = brandEnv('META_PAGE_ID', brand);
  if (!pageId) throw new Error(`Page Facebook non configuree pour ${brand}`);
  const posts = await graph(`${pageId}/published_posts`, { fields: 'id,permalink_url,message,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)', limit: 100 });
  const target = posts.data?.find(item => normalizedUrl(item.permalink_url) === normalizedUrl(finalUrl));
  if (!target) throw new Error('Publication Facebook introuvable dans les 100 posts recents');
  const metrics = process.env.META_PAGE_POST_METRICS || 'post_media_view,post_total_media_view_unique';
  const insights = await graph(`${target.id}/insights`, { metric: metrics });
  const values = Object.fromEntries((insights.data || []).map(item => [item.name, item.values?.[0]?.value ?? 0]));
  return {
    source: 'facebook', externalMediaId: target.id, permalink: target.permalink_url, isDemo: false,
    metrics: {
      portee: Number(values.post_total_media_view_unique || 0),
      reactions: Number(target.reactions?.summary?.total_count || 0),
      commentaires: Number(target.comments?.summary?.total_count || 0),
      partages: Number(target.shares?.count || 0),
      enregistrements: 0,
      clics: null,
      vues: Number(values.post_media_view || 0)
    }
  };
}

async function getInstagramTopContent(brand, limit = 50) {
  const userId = brandEnv('META_IG_USER_ID', brand);
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
      const aScore = (a.metrics.reach * 2) + a.metrics.views + (a.metrics.interactions * 10);
      const bScore = (b.metrics.reach * 2) + b.metrics.views + (b.metrics.interactions * 10);
      return bScore - aScore;
    });

    return { items, error: null };
  } catch (error) {
    return { items: [], error: error.message };
  }
}

async function getFacebookTopContent(brand, limit = 50) {
  const pageId = brandEnv('META_PAGE_ID', brand);
  if (!pageId) return { items: [], error: `META_PAGE_ID non configuré pour ${brand}` };

  try {
    const posts = await graph(`${pageId}/published_posts`, {
      fields: 'id,permalink_url,message,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)',
      limit: Math.max(1, Math.min(Number(limit) || 50, 100))
    });

    const items = [];
    const metrics = process.env.META_PAGE_POST_METRICS || 'post_media_view,post_total_media_view_unique';

    for (const post of posts.data || []) {
      let values = {};
      try {
        const insights = await graph(`${post.id}/insights`, { metric: metrics });
        values = Object.fromEntries((insights.data || []).map(metricItem => [
          metricItem.name,
          Number(metricItem.values?.[0]?.value ?? metricItem.value ?? 0)
        ]));
      } catch {}

      const reactions = Number(post.reactions?.summary?.total_count || 0);
      const comments = Number(post.comments?.summary?.total_count || 0);
      const shares = Number(post.shares?.count || 0);
      const reach = Number(values.post_total_media_view_unique || 0);
      const views = Number(values.post_media_view || 0);
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
          saves: 0,
          interactions
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
      errors: ['META_AD_ACCOUNT_ID non configuré']
    };
  }

  const actId = `act_${String(accountId).replace(/^act_/, '')}`;
  const common = {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,impressions,reach,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type',
    date_preset: 'last_90d',
    limit: 200
  };

  const result = { configured: true, campaigns: [], ageGender: [], regions: [], errors: [] };

  try {
    const campaigns = await graph(`${actId}/insights`, common);
    result.campaigns = campaigns.data || [];
  } catch (error) {
    result.errors.push(`campaigns: ${error.message}`);
  }

  try {
    const audience = await graph(`${actId}/insights`, { ...common, breakdowns: 'age,gender' });
    result.ageGender = audience.data || [];
  } catch (error) {
    result.errors.push(`age/gender: ${error.message}`);
  }

  try {
    const regions = await graph(`${actId}/insights`, { ...common, breakdowns: 'region' });
    result.regions = regions.data || [];
  } catch (error) {
    result.errors.push(`region: ${error.message}`);
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
