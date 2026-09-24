import { query, hasDatabase } from './db.js';

const memory = {
  contents: new Map(),
  metrics: [],
  ads: new Map(),
  agentRuns: []
};

export async function listBrands() {
  if (!hasDatabase) return [{ slug: 'nidal', name: 'Nidal' }, { slug: 'nidal-junior', name: 'Nidal Junior' }];
  try {
    const result = await query('SELECT slug, name FROM brands ORDER BY name');
    return result.rows;
  } catch (error) {
    console.warn('Fallback memoire listBrands:', error.message);
    return [{ slug: 'nidal', name: 'Nidal' }, { slug: 'nidal-junior', name: 'Nidal Junior' }];
  }
}

export async function listContents(brand) {
  if (!hasDatabase) return [...memory.contents.values()].filter(item => !brand || item.brand_slug === brand);
  try {
    const result = await query('SELECT id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at, created_at, updated_at FROM contents WHERE ($1::text IS NULL OR brand_slug = $1) ORDER BY COALESCE(NULLIF(data->>\'datePublication\', \'\')::date, DATE \'9999-12-31\'), updated_at DESC', [brand || null]);
    return result.rows;
  } catch (error) {
    console.warn('Fallback memoire listContents:', error.message);
    return [...memory.contents.values()].filter(item => !brand || item.brand_slug === brand);
  }
}

