/**
 * Service d'analyse d'URLs de réseaux sociaux.
 * Détecte la plateforme, le type de contenu et extrait les identifiants.
 */

const PLATFORM_RULES = [
  {
    platform: 'instagram',
    patterns: [/instagram\.com/i],
    typeRules: [
      { pattern: /\/reel\/([A-Za-z0-9_-]+)/i, type: 'reel', idGroup: 1 },
      { pattern: /\/stories\/[^/]+\/(\d+)/i, type: 'story', idGroup: 1 },
      { pattern: /\/tv\/([A-Za-z0-9_-]+)/i, type: 'video', idGroup: 1 },
      { pattern: /\/p\/([A-Za-z0-9_-]+)/i, type: 'post', idGroup: 1 }
    ]
  },
  {
    platform: 'facebook',
    patterns: [/facebook\.com/i, /fb\.watch/i],
    typeRules: [
      { pattern: /\/reel\/(\d+)/i, type: 'reel', idGroup: 1 },
      { pattern: /\/videos\/(\d+)/i, type: 'video', idGroup: 1 },
      { pattern: /fb\.watch\/([A-Za-z0-9_-]+)/i, type: 'video', idGroup: 1 },
      { pattern: /\/posts\/([A-Za-z0-9_.-]+)/i, type: 'post', idGroup: 1 },
      { pattern: /\/photo[s]?\/([A-Za-z0-9_.]+)/i, type: 'post', idGroup: 1 }
    ]
  },
  {
    platform: 'tiktok',
    patterns: [/tiktok\.com/i],
    typeRules: [
      { pattern: /\/video\/(\d+)/i, type: 'video', idGroup: 1 },
      { pattern: /vm\.tiktok\.com\/([A-Za-z0-9_-]+)/i, type: 'video', idGroup: 1 }
    ]
  },
  {
    platform: 'youtube',
    patterns: [/youtube\.com/i, /youtu\.be/i],
    typeRules: [
      { pattern: /\/shorts\/([A-Za-z0-9_-]+)/i, type: 'short', idGroup: 1 },
      { pattern: /[?&]v=([A-Za-z0-9_-]+)/i, type: 'video', idGroup: 1 },
      { pattern: /youtu\.be\/([A-Za-z0-9_-]+)/i, type: 'video', idGroup: 1 }
    ]
  },
  {
    platform: 'linkedin',
    patterns: [/linkedin\.com/i],
    typeRules: [
      { pattern: /\/posts\/([A-Za-z0-9_-]+)/i, type: 'post', idGroup: 1 },
      { pattern: /\/feed\/update\/([A-Za-z0-9:_-]+)/i, type: 'post', idGroup: 1 }
    ]
  },
  {
    platform: 'x',
    patterns: [/x\.com/i, /twitter\.com/i],
    typeRules: [
      { pattern: /\/status\/(\d+)/i, type: 'post', idGroup: 1 }
    ]
  }
];

const FORMAT_MAP = { post: 'post', reel: 'video', story: 'story', video: 'video', short: 'video', article: 'article' };
const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X / Twitter' };

/**
 * Analyse une URL et détecte plateforme, type de contenu et identifiant.
 */
export function parseContentUrl(url) {
  const result = { platform: 'unknown', contentType: 'unknown', contentId: null, normalizedUrl: '', isValid: false };
  if (!url || typeof url !== 'string') return result;

  try {
    const cleaned = url.trim().replace(/\s+/g, '');
    result.normalizedUrl = cleaned;

    for (const rule of PLATFORM_RULES) {
      if (!rule.patterns.some(p => p.test(cleaned))) continue;
      result.platform = rule.platform;
      result.isValid = true;

      for (const tr of rule.typeRules) {
        const match = cleaned.match(tr.pattern);
        if (match) {
          result.contentType = tr.type;
          result.contentId = match[tr.idGroup] || null;
          break;
        }
      }
      if (result.contentType === 'unknown') result.contentType = 'post';
      break;
    }
  } catch { /* URL invalide */ }
  return result;
}

/** Version simplifiée — retourne juste le nom de la plateforme. */
export function detectPlatform(url) {
  return parseContentUrl(url).platform;
}

/** Construit un objet contenu compatible avec le store à partir d'une URL analysée. */
export function buildContentFromUrl(parsed) {
  const platformLabel = PLATFORM_LABELS[parsed.platform] || 'Inconnu';
  const format = FORMAT_MAP[parsed.contentType] || 'post';
  return {
    titre: `Import ${platformLabel} — ${parsed.contentType}`,
    format,
    plateforme: platformLabel,
    statut: 'publie',
    finalUrl: parsed.normalizedUrl,
    syncStatus: 'pending',
    notes: `Importé depuis ${parsed.normalizedUrl}`
  };
}
