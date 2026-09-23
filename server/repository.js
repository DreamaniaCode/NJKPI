import { query, hasDatabase } from './db.js';

const memory = {
  contents: new Map(),
  metrics: [],
  ads: new Map(),
  agentRuns: []
};

export async function listBrands() {
  if (!hasDatabase) return [{ slug: 'nidal', name: 'Nidal' }, { slug: 'nidal-junior', name: 'Nidal Junior' }];
  const result = await query('SELECT slug, name FROM brands ORDER BY name');
  return result.rows;
}

export async function listContents(brand) {
  if (!hasDatabase) return [...memory.contents.values()].filter(item => !brand || item.brand_slug === brand);
  const result = await query('SELECT id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at, created_at, updated_at FROM contents WHERE ($1::text IS NULL OR brand_slug = $1) ORDER BY COALESCE(NULLIF(data->>\'datePublication\', \'\')::date, DATE \'9999-12-31\'), updated_at DESC', [brand || null]);
  return result.rows;
}

export async function getContent(id) {
  if (!hasDatabase) return memory.contents.get(id) || null;
  const result = await query('SELECT id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at FROM contents WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function upsertContent(content) {
  const record = {
    id: content.id,
    brand_slug: content.brand || content.brand_slug || 'nidal-junior',
    data: content.data || content,
    final_url: content.finalUrl || content.final_url || null,
    external_media_id: content.externalMediaId || content.external_media_id || null,
    platform: content.platform || content.plateforme || null,
    sync_status: content.syncStatus || content.sync_status || 'not_connected',
    last_synced_at: content.lastSyncedAt || content.last_synced_at || null,
    updated_at: new Date().toISOString()
  };
  if (!hasDatabase) { memory.contents.set(record.id, record); return record; }
  const result = await query(`
    INSERT INTO contents (id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at)
    VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
    ON CONFLICT (id) DO UPDATE SET brand_slug=EXCLUDED.brand_slug, data=EXCLUDED.data, final_url=EXCLUDED.final_url,
      external_media_id=EXCLUDED.external_media_id, platform=EXCLUDED.platform, sync_status=EXCLUDED.sync_status,
      last_synced_at=EXCLUDED.last_synced_at, updated_at=NOW()
    RETURNING id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at, created_at, updated_at`,
    [record.id, record.brand_slug, JSON.stringify(record.data), record.final_url, record.external_media_id, record.platform, record.sync_status, record.last_synced_at]
  );
  return result.rows[0];
}

export async function deleteContent(id) {
  if (!hasDatabase) return memory.contents.delete(id);
  const result = await query('DELETE FROM contents WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function saveMetrics(contentId, source, metrics, isDemo) {
  const capturedAt = new Date().toISOString();
  if (!hasDatabase) { memory.metrics.push({ content_id: contentId, source, metrics, is_demo: isDemo, captured_at: capturedAt }); return; }
  await query('INSERT INTO content_metrics (content_id, source, metrics, is_demo) VALUES ($1,$2,$3::jsonb,$4)', [contentId, source, JSON.stringify(metrics), isDemo]);
}

export async function saveAds(brand, campaigns) {
  for (const campaign of campaigns) {
    const record = { external_id: campaign.campaign_id, brand_slug: brand, name: campaign.campaign_name || 'Campagne sans nom', status: campaign.status || null, insights: campaign, is_demo: Boolean(campaign.isDemo), last_synced_at: new Date().toISOString() };
    if (!hasDatabase) { memory.ads.set(`${brand}:${record.external_id}`, record); continue; }
    await query(`INSERT INTO ad_campaigns (external_id,brand_slug,name,status,insights,is_demo,last_synced_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW()) ON CONFLICT (external_id,brand_slug) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,insights=EXCLUDED.insights,is_demo=EXCLUDED.is_demo,last_synced_at=NOW()`, [record.external_id, brand, record.name, record.status, JSON.stringify(record.insights), record.is_demo]);
  }
  return listAds(brand);
}

export async function listAds(brand) {
  if (!hasDatabase) return [...memory.ads.values()].filter(item => item.brand_slug === brand);
  const result = await query('SELECT external_id,brand_slug,name,status,insights,is_demo,last_synced_at FROM ad_campaigns WHERE brand_slug=$1 ORDER BY last_synced_at DESC', [brand]);
  return result.rows;
}

export async function saveAgentRun(run) {
  if (!hasDatabase) { memory.agentRuns.push(run); return run; }
  await query('INSERT INTO agent_runs (id,brand_slug,task,brief,output,model,is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7)', [run.id, run.brand, run.task, run.brief, run.output, run.model, run.isDemo]);
  return run;
}
