import assert from 'node:assert/strict';
process.env.DEMO_MODE = 'false';
process.env.META_IG_USER_ID_NIDAL_JUNIOR = 'junior';
process.env.META_IG_ACCESS_TOKEN_NIDAL_JUNIOR = 'junior-token';
process.env.META_PAGE_ID_NIDAL = 'page';
process.env.META_PAGE_ACCESS_TOKEN_NIDAL = 'page-token';
delete process.env.DATABASE_URL;
const { publishSocialJob, preflightSocialPublishJob, validatePublishFormat } = await import('./server/services/meta.js');
const { upsertContent } = await import('./server/repository.js');
const resolve = globalThis.NidalMediaFormat.resolve;
const photo = { url: 'https://media.example/photo.jpg', type: 'image/jpeg' };
const video = { url: 'https://media.example/video.mp4', type: 'video/mp4' };
assert.equal(resolve({ format: 'story', mediaUrl: photo.url, mediaItems: [photo] }).type, 'story_image');
assert.equal(resolve({ format: 'story', mediaUrl: video.url, mediaItems: [video] }).type, 'story_video');
assert.equal(resolve({ format: 'post', plateforme: 'Instagram Story (IG)', mediaUrl: photo.url }).type, 'story_image');
assert.equal(resolve({ format: 'post', plateforme: 'Facebook Reel (FB)', mediaUrl: video.url }).type, 'reel');
assert.throws(() => validatePublishFormat({ mediaType: 'story_image', mediaUrl: photo.url, metadata: { mediaItems: [photo, photo] } }), /seule/);
assert.throws(() => validatePublishFormat({ mediaType: 'reel', mediaUrl: photo.url, metadata: { mediaItems: [photo] } }), /fichier vidéo/);
assert.throws(() => validatePublishFormat({ mediaType: 'unknown', mediaUrl: photo.url }), /non pris en charge/);
const containers = new Map(), media = new Map(), instagramCalls = [], facebookCalls = [], uploaded = [];
let counter = 0, publishes = 0;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input), params = Object.fromEntries(url.searchParams);
  const path = url.pathname.replace(/^\/v[^/]+\//, '');
  let payload;
  if (url.hostname === 'media.example') return { ok: true, status: 200, url: url.href, headers: new Headers({ 'content-type': url.pathname.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' }) };
  if (url.hostname === 'rupload.facebook.com') {
    assert.equal(options.headers.Authorization, 'OAuth page-token');
    assert.equal(options.headers.file_url, video.url);
    uploaded.push(url.href); payload = { success: true };
  } else if (url.hostname === 'graph.instagram.com') {
    assert.equal(options.headers.Authorization, 'Bearer junior-token');
    if (path === 'me') payload = { id: 'junior' };
    else if (path === 'me/permissions') payload = { data: [{ permission: 'instagram_business_content_publish', status: 'granted' }] };
    else if (path === 'junior/insights' || path === 'junior/content_publishing_limit') payload = { data: [] };
    else if (path === 'junior/media' && options.method === 'POST') {
      const id = `container-${++counter}`; containers.set(id, params); instagramCalls.push(params); payload = { id };
    } else if (path === 'junior/media_publish') {
      const container = containers.get(params.creation_id);
      assert.ok(container);
      const id = `media-${params.creation_id}`;
      media.set(id, container.media_type === 'STORIES' ? { id, timestamp: '2026-10-04', story: true } : { id, permalink: `https://instagram.com/p/${id}/` });
      publishes++; payload = { id };
    } else if (path === 'junior/stories') payload = { data: [...media.values()].filter(item => item.story) };
    else if (containers.has(path)) payload = { status_code: 'FINISHED' };
    else if (media.has(path)) {
      assert.ok(!params.fields.includes('media_product_type'), 'Ne pas demander un champ réservé à Facebook Login');
      payload = media.get(path);
    } else throw new Error('Unexpected Instagram call ' + path);
  } else if (url.hostname === 'graph.facebook.com') {
    assert.equal(params.access_token, 'page-token');
    if (path === 'me') payload = { id: 'page' };
    else if (options.method === 'POST') {
      facebookCalls.push({ path, params });
      if (path === 'page/photos') payload = { id: 'fb-photo' };
      else if (path === 'page/photo_stories') { assert.equal(params.photo_id, 'fb-photo'); payload = { success: true, post_id: 'fb-story' }; }
      else if (path === 'page/video_reels' || path === 'page/video_stories') {
        payload = params.upload_phase.toLowerCase() === 'start'
          ? { video_id: path.endsWith('video_stories') ? 'fb-video-story' : 'fb-reel', upload_url: 'https://rupload.facebook.com/video-upload/session' }
          : { success: true };
      } else if (path === 'page/videos') { assert.equal(params.file_url, video.url); payload = { id: 'fb-feed-video' }; }
      else if (path === 'page/feed') payload = { id: 'fb-text' };
      else throw new Error('Unexpected Facebook call ' + path);
    } else if (params.fields === 'status') payload = { status: { publishing_phase: { status: 'complete' } } };
    else payload = { id: path, permalink_url: `https://facebook.com/${path}` };
  } else throw new Error('Unexpected host ' + url.hostname);
  return { ok: true, json: async () => payload };
};
for (const type of ['story_image', 'story_video', 'image', 'reel', 'video']) {
  const item = ['story_video', 'reel', 'video'].includes(type) ? video : photo;
  const job = { brand: 'nidal-junior', mediaType: type, mediaUrl: item.url, message: 'Légende', platforms: ['instagram'], metadata: { mediaItems: [item] } };
  const preflight = await preflightSocialPublishJob(job);
  const prepared = instagramCalls.at(-1);
  const isStory = type.startsWith('story_');
  assert.equal(prepared.media_type, isStory ? 'STORIES' : item === video ? 'REELS' : undefined);
  assert.equal(prepared[item === video ? 'video_url' : 'image_url'], item.url);
  if (isStory) assert.equal(prepared.caption, undefined, 'Une légende de post ne doit pas être envoyée à une story');
  if (!isStory && item === video) assert.equal(prepared.share_to_feed, 'true');
  const before = instagramCalls.length;
  const saved = { ...job, media_url: item.url, media_type: job.mediaType, metadata: { ...job.metadata, preflight } };
  const result = await publishSocialJob(saved);
  assert.equal(result.result.instagram.verified, true);
  if (isStory) assert.equal(result.result.instagram.permalink, undefined, 'La confirmation story fonctionne sans permalink');
  assert.equal(instagramCalls.length, before, 'Réutiliser le conteneur du bon format');
  const publishCount = publishes;
  await publishSocialJob(saved);
  assert.equal(publishes, publishCount, 'Une reprise de vérification ne doit pas republier');
}
await upsertContent({ id: 'legacy-story', brand: 'nidal-junior', data: { format: 'story', mediaItems: [photo] } });
await publishSocialJob({ brand: 'nidal-junior', media_url: photo.url, media_type: 'image', platforms: ['instagram'], metadata: { contentId: 'legacy-story', preflight: { instagram: { preparedContainer: { id: 'old-feed-container', expiresAt: new Date(Date.now() + 100000).toISOString() } } } } });
assert.equal(instagramCalls.at(-1).media_type, 'STORIES', 'Corriger les anciennes programmations liées à une story sans réutiliser un conteneur du fil');
for (const type of ['story_image', 'story_video', 'image', 'reel', 'video', 'text']) {
  const item = ['story_video', 'reel', 'video'].includes(type) ? video : photo;
  const job = { brand: 'nidal', media_type: type, media_url: type === 'text' ? null : item.url, message: 'Légende', platforms: ['facebook'], metadata: { mediaItems: type === 'text' ? [] : [item] } };
  const before = facebookCalls.length;
  const result = await publishSocialJob(job);
  assert.equal(result.result.facebook.verified, true);
  const paths = facebookCalls.slice(before).map(call => call.path);
  if (type !== 'text') assert.ok(!paths.includes('page/feed'), 'Ne pas remplacer une story/reel/vidéo par un post texte');
  if (type === 'story_image') { assert.ok(paths.includes('page/photo_stories')); assert.equal(facebookCalls[before].params.published, 'false'); }
  if (type === 'story_video') assert.ok(paths.includes('page/video_stories'));
  if (type === 'reel') assert.ok(paths.includes('page/video_reels'));
  if (type === 'video') assert.ok(paths.includes('page/videos'));
  if (type === 'story_video' || type === 'reel') {
    const uploadCount = uploaded.length;
    await publishSocialJob(job);
    assert.equal(uploaded.length, uploadCount, 'Réutiliser la session Facebook sans renvoyer la vidéo');
    assert.equal(facebookCalls.length, before + 2, 'Ne pas finaliser deux fois la publication Facebook');
  }
}
console.log('Formats validés : stories photo/vidéo, posts, reels, vidéos, vérification sans permalink, reprises sans doublon et anciennes programmations.');
