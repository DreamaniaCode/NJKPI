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

export async function initDatabase(retries = 5, delay = 3000) {
  if (!pool) {
    console.log('Aucune variable DATABASE_URL fournie. Mode memoire actif.');
    return false;
  }
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Connexion a PostgreSQL en cours (tentative ${i}/${retries})...`);
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
