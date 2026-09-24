const METRIC_KEYS = ['portee', 'reactions', 'commentaires', 'partages', 'enregistrements', 'clics', 'vues'];

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalizeBrand(brand) {
  return brand === 'nidal' ? 'nidal' : 'nidal-junior';
}

function daysUntil(dateString, now = new Date()) {
  if (!dateString) return null;
  const target = new Date(`${dateString}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / 86400000);
}

function normalizeTarget(name, raw = {}, now = new Date()) {
  const current = asNumber(raw.current);
  const target = asNumber(raw.target);
  const remaining = Math.max(target - current, 0);
  const progressPct = target > 0 ? round((current / target) * 100, 1) : null;
  const daysLeft = daysUntil(raw.eta, now);
  const requiredPerDay = daysLeft && daysLeft > 0 ? round(remaining / daysLeft, 2) : null;

  return {
    name,
    current,
    target,
    remaining,
    progressPct,
    eta: raw.eta || null,
    daysLeft,
    requiredPerDay,
    note: raw.note || ''
  };
}

function normalizeContent(item = {}) {
  const data = item.data || {};
  const metrics = data.resultats || data.results || {};
  const normalizedMetrics = Object.fromEntries(METRIC_KEYS.map(key => [key, asNumber(metrics[key])]));
  const interactions = normalizedMetrics.reactions
    + normalizedMetrics.commentaires
    + normalizedMetrics.partages
    + normalizedMetrics.enregistrements;
  const engagementRate = normalizedMetrics.portee > 0
    ? round((interactions / normalizedMetrics.portee) * 100, 2)
    : null;

  const title = data.titre || data.title || data.concept || 'Sans titre';
  const format = data.format || data.type || 'inconnu';
  const status = data.statut || data.status || '';
  const syncStatus = item.sync_status || data.syncStatus || 'not_connected';
  const hasMetrics = METRIC_KEYS.some(key => normalizedMetrics[key] > 0);

  return {
    id: item.id || data.id || null,
    title,
    format,
    status,
    platform: item.platform || data.canal || data.platform || '',
    syncStatus,
    isDemo: syncStatus === 'demo' || Boolean(data.isDemo),
    finalUrl: item.final_url || data.finalUrl || '',
    lastSyncedAt: item.last_synced_at || data.lastSyncedAt || null,
    metrics: normalizedMetrics,
    interactions,
    engagementRate,
    hasMetrics
  };
}

export function buildKpiContext({
  brand = 'nidal-junior',
  targetsRecord = {},
  contents = [],
  socialProfiles = {},
  now = new Date()
} = {}) {
  const slug = normalizeBrand(brand);
  const instagramRecord = socialProfiles?.instagram || null;
  const facebookRecord = socialProfiles?.facebook || null;
  const instagramProfile = instagramRecord?.profile || instagramRecord || null;
  const facebookProfile = facebookRecord?.profile || facebookRecord || null;
  const liveFollowers = instagramProfile?.source === 'meta-api' && Number.isFinite(Number(instagramProfile.followers))
    ? Number(instagramProfile.followers)
    : null;

  const targets = Object.entries(targetsRecord?.targets || {})
    .map(([name, raw]) => {
      const effective = name === 'followers' && liveFollowers !== null
        ? { ...raw, current: liveFollowers }
        : raw;
      return normalizeTarget(name, effective, now);
    });

  const normalizedContents = (contents || []).map(normalizeContent);
  const measured = normalizedContents.filter(item => item.hasMetrics);
  const realMeasured = measured.filter(item => !item.isDemo);
  const demoMeasured = measured.filter(item => item.isDemo);

  const totals = Object.fromEntries(METRIC_KEYS.map(key => [
    key,
    realMeasured.reduce((sum, item) => sum + asNumber(item.metrics[key]), 0)
  ]));
  totals.interactions = realMeasured.reduce((sum, item) => sum + item.interactions, 0);
  totals.engagementRate = totals.portee > 0
    ? round((totals.interactions / totals.portee) * 100, 2)
    : null;

  const averages = {};
  for (const key of [...METRIC_KEYS, 'interactions']) {
    averages[key] = realMeasured.length
      ? round((key === 'interactions' ? totals.interactions : totals[key]) / realMeasured.length, 2)
      : 0;
  }
  averages.engagementRate = totals.engagementRate;

  const topContent = [...realMeasured]
    .sort((a, b) => {
      const aScore = (a.interactions * 10) + a.metrics.vues + a.metrics.portee;
      const bScore = (b.interactions * 10) + b.metrics.vues + b.metrics.portee;
      return bScore - aScore;
    })
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      title: item.title,
      format: item.format,
      platform: item.platform,
      interactions: item.interactions,
      engagementRate: item.engagementRate,
      views: item.metrics.vues,
      reach: item.metrics.portee,
      comments: item.metrics.commentaires,
      shares: item.metrics.partages,
      saves: item.metrics.enregistrements,
      finalUrl: item.finalUrl
    }));

  return {
    version: 1,
    brand: slug,
    generatedAt: now.toISOString(),
    targets,
    dataQuality: {
      totalContents: normalizedContents.length,
      measuredContents: measured.length,
      realMeasuredContents: realMeasured.length,
      demoMeasuredContents: demoMeasured.length,
      unmeasuredContents: normalizedContents.length - measured.length,
      warning: demoMeasured.length
        ? 'Des contenus de démonstration existent et sont exclus des agrégats réels.'
        : null
    },
    socialLive: {
      instagram: instagramProfile ? {
        source: instagramProfile.source || instagramRecord?.source || null,
        username: instagramProfile.username || null,
        followers: instagramProfile.followers ?? null,
        follows: instagramProfile.follows ?? null,
        mediaCount: instagramProfile.mediaCount ?? null,
        profileViews: instagramProfile.insights?.profileViews ?? null,
        reach: instagramProfile.insights?.reach ?? null,
        accountsEngaged: instagramProfile.insights?.accountsEngaged ?? null,
        syncedAt: instagramRecord?.synced_at || instagramRecord?.syncedAt || null
      } : null,
      facebook: facebookProfile ? {
        source: facebookProfile.source || facebookRecord?.source || null,
        username: facebookProfile.username || null,
        name: facebookProfile.name || null,
        followers: facebookProfile.followers ?? null,
        syncedAt: facebookRecord?.synced_at || facebookRecord?.syncedAt || null
      } : null
    },
    contentPerformance: {
      totals,
      averages,
      topContent
    }
  };
}

export function formatKpiContext(context = {}) {
  const lines = [
    '=== CONTEXTE KPI NJKPI (DONNÉES INTERNES) ===',
    `Marque : ${context.brand || 'inconnue'}`,
    `Généré le : ${context.generatedAt || new Date().toISOString()}`,
    '',
    'OBJECTIFS KPI'
  ];

  const targets = Array.isArray(context.targets) ? context.targets : [];
  if (!targets.length) {
    lines.push('- Aucun objectif KPI disponible.');
  } else {
    for (const target of targets) {
      const progress = target.progressPct === null ? 'n/a' : `${target.progressPct}%`;
      const eta = target.eta || 'non définie';
      const pace = target.requiredPerDay === null ? 'n/a' : `${target.requiredPerDay}/jour`;
      lines.push(
        `- ${target.name}: ${target.current}/${target.target} (${progress}), restant ${target.remaining}, échéance ${eta}, rythme requis ${pace}`
      );
    }
  }

  const perf = context.contentPerformance || {};
  const quality = context.dataQuality || {};
  const totals = perf.totals || {};
  const social = context.socialLive || {};
  const socialInstagram = social.instagram || null;
  const socialFacebook = social.facebook || null;

  lines.push(
    '',
    'QUALITÉ DES DONNÉES',
    `- Contenus total : ${quality.totalContents || 0}`,
    `- Contenus avec métriques réelles : ${quality.realMeasuredContents || 0}`,
    `- Contenus de démonstration exclus : ${quality.demoMeasuredContents || 0}`,
    `- Contenus sans métriques : ${quality.unmeasuredContents || 0}`,
    '',
    'META LIVE — PLATEFORMES SÉPARÉES',
    socialInstagram
      ? `- Instagram @${socialInstagram.username || 'inconnu'} : ${socialInstagram.followers ?? 'n/a'} abonnés, ${socialInstagram.profileViews ?? 'n/a'} visites profil, reach ${socialInstagram.reach ?? 'n/a'}, ${socialInstagram.mediaCount ?? 'n/a'} médias`
      : '- Instagram : non synchronisé.',
    socialFacebook
      ? `- Facebook ${socialFacebook.name || socialFacebook.username || 'Page'} : ${socialFacebook.followers ?? 'n/a'} abonnés`
      : '- Facebook : non synchronisé.',
    '',
    'AGRÉGATS DES CONTENUS RÉELS',
    `- Portée : ${totals.portee || 0}`,
    `- Vues : ${totals.vues || 0}`,
    `- Interactions : ${totals.interactions || 0}`,
    `- Commentaires : ${totals.commentaires || 0}`,
    `- Partages : ${totals.partages || 0}`,
    `- Enregistrements : ${totals.enregistrements || 0}`,
    `- Taux d'engagement agrégé : ${totals.engagementRate ?? 'n/a'}%`,
    '',
    'MEILLEURS CONTENUS RÉELS'
  );

  const top = Array.isArray(perf.topContent) ? perf.topContent : [];
  if (!top.length) {
    lines.push('- Pas encore assez de données réelles pour classer les contenus.');
  } else {
    top.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.title} | ${item.format} | vues ${item.views} | portée ${item.reach} | interactions ${item.interactions} | engagement ${item.engagementRate ?? 'n/a'}%`
      );
    });
  }

  lines.push(
    '',
    'RÈGLES D’INTERPRÉTATION',
    '- Utilise uniquement les chiffres fournis ci-dessus comme faits.',
    '- Ne présente jamais les données de démonstration comme des performances réelles.',
    '- Signale explicitement les données manquantes avant de tirer une conclusion.',
    '- Relie les recommandations de contenu aux KPI observés, sans inventer de causalité.',
    '- Toute publication ou modification publique reste soumise à validation humaine.'
  );

  return lines.join('\n');
}

export function buildKpiAutomationBrief({ event = 'kpi.updated', brand = 'nidal-junior' } = {}) {
  return [
    `Événement automatique : ${event}`,
    `Marque : ${normalizeBrand(brand)}`,
    'Analyse le contexte KPI fourni.',
    'Identifie les écarts par rapport aux objectifs, les formats qui performent, les signaux faibles et les données manquantes.',
    'Propose ensuite au maximum 5 actions concrètes et priorisées pour les 7 prochains jours.',
    'Les actions de création peuvent être proposées comme brouillons, mais rien ne doit être publié automatiquement.'
  ].join('\n');
}