export async function getContent(id) {
  if (!hasDatabase) return memory.contents.get(id) || null;
  try {
    const result = await query('SELECT id, brand_slug, data, final_url, external_media_id, platform, sync_status, last_synced_at FROM contents WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.warn('Fallback memoire getContent:', error.message);
    return memory.contents.get(id) || null;
  }
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
  memory.contents.set(record.id, record);
  if (!hasDatabase) return record;
  try {
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
  } catch (error) {
    console.warn('Fallback memoire upsertContent:', error.message);
    return record;
  }
}

export async function deleteContent(id) {
  memory.contents.delete(id);
  if (!hasDatabase) return true;
  try {
    const result = await query('DELETE FROM contents WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.warn('Fallback memoire deleteContent:', error.message);
    return true;
  }
}

export async function saveMetrics(contentId, source, metrics, isDemo) {
  const capturedAt = new Date().toISOString();
  memory.metrics.push({ content_id: contentId, source, metrics, is_demo: isDemo, captured_at: capturedAt });
  if (!hasDatabase) return;
  try {
    await query('INSERT INTO content_metrics (content_id, source, metrics, is_demo) VALUES ($1,$2,$3::jsonb,$4)', [contentId, source, JSON.stringify(metrics), isDemo]);
  } catch (error) {
    console.warn('Fallback memoire saveMetrics:', error.message);
  }
}

export async function saveAds(brand, campaigns) {
  for (const campaign of campaigns) {
    const record = { external_id: campaign.campaign_id, brand_slug: brand, name: campaign.campaign_name || 'Campagne sans nom', status: campaign.status || null, insights: campaign, is_demo: Boolean(campaign.isDemo), last_synced_at: new Date().toISOString() };
    memory.ads.set(`${brand}:${record.external_id}`, record);
    if (!hasDatabase) continue;
    try {
      await query(`INSERT INTO ad_campaigns (external_id,brand_slug,name,status,insights,is_demo,last_synced_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW()) ON CONFLICT (external_id,brand_slug) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,insights=EXCLUDED.insights,is_demo=EXCLUDED.is_demo,last_synced_at=NOW()`, [record.external_id, brand, record.name, record.status, JSON.stringify(record.insights), record.is_demo]);
    } catch (error) {
      console.warn('Fallback memoire saveAds:', error.message);
    }
  }
  return listAds(brand);
}

export async function listAds(brand) {
  if (!hasDatabase) return [...memory.ads.values()].filter(item => item.brand_slug === brand);
  try {
    const result = await query('SELECT external_id,brand_slug,name,status,insights,is_demo,last_synced_at FROM ad_campaigns WHERE brand_slug=$1 ORDER BY last_synced_at DESC', [brand]);
    return result.rows;
  } catch (error) {
    console.warn('Fallback memoire listAds:', error.message);
    return [...memory.ads.values()].filter(item => item.brand_slug === brand);
  }
}

export async function saveAgentRun(run) {
  memory.agentRuns.push(run);
  if (!hasDatabase) return run;
  try {
    await query('INSERT INTO agent_runs (id,brand_slug,task,brief,output,model,is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7)', [run.id, run.brand, run.task, run.brief, run.output, run.model, run.isDemo]);
  } catch (error) {
    console.warn('Fallback memoire saveAgentRun:', error.message);
  }
  return run;
}

if (!memory.generations) memory.generations = new Map();
if (!memory.transfers) memory.transfers = [];

export async function saveEditorialGeneration(record) {
  const gen = {
    id: record.id,
    agent_key: record.agentKey || record.agent_key,
    brand_slug: record.brand || record.brand_slug || 'nidal-junior',
    conversation_id: record.conversationId || record.conversation_id || null,
    brief: record.brief || {},
    output: record.output || '',
    structured_data: record.structuredData || record.structured_data || {},
    storyboard: record.storyboard || null,
    quality_check: record.qualityCheck || record.quality_check || null,
    status: record.status || 'brouillon',
    content_id: record.contentId || record.content_id || null,
    parent_generation_id: record.parentGenerationId || record.parent_generation_id || null,
    model: record.model || null,
    is_demo: Boolean(record.isDemo || record.is_demo),
    created_at: record.createdAt || record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  memory.generations.set(gen.id, gen);
  if (!hasDatabase) return gen;
  try {
    const result = await query(`
      INSERT INTO agent_generations (id, agent_key, brand_slug, conversation_id, brief, output, structured_data, storyboard, quality_check, status, content_id, parent_generation_id, model, is_demo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET brief=EXCLUDED.brief, output=EXCLUDED.output, structured_data=EXCLUDED.structured_data,
        storyboard=EXCLUDED.storyboard, quality_check=EXCLUDED.quality_check, status=EXCLUDED.status,
        content_id=EXCLUDED.content_id, updated_at=NOW()
      RETURNING *`,
      [gen.id, gen.agent_key, gen.brand_slug, gen.conversation_id, JSON.stringify(gen.brief), gen.output, JSON.stringify(gen.structured_data), gen.storyboard ? JSON.stringify(gen.storyboard) : null, gen.quality_check ? JSON.stringify(gen.quality_check) : null, gen.status, gen.content_id, gen.parent_generation_id, gen.model, gen.is_demo, gen.created_at, gen.updated_at]
    );
    return result.rows[0];
  } catch (error) {
    console.warn('Fallback memoire saveEditorialGeneration:', error.message);
    return gen;
  }
}

export async function listEditorialGenerations(agentKey, brand) {
  if (!hasDatabase) {
    return [...memory.generations.values()]
      .filter(item => (!agentKey || item.agent_key === agentKey) && (!brand || item.brand_slug === brand))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  try {
    const result = await query(
      `SELECT * FROM agent_generations WHERE ($1::text IS NULL OR agent_key = $1) AND ($2::text IS NULL OR brand_slug = $2) ORDER BY created_at DESC LIMIT 50`,
      [agentKey || null, brand || null]
    );
    return result.rows;
  } catch (error) {
    console.warn('Fallback memoire listEditorialGenerations:', error.message);
    return [...memory.generations.values()]
      .filter(item => (!agentKey || item.agent_key === agentKey) && (!brand || item.brand_slug === brand))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export async function getEditorialGeneration(id) {
  if (!hasDatabase) return memory.generations.get(id) || null;
  try {
    const result = await query('SELECT * FROM agent_generations WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.warn('Fallback memoire getEditorialGeneration:', error.message);
    return memory.generations.get(id) || null;
  }
}

export async function deleteEditorialGeneration(id) {
  memory.generations.delete(id);
  if (!hasDatabase) return true;
  try {
    const result = await query('DELETE FROM agent_generations WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.warn('Fallback memoire deleteEditorialGeneration:', error.message);
    return true;
  }
}

export async function saveEditorialTransfer(transfer) {
  const record = {
    id: transfer.id,
    from_agent: transfer.fromAgent || transfer.from_agent,
    to_agent: transfer.toAgent || transfer.to_agent,
    source_generation_id: transfer.sourceGenerationId || transfer.source_generation_id,
    notes: transfer.notes || '',
    status: transfer.status || 'transfere',
    created_at: new Date().toISOString()
  };
  memory.transfers.push(record);
  if (!hasDatabase) return record;
  try {
    const result = await query(
      `INSERT INTO agent_transfers (id, from_agent, to_agent, source_generation_id, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [record.id, record.from_agent, record.to_agent, record.source_generation_id, record.notes, record.status, record.created_at]
    );
    return result.rows[0];
  } catch (error) {
    console.warn('Fallback memoire saveEditorialTransfer:', error.message);
    return record;
  }
}

if (!memory.kpiTargets) memory.kpiTargets = new Map();

const DEFAULT_BRAND_KPI_TARGETS = {
  'nidal-junior': {
    followers: { current: 2450, target: 5000, eta: '2026-12-31', note: 'Communauté Instagram & Facebook Nidal Junior' },
    views: { current: 18500, target: 50000, eta: '2026-11-30', note: 'Cumul des vues Reels, Stories et vidéos Nounou' },
    comments: { current: 320, target: 1000, eta: '2026-11-30', note: 'Réponses aux quiz, histoires et publications' },
    conversions: { current: 42, target: 120, eta: '2026-10-31', note: 'Demandes de visite, appels et inscriptions maternelle' },
    reach: { current: 12400, target: 35000, eta: '2026-11-30', note: 'Familles touchées sur la période' },
    interactions: { current: 1450, target: 4000, eta: '2026-11-30', note: 'Likes, commentaires, partages et enregistrements' }
  },
  'nidal': {
    followers: { current: 6800, target: 12000, eta: '2026-12-31', note: 'Communauté officielle Groupe Scolaire Nidal' },
    views: { current: 45000, target: 100000, eta: '2026-12-15', note: 'Vues cumulées des capsules pédagogiques et Reels' },
    comments: { current: 640, target: 2000, eta: '2026-12-15', note: 'Échanges avec les parents et élèves' },
    conversions: { current: 85, target: 250, eta: '2026-11-15', note: 'Prises de RDV, formulaires gsnidal.ma et inscriptions' },
    reach: { current: 28000, target: 75000, eta: '2026-12-15', note: 'Portée globale sur les réseaux sociaux' },
    interactions: { current: 3200, target: 8000, eta: '2026-12-15', note: 'Total réactions, commentaires, partages et favoris' }
  }
};

export async function getKpiTargets(brand = 'nidal-junior') {
  const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
  const fallback = DEFAULT_BRAND_KPI_TARGETS[slug];
  if (!hasDatabase) {
    return memory.kpiTargets.get(slug) || { brand_slug: slug, targets: fallback, updated_at: new Date().toISOString() };
  }
  try {
    const result = await query('SELECT brand_slug, targets, updated_at FROM kpi_targets WHERE brand_slug = $1', [slug]);
    if (result.rows[0]) {
      return {
        brand_slug: slug,
        targets: { ...fallback, ...(result.rows[0].targets || {}) },
        updated_at: result.rows[0].updated_at
      };
    }
    return { brand_slug: slug, targets: fallback, updated_at: new Date().toISOString() };
  } catch (error) {
    console.warn('Fallback memoire getKpiTargets:', error.message);
    return memory.kpiTargets.get(slug) || { brand_slug: slug, targets: fallback, updated_at: new Date().toISOString() };
  }
}

export async function saveKpiTargets(brand = 'nidal-junior', targets = {}) {
  const slug = brand === 'nidal' ? 'nidal' : 'nidal-junior';
  const fallback = DEFAULT_BRAND_KPI_TARGETS[slug];
  const merged = { ...fallback, ...(targets || {}) };
  const record = {
    brand_slug: slug,
    targets: merged,
    updated_at: new Date().toISOString()
  };
  memory.kpiTargets.set(slug, record);
  if (!hasDatabase) return record;
  try {
    const result = await query(
      `INSERT INTO kpi_targets (brand_slug, targets, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (brand_slug) DO UPDATE SET targets = EXCLUDED.targets, updated_at = NOW()
       RETURNING brand_slug, targets, updated_at`,
      [slug, JSON.stringify(merged)]
    );
    return result.rows[0];
  } catch (error) {
    console.warn('Fallback memoire saveKpiTargets:', error.message);
    return record;
  }
}

