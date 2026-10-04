import { listContents, upsertContent, saveMetrics, saveAds, saveLeads, getKpiTargets, saveKpiTargets } from '../repository.js';
import { metaConfigured, syncContentFromUrl, syncAds, syncLeads, syncFollowers } from './meta.js';

const statuses = new Map();
const running = new Map();
const configuredInterval = Number(process.env.META_SYNC_INTERVAL_MINUTES || 15);
export const intervalMinutes = Number.isFinite(configuredInterval) ? Math.max(1, configuredInterval) : 15;
export const syncStatus = brand => statuses.get(brand) || { running: false, lastAttemptAt: null, lastSyncedAt: null, errors: [] };

export function synchronizeBrand(brand) {
  if (running.has(brand)) return running.get(brand);
  const task = run(brand).finally(() => running.delete(brand));
  running.set(brand, task);
  return task;
}

async function run(brand) {
  const status = { ...syncStatus(brand), running: true, lastAttemptAt: new Date().toISOString(), errors: [] };
  statuses.set(brand, status);
  const attempt = async (label, action) => {
    try { await action(); } catch (error) { status.errors.push(`${label} : ${error.message}`); }
  };
  status.leads = { ...status.leads, running: true, error: null };
  try {
    const rows = await saveLeads(brand, await syncLeads(brand));
    status.leads = { running: false, error: null, count: rows.length, lastSyncedAt: new Date().toISOString() };
  } catch (error) {
    status.leads.running = false;
    status.leads.error = error.message;
    status.errors.push(`Leads : ${error.message}`);
  }
  await attempt('Publications', async () => {
    if (!metaConfigured(brand) || process.env.DEMO_MODE === 'true') return;
    for (const content of await listContents(brand)) {
      const finalUrl = content.final_url || content.data?.finalUrl;
      if (!finalUrl) continue;
      await attempt(content.data?.titre || content.id, async () => {
        const sync = await syncContentFromUrl({ brand, finalUrl, platform: content.platform, requireVerifiedMetrics: true });
        const now = new Date().toISOString();
        await upsertContent({ ...content, data: { ...content.data, resultats: { ...content.data?.resultats, ...sync.metrics }, syncStatus: 'connected', lastSyncedAt: now }, externalMediaId: sync.externalMediaId, syncStatus: 'connected', lastSyncedAt: now });
        await saveMetrics(content.id, sync.source, sync.metrics, false);
      });
    }
  });
  let campaigns;
  await attempt('Campagnes', async () => { campaigns = await syncAds(brand); await saveAds(brand, campaigns); });
  await attempt('KPI', async () => {
    if (process.env.DEMO_MODE === 'true') return;
    const { targets } = await getKpiTargets(brand);
    const next = { ...targets };
    const now = new Date().toISOString();
    const set = (key, value, note) => { next[key] = { ...next[key], current: value, note, source: 'meta', lastSyncedAt: now }; };
    await attempt('Abonnes', async () => set('followers', await syncFollowers(brand), 'Abonnés Facebook + Instagram (comptes cumulés)'));
    const contents = (await listContents(brand)).filter(row => row.sync_status === 'connected' && row.external_media_id && !row.external_media_id.startsWith('scraped_'));
    if (contents.length) {
      const sum = key => contents.reduce((total, row) => total + Number(row.data?.resultats?.[key] || 0), 0);
      set('views', sum('vues'), 'Vues cumulées des publications reliées à Meta');
      set('comments', sum('commentaires'), 'Commentaires des publications reliées à Meta');
      set('reach', sum('portee'), 'Portées cumulées par publication, personnes non dédupliquées');
      set('interactions', sum('reactions') + sum('commentaires') + sum('partages') + sum('enregistrements'), 'Interactions des publications reliées à Meta');
    }
    if (campaigns) set('conversions', campaigns.reduce((total, row) => total + Number(row.actions?.find(action => action.action_type === 'lead')?.value || 0), 0), 'Leads Meta Ads sur les 30 derniers jours');
    await saveKpiTargets(brand, next);
  });
  status.running = false;
  if (!status.errors.length) status.lastSyncedAt = new Date().toISOString();
  return status;
}

export function startMetaSync() {
  if (process.env.META_AUTO_SYNC === 'false' || process.env.DEMO_MODE === 'true') return;
  const tick = () => {
    for (const brand of ['nidal', 'nidal-junior']) {
      if (metaConfigured(brand) || process.env.META_ACCESS_TOKEN) synchronizeBrand(brand).catch(error => console.error('Synchronisation Meta:', error.message));
    }
  };
  tick();
  const timer = setInterval(tick, intervalMinutes * 60000);
  timer.unref();
}
