const cache = new Map();

function cacheKey(brand) {
  return brand === 'nidal' ? 'nidal' : 'nidal-junior';
}

export function getMetaLiveCache(brand) {
  return cache.get(cacheKey(brand)) || null;
}

export function setMetaLiveCache(brand, value) {
  const key = cacheKey(brand);
  const entry = { ...value, cachedAt: new Date().toISOString() };
  cache.set(key, entry);
  return entry;
}

export function isMetaLiveCacheFresh(brand, ttlSeconds = 60) {
  const entry = getMetaLiveCache(brand);
  if (!entry?.cachedAt) return false;
  const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
  return ageMs >= 0 && ageMs < Math.max(5, Number(ttlSeconds) || 60) * 1000;
}
