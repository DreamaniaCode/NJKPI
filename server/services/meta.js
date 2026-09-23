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

export async function syncContentFromUrl({ brand, finalUrl, platform }) {
  const demo = process.env.DEMO_MODE === 'true' || !metaConfigured(brand);
  if (demo) return demoContentMetrics(finalUrl, platform);
  if (/instagram/i.test(platform) || /instagram\.com/i.test(finalUrl)) return syncInstagram(brand, finalUrl);
  return syncFacebook(brand, finalUrl);
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
  return { source: /instagram/i.test(platform || finalUrl) ? 'instagram' : 'facebook', externalMediaId: `demo_${seed}`, permalink: finalUrl, isDemo: true, metrics: { portee, reactions: 80 + seed % 130, commentaires: 8 + seed % 25, partages: 5 + seed % 30, enregistrements: 12 + seed % 45, clics: 4 + seed % 25, vues: portee + 300 + seed % 900 } };
}

function demoAds(brand) {
  return [
    { campaign_id: `demo-${brand}-1`, campaign_name: 'Inscriptions Nidal', impressions: '28400', reach: '19100', clicks: '612', spend: '2150.00', actions: [{ action_type: 'lead', value: '74' }], isDemo: true },
    { campaign_id: `demo-${brand}-2`, campaign_name: 'Decouverte Nidal Junior', impressions: '17600', reach: '12800', clicks: '428', spend: '1375.00', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '53' }], isDemo: true }
  ];
}
