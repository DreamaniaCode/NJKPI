import assert from 'node:assert/strict';
process.env.DEMO_MODE = 'false';
process.env.META_ACCESS_TOKEN = 'test-token';
process.env.META_PAGE_ID_NIDAL = 'page';
process.env.META_AD_ACCOUNT_ID_NIDAL = 'account';
delete process.env.DATABASE_URL;
const { syncLeads, syncAds, syncContentFromUrl } = await import('./server/services/meta.js');
const { saveLeads, listLeads, getKpiTargets } = await import('./server/repository.js');
const { synchronizeBrand } = await import('./server/services/meta-sync.js');
let fail = false;
let leadCalls = 0;
let pageTokenCalls = 0;
globalThis.fetch = async url => {
  url = new URL(url);
  let payload;
  if (fail) return { ok: false, status: 403, json: async () => ({ error: { message: 'Permission refusee' } }) };
  if (url.pathname.endsWith('/me/accounts')) {
    assert.equal(url.searchParams.get('access_token'), 'test-token');
    pageTokenCalls++;
    payload = { data: [{ id: 'page', access_token: 'page-token' }] };
  } else if (url.pathname.endsWith('/me')) {
    assert.equal(url.searchParams.get('access_token'), 'page-token');
    payload = { id: 'page' };
  } else if (url.pathname.endsWith('/leadgen_forms')) {
    assert.equal(url.searchParams.get('access_token'), 'page-token', 'Les formulaires doivent utiliser le jeton de Page');
    payload = { data: [{ id: 'form', name: 'Inscriptions' }] };
  }
  else if (url.pathname.endsWith('/form/leads')) {
    assert.equal(url.searchParams.get('access_token'), 'page-token', 'Chaque page de leads doit utiliser le jeton de Page');
    leadCalls++;
    payload = url.searchParams.has('after') ? { data: [{ id: 'lead2', created_time: '2026-10-02', campaign_name: 'Campagne', field_data: [] }, { id: 'organic', is_organic: true }] }
      : { data: [{ id: 'lead1', created_time: '2026-10-01', field_data: [{ name: 'email', values: ['test@example.com'] }] }], paging: { next: 'ignored', cursors: { after: 'cursor' } } };
  } else if (url.pathname.endsWith('/insights')) payload = { data: [{ campaign_id: 'c1', campaign_name: 'Campagne', actions: [{ action_type: 'lead', value: '12' }] }] };
  else payload = { followers_count: 100 };
  return { ok: true, json: async () => payload };
};
const leads = await syncLeads('nidal');
assert.equal(leadCalls, 2);
assert.equal(pageTokenCalls, 1);
assert.equal(leads.length, 2);
assert.equal(leads[0].form_name, 'Inscriptions');
await saveLeads('nidal', leads);
await saveLeads('nidal', leads);
assert.equal((await listLeads('nidal')).length, 2);
assert.equal((await listLeads('nidal-junior')).length, 0);
const first = synchronizeBrand('nidal');
assert.equal(first, synchronizeBrand('nidal'));
const status = await first;
assert.equal(status.errors.length, 0);
assert.equal(status.leads.count, 2);
assert.ok(status.leads.lastSyncedAt);
assert.equal((await getKpiTargets('nidal')).targets.followers.current, 100);
assert.equal((await getKpiTargets('nidal')).targets.conversions.current, 12);
fail = true;
const failedStatus = await synchronizeBrand('nidal');
assert.ok(failedStatus.errors.length > 0);
assert.equal(failedStatus.leads.lastSyncedAt, status.leads.lastSyncedAt);
assert.match(failedStatus.leads.error, /Permission refusee/);
assert.equal((await listLeads('nidal')).length, 2);
assert.equal((await getKpiTargets('nidal')).targets.conversions.current, 12);
await assert.rejects(syncAds('nidal'), /Permission refusee/);
await assert.rejects(syncContentFromUrl({ brand: 'nidal', finalUrl: 'https://facebook.com/test', requireVerifiedMetrics: true }), /Permission refusee/);
console.log('Meta : pagination, isolation des marques, déduplication, KPI et conservation après erreur validés.');
