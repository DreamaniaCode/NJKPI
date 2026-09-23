import fs from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
export const hasDatabase = Boolean(connectionString);

export const pool = hasDatabase ? new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
}) : null;

export async function initDatabase() {
  if (!pool) return false;
  const schema = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  return true;
}

export async function query(text, params = []) {
  if (!pool) throw new Error('DATABASE_URL non configuree');
  return pool.query(text, params);
}

export async function databaseHealth() {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query('SELECT 1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.message };
  }
}
