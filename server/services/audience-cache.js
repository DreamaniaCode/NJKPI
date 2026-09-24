const cache = new Map();

function key(brand) {
  return brand === 'nidal' ? 'nidal' : 'nidal-junior';
}

export function getAudienceCache(brand) {
  return cache.get(key(brand)) || null;
}

export function setAudienceCache(brand, payload) {
  const value = { ...payload, cachedAt: new Date().toISOString() };
  cache.set(key(brand), value);
  return value;
}

export function isAudienceCacheFresh(brand, ttlSeconds = 900) {
  const value = getAudienceCache(brand);
  if (!value?.cachedAt) return false;
  const age = Date.now() - new Date(value.cachedAt).getTime();
  return age >= 0 && age < Math.max(60, Number(ttlSeconds) || 900) * 1000;
}
