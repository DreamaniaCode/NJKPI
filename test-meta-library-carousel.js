import assert from 'node:assert/strict';
process.env.DEMO_MODE = 'false';
process.env.META_IG_USER_ID_NIDAL_JUNIOR = 'junior';
process.env.META_IG_ACCESS_TOKEN_NIDAL_JUNIOR = 'test-junior';
delete process.env.DATABASE_URL;
const { getCarouselItems, preflightSocialPublishJob, publishSocialJob } = await import('./server/services/meta.js');
const { syncMetaLibrary } = await import('./server/services/meta-library.js');
const { listContents, upsertContent } = await import('./server/repository.js');
const items = ['first', 'second'].map(name => ({ url: `https://media.example/${name}.jpg`, type: 'image/jpeg' }));
assert.throws(() => getCarouselItems({ mediaType: 'carousel', metadata: { mediaItems: [items[0]] } }), /2 et 10/);
assert.throws(() => getCarouselItems({ mediaType: 'carousel', metadata: { mediaItems: Array(11).fill(items[0]) } }), /2 et 10/);
assert.throws(() => getCarouselItems({ mediaType: 'carousel', metadata: { mediaItems: [{ url: 'http://bad' }, items[1]] } }), /HTTPS/);
const created = []; let published = 0, libraryMode = false, storyVisible = true, secondPageFailed = false;
const facebookPhotos = [];
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  if (url.hostname === 'media.example') return { ok: true, status: 200, url: url.href, headers: new Headers({ 'content-type': 'image/jpeg' }) };
  if (url.hostname === 'graph.facebook.com') {
    assert.equal(url.searchParams.get('access_token'), 'page-test');
    let payload;
    if (url.pathname.endsWith('/me')) payload = { id: 'page' };
    else if (url.pathname.endsWith('/photos')) {
      assert.equal(url.searchParams.get('published'), 'false');
      facebookPhotos.push(url.searchParams.get('url'));
      payload = { id: `photo-${facebookPhotos.length}` };
    } else if (url.pathname.endsWith('/feed')) {
      assert.deepEqual(JSON.parse(url.searchParams.get('attached_media')), [{ media_fbid: 'photo-1' }, { media_fbid: 'photo-2' }]);
      payload = { id: 'fb-post' };
    } else payload = { id: 'fb-post', permalink_url: 'https://facebook.com/post' };
    return { ok: true, json: async () => payload };
  }
  assert.equal(options.headers?.Authorization, 'Bearer test-junior');
  const path = url.pathname.replace(/^\/v[^/]+\//, '');
  let payload;
  if (path === 'me') payload = { id: 'junior', username: 'nidaljunior' };
  else if (path === 'me/permissions') payload = { data: [{ permission: 'instagram_business_content_publish', status: 'granted' }] };
  else if (path === 'junior/media' && options.method === 'POST') {
    const params = Object.fromEntries(url.searchParams);
    created.push(params);
    payload = { id: params.media_type === 'CAROUSEL' ? 'parent' : `child-${created.length}` };
  } else if (path === 'junior/media_publish') { assert.equal(url.searchParams.get('creation_id'), 'parent'); published++; payload = { id: 'published' }; }
  else if (path === 'published') payload = { id: 'published', permalink: 'https://instagram.com/p/carousel/' };
  else if (path === 'junior/media' && libraryMode) {
    if (url.searchParams.get('after') && secondPageFailed) return { ok: false, status: 403, json: async () => ({ error: { message: 'Page suivante refusée' } }) };
    payload = url.searchParams.get('after')
      ? { data: [{ id: 'reel', media_type: 'VIDEO', caption: 'Reel externe', timestamp: '2026-10-02T10:00:00Z', permalink: 'https://instagram.com/reel/external/' }] }
      : { data: [{ id: 'external', media_type: 'CAROUSEL_ALBUM', caption: 'Carrousel externe', timestamp: '2026-10-01T10:00:00Z', permalink: 'https://instagram.com/p/external/', children: { data: [{ id: 'a', media_url: items[0].url, media_type: 'IMAGE' }] } }], paging: { next: 'ignored', cursors: { after: 'next' } } };
  } else if (path === 'junior/stories') payload = { data: storyVisible ? [{ id: 'story', media_type: 'IMAGE', timestamp: '2026-10-04T10:00:00Z' }] : [] };
  else if (path === 'junior/content_publishing_limit') payload = { data: [] };
  else if (path === 'junior/insights') payload = { data: [] };
  else payload = { status_code: 'FINISHED' };
  return { ok: true, json: async () => payload };
};
const job = { brand: 'nidal-junior', mediaUrl: items[0].url, mediaType: 'carousel', message: 'Notre carrousel', platforms: ['instagram'], scheduledAt: new Date().toISOString(), metadata: { mediaItems: items } };
const preflight = await preflightSocialPublishJob(job);
assert.equal(created.length, 3);
assert.equal(created[0].is_carousel_item, 'true');
assert.equal(created[1].image_url, items[1].url);
assert.equal(created[2].media_type, 'CAROUSEL');
assert.equal(created[2].children, 'child-1,child-2');
assert.equal(created[2].caption, 'Notre carrousel');
const result = await publishSocialJob({ ...job, media_url: job.mediaUrl, media_type: job.mediaType, metadata: { ...job.metadata, preflight } });
assert.equal(result.result.instagram.verified, true);
assert.equal(created.length, 3, 'Réutiliser le conteneur préparé sans recréer les photos');
assert.equal(published, 1);
process.env.META_PAGE_ID_NIDAL = 'page';
process.env.META_PAGE_ACCESS_TOKEN_NIDAL = 'page-test';
const facebook = await publishSocialJob({ ...job, brand: 'nidal', platforms: ['facebook'], media_url: job.mediaUrl, media_type: job.mediaType });
assert.equal(facebook.result.facebook.id, 'fb-post');
assert.deepEqual(facebookPhotos, items.map(item => item.url));
libraryMode = true;
await upsertContent({ id: 'local-linked', brand: 'nidal-junior', finalUrl: 'https://instagram.com/p/external/', data: { titre: 'Titre éditorial conservé', notes: 'Note locale' } });
const library = await syncMetaLibrary('nidal-junior');
assert.equal(library.imported, 3);
assert.deepEqual(library.errors, []);
let rows = await listContents('nidal-junior');
assert.equal(rows.length, 3);
assert.equal(rows.find(row => row.id === 'local-linked').data.titre, 'Titre éditorial conservé');
assert.equal(rows.find(row => row.external_media_id === 'reel').data.format, 'video');
assert.equal(rows.find(row => row.external_media_id === 'story').data.format, 'story');
storyVisible = false;
await syncMetaLibrary('nidal-junior');
assert.equal((await listContents('nidal-junior')).length, 3, 'Pas de doublon ni de suppression des stories expirées');
assert.equal((await listContents('nidal')).length, 0, 'Isolation des marques');
secondPageFailed = true;
const partial = await syncMetaLibrary('nidal-junior');
assert.match(partial.errors[0], /Page suivante refusée/);
assert.equal((await listContents('nidal-junior')).length, 3, 'Conserver les contenus après une erreur de pagination');
console.log('Carrousel : ordre, préparation, publication unique ; bibliothèque : pagination, déduplication, stories, isolation et erreurs validées.');
