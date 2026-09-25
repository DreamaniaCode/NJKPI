import fs from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
export const hasDatabase = Boolean(connectionString);

export const pool = hasDatabase ? new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
}) : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('Avertissement: Erreur sur le pool PostgreSQL inactif:', err.message);
  });
}

let _dbConnected = false;
export const isDbConnected = () => _dbConnected;

async function repairLegacyContentsSchema() {
  if (!pool) return;

  const exists = await pool.query("SELECT to_regclass('public.contents') AS name");
  if (!exists.rows?.[0]?.name) return;

  const statements = [
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS brand_slug TEXT",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS final_url TEXT",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS external_media_id TEXT",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS platform TEXT",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'not_connected'",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE contents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  await pool.query(`
    UPDATE contents
    SET brand_slug = COALESCE(
      NULLIF(brand_slug, ''),
      NULLIF(data->>'brand', ''),
      'nidal-junior'
    )
    WHERE brand_slug IS NULL OR brand_slug = ''
  `);

  try {
    await pool.query("ALTER TABLE contents ALTER COLUMN brand_slug SET NOT NULL");
  } catch (error) {
    console.warn('Migration brand_slug NOT NULL différée:', error.message);
  }

  // Les toutes premières versions de NJKPI avaient d'autres colonnes
  // obligatoires (ex. titre) qui ne font plus partie du schéma JSON actuel.
  // Si elles subsistent sans DEFAULT, PostgreSQL refuse les nouveaux INSERT.
  const legacyRequired = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='contents'
      AND is_nullable='NO'
      AND column_default IS NULL
      AND column_name NOT IN ('id','brand_slug')
  `);

  for (const column of legacyRequired.rows) {
    const name = column.column_name;
    // Les colonnes du schéma actuel sont alimentées explicitement.
    if (['data','sync_status','created_at','updated_at'].includes(name)) continue;

    const safeName = '"' + String(name).replace(/"/g, '""') + '"';
    let defaultSql = null;

    // Certaines anciennes colonnes ont encore des CHECK constraints
    // (ex. contents_statut_check). Un DEFAULT '' rend l'INSERT invalide.
    const checks = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'contents'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE $1
    `, [`%${name}%`]);

    if (['text','character varying','character'].includes(column.data_type)) {
      const preferredByColumn = {
        statut: 'brouillon',
        status: 'brouillon',
        validation: 'a-valider',
        format: 'post',
        plateforme: 'instagram-facebook',
        niveau: 'tous'
      };
      const preferred = preferredByColumn[name];

      let allowedValues = [];
      for (const check of checks.rows) {
        const matches = [...String(check.definition || '').matchAll(/'([^']+)'/g)]
          .map(match => match[1])
          .filter(Boolean);
        allowedValues.push(...matches);
      }
      allowedValues = [...new Set(allowedValues)];

      let chosen = null;
      if (preferred && (!allowedValues.length || allowedValues.includes(preferred))) chosen = preferred;
      else if (allowedValues.length) chosen = allowedValues[0];
      else chosen = '';

      defaultSql = "'" + String(chosen).replace(/'/g, "''") + "'";

      // Normaliser également les anciennes lignes NULL avant les nouveaux INSERT.
      await pool.query(`UPDATE contents SET ${safeName} = ${defaultSql} WHERE ${safeName} IS NULL`);
    } else if (column.data_type === 'boolean') defaultSql = 'FALSE';
    else if (['smallint','integer','bigint','numeric','real','double precision'].includes(column.data_type)) defaultSql = '0';
    else if (column.data_type === 'json' || column.data_type === 'jsonb') defaultSql = "'{}'";
    else if (column.data_type.includes('timestamp')) defaultSql = 'NOW()';
    else if (column.data_type === 'date') defaultSql = 'CURRENT_DATE';

    if (defaultSql) {
      await pool.query(`ALTER TABLE contents ALTER COLUMN ${safeName} SET DEFAULT ${defaultSql}`);
      console.log(`Migration legacy contents: DEFAULT compatible ajouté à ${name}`);
    }
  }

  // Réparer tous les anciens CHECK constraints de colonnes texte (type, statut, etc.),
  // même lorsqu'un ancien DEFAULT invalide existe déjà.
  const legacyChecks = await pool.query(`
    SELECT c.conname,
           pg_get_constraintdef(c.oid) AS definition,
           a.attname AS column_name,
           cols.data_type
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) AS k(attnum) ON TRUE
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = k.attnum
    JOIN information_schema.columns cols
      ON cols.table_schema = 'public'
     AND cols.table_name = 'contents'
     AND cols.column_name = a.attname
    WHERE c.conrelid = 'contents'::regclass
      AND c.contype = 'c'
  `);

  const preferredLegacyValues = {
    statut: 'brouillon',
    status: 'brouillon',
    type: 'post',
    format: 'post',
    validation: 'a-valider',
    plateforme: 'instagram-facebook',
    niveau: 'tous'
  };

  for (const check of legacyChecks.rows) {
    if (!['text','character varying','character'].includes(check.data_type)) continue;

    const allowed = [...String(check.definition || '').matchAll(/'([^']+)'/g)]
      .map(match => match[1])
      .filter(value => value && value.toLowerCase() !== 'text');
    if (!allowed.length) continue;

    const preferred = preferredLegacyValues[check.column_name];
    const chosen = preferred && allowed.includes(preferred) ? preferred : allowed[0];
    const safeColumn = '"' + String(check.column_name).replace(/"/g, '""') + '"';
    const safeValue = "'" + String(chosen).replace(/'/g, "''") + "'";

    await pool.query(`ALTER TABLE contents ALTER COLUMN ${safeColumn} SET DEFAULT ${safeValue}`);

    // Ne corriger que les valeurs vides/nulles, jamais une valeur métier déjà valide.
    await pool.query(`
      UPDATE contents
      SET ${safeColumn} = ${safeValue}
      WHERE ${safeColumn} IS NULL OR ${safeColumn}::text = ''
    `).catch(error => {
      console.warn(`Migration legacy ${check.column_name} partielle:`, error.message);
    });

    console.log(`Migration legacy contents: ${check.column_name} par défaut = ${chosen} (${check.conname})`);
  }

  const legacyStatusColumn = await pool.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contents' AND column_name='statut'
  `);
  if (legacyStatusColumn.rowCount) {
    const statusCheck = await pool.query(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid='contents'::regclass
        AND contype='c'
        AND conname='contents_statut_check'
      LIMIT 1
    `);

    const definition = String(statusCheck.rows?.[0]?.definition || '');
    const allowed = [...definition.matchAll(/'([^']+)'/g)].map(match => match[1]);
    const safeStatus = allowed.includes('brouillon') ? 'brouillon' : (allowed[0] || 'brouillon');
    const escaped = "'" + safeStatus.replace(/'/g, "''") + "'";

    await pool.query(`ALTER TABLE contents ALTER COLUMN statut SET DEFAULT ${escaped}`);
    await pool.query(`UPDATE contents SET statut = ${escaped} WHERE statut IS NULL OR statut = ''`).catch(error => {
      console.warn('Migration legacy statut partielle:', error.message);
    });
    console.log(`Migration legacy contents: statut par défaut = ${safeStatus}`);
  }

  await pool.query("CREATE INDEX IF NOT EXISTS contents_brand_idx ON contents (brand_slug, updated_at DESC)");
}

export async function initDatabase(retries = 5, delay = 3000) {
  if (!pool) {
    console.log('Aucune variable DATABASE_URL fournie. Mode memoire actif.');
    return false;
  }
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Connexion a PostgreSQL en cours (tentative ${i}/${retries})...`);
      await repairLegacyContentsSchema();
      const schema = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
      await pool.query(schema);
      _dbConnected = true;
      console.log('PostgreSQL connecte et schema initialise avec succes.');
      return true;
    } catch (error) {
      console.error(`Echec connexion PostgreSQL (${i}/${retries}):`, error.message);
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.warn('PostgreSQL n a pas pu etre joint au demarrage. Le serveur reste actif en mode secours.');
  return false;
}

export async function query(text, params = []) {
  if (!pool) throw new Error('DATABASE_URL non configuree');
  return pool.query(text, params);
}

export async function databaseHealth() {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query('SELECT 1');
    _dbConnected = true;
    return { configured: true, connected: true };
  } catch (error) {
    _dbConnected = false;
    return { configured: true, connected: false, error: error.message };
  }
}
