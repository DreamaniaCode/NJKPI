CREATE TABLE IF NOT EXISTS brands (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO brands (slug, name) VALUES
  ('nidal', 'Nidal'),
  ('nidal-junior', 'Nidal Junior')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  brand_slug TEXT NOT NULL REFERENCES brands(slug),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_url TEXT,
  external_media_id TEXT,
  platform TEXT,
  sync_status TEXT NOT NULL DEFAULT 'not_connected',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contents_brand_idx ON contents (brand_slug, updated_at DESC);

CREATE TABLE IF NOT EXISTS content_metrics (
  id BIGSERIAL PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_metrics_content_idx ON content_metrics (content_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  external_id TEXT NOT NULL,
  brand_slug TEXT NOT NULL REFERENCES brands(slug),
  name TEXT NOT NULL,
  status TEXT,
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (external_id, brand_slug)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  brand_slug TEXT NOT NULL REFERENCES brands(slug),
  task TEXT NOT NULL,
  brief TEXT NOT NULL,
  output TEXT NOT NULL,
  model TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
