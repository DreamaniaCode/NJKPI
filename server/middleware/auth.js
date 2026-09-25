import crypto from 'crypto';
import { query, hasDatabase, isDbConnected } from '../db.js';

// Clé secrète pour les JWT (fallback pour le développement)
const getJwtSecret = () => process.env.JWT_SECRET || 'nidal-dev-secret-change-me';

// Stockage en mémoire pour le fallback (si la BD n'est pas disponible)
let memoryUsers = [];
let memoryUserIdCounter = 1;

/**
 * Hache un mot de passe en utilisant scrypt et un sel aléatoire.
 * @param {string} password - Le mot de passe en clair.
 * @returns {string} - Le mot de passe haché sous la forme "sel:hash".
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Vérifie un mot de passe par rapport à un hachage stocké.
 * @param {string} password - Le mot de passe en clair.
 * @param {string} stored - Le hachage stocké ("sel:hash").
 * @returns {boolean} - True si le mot de passe correspond.
 */
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  
  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Encode une chaîne en Base64URL.
 */
function base64urlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Génère un token de style JWT.
 * @param {object} user - L'objet utilisateur.
 * @returns {string} - Le token JWT.
 */
export function generateToken(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + (24 * 60 * 60) // Expire dans 24h
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Vérifie et décode un token JWT.
 * @param {string} token - Le token à vérifier.
 * @returns {object|null} - Le payload du token si valide, null sinon.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return null; // Signature invalide
  }
  
  try {
    const payloadJson = Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expiré
    }
    
    return payload;
  } catch (error) {
    return null; // Erreur de décodage
  }
}

/**
 * Initialise l'authentification : crée la table des utilisateurs et un admin par défaut.
 */
export async function initAuth() {
  const adminUser = process.env.DEFAULT_ADMIN_USER || 'admin';
  const adminPass = process.env.DEFAULT_ADMIN_PASS || 'nidal2026';
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@gsnidal.ma';
  const hashedPass = hashPassword(adminPass);
  const resetDefaultAdmin = process.env.RESET_DEFAULT_ADMIN === 'true';

  if (hasDatabase && isDbConnected()) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
          display_name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login TIMESTAMPTZ
        );
      `);

      if (resetDefaultAdmin) {
        const byUsername = await query(
          'SELECT id FROM users WHERE username = $1 LIMIT 1',
          [adminUser]
        );

        if (byUsername.rows.length > 0) {
          await query(
            `UPDATE users
             SET password_hash = $2,
                 role = 'admin',
                 display_name = 'Administrateur'
             WHERE id = $1`,
            [byUsername.rows[0].id, hashedPass]
          );
        } else {
          const existingAdmin = await query(
            `SELECT id FROM users
             WHERE role = 'admin'
             ORDER BY id ASC
             LIMIT 1`
          );

          if (existingAdmin.rows.length > 0) {
            await query(
              `UPDATE users
               SET username = $2,
                   password_hash = $3,
                   role = 'admin',
                   display_name = 'Administrateur'
               WHERE id = $1`,
              [existingAdmin.rows[0].id, adminUser, hashedPass]
            );
          } else {
            await query(
              `INSERT INTO users (username, email, password_hash, role, display_name)
               VALUES ($1, $2, $3, 'admin', 'Administrateur')`,
              [adminUser, adminEmail, hashedPass]
            );
          }
        }

        console.log(`[Auth] Compte administrateur réinitialisé depuis les variables d'environnement (${adminUser}).`);
      } else {
        // Vérifier si un admin existe
        const res = await query(`SELECT COUNT(*) FROM users WHERE role = 'admin'`);
        const adminCount = parseInt(res.rows[0].count, 10);

        if (adminCount === 0) {
          await query(
            `INSERT INTO users (username, email, password_hash, role, display_name) 
             VALUES ($1, $2, $3, 'admin', 'Administrateur par défaut') 
             ON CONFLICT (username) DO NOTHING`,
            [adminUser, adminEmail, hashedPass]
          );
          console.log(`[Auth] Utilisateur admin par défaut créé en base de données (${adminUser}).`);
        }
      }
    } catch (error) {
      console.error('[Auth] Erreur lors de l\'initialisation de la table users :', error);
    }
  }
  
  // Toujours maintenir la mémoire pour le fallback
  if (resetDefaultAdmin) {
    const existing = memoryUsers.find(user => user.username === adminUser);
    if (existing) {
      existing.email = adminEmail;
      existing.password_hash = hashedPass;
      existing.role = 'admin';
      existing.display_name = 'Administrateur';
    } else {
      memoryUsers.push({
        id: memoryUserIdCounter++,
        username: adminUser,
        email: adminEmail,
        password_hash: hashedPass,
        role: 'admin',
        display_name: 'Administrateur',
        created_at: new Date(),
        last_login: null
      });
    }
  } else if (memoryUsers.length === 0) {
    memoryUsers.push({
      id: memoryUserIdCounter++,
      username: adminUser,
      email: adminEmail,
      password_hash: hashedPass,
      role: 'admin',
      display_name: 'Administrateur par défaut',
      created_at: new Date(),
      last_login: null
    });
    console.log(`[Auth] Utilisateur admin par défaut créé en mémoire (${adminUser}).`);
  }
}

/**
 * Middleware Express pour authentifier l'utilisateur via le token JWT.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Mode legacy (app access token)
    const appAccessToken = process.env.APP_ACCESS_TOKEN;
    if (appAccessToken && req.headers['x-access-token'] === appAccessToken) {
      req.user = { role: 'admin', username: 'legacy' };
      return next();
    }
    
    // Aucun token, l'utilisateur n'est pas authentifié
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7); // Enlever "Bearer "
  const payload = verifyToken(token);
  
  if (payload) {
    req.user = payload;
    next();
  } else {
    // Token invalide ou expiré
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

/**
 * Vérifie si l'authentification est activée dans l'environnement.
 */
export function isAuthEnabled() {
  return Boolean(process.env.JWT_SECRET || process.env.DEFAULT_ADMIN_PASS);
}

/**
 * Middleware Express pour vérifier les autorisations selon les rôles.
 * @param  {...string} roles - Les rôles autorisés (ex: 'admin', 'editor').
 */
export function authorize(...roles) {
  return (req, res, next) => {
    // Si l'authentification n'est pas forcée et qu'il n'y a pas d'utilisateur, on laisse passer (mode dev)
    if (!req.user && !isAuthEnabled()) {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit pour votre rôle' });
    }
    
    next();
  };
}

/**
 * Connecte un utilisateur.
 * @param {string} username - Le nom d'utilisateur.
 * @param {string} password - Le mot de passe en clair.
 * @returns {object|null} - L'utilisateur et le token, ou null si échec.
 */
export async function loginUser(username, password) {
  let user = null;
  
  if (hasDatabase && isDbConnected()) {
    try {
      const res = await query('SELECT * FROM users WHERE username = $1', [username]);
      if (res.rows.length > 0) {
        user = res.rows[0];
      }
    } catch (err) {
      console.error('[Auth] Erreur lors de la recherche de l\'utilisateur :', err);
    }
  } 
  
  if (!user) {
    // Fallback en mémoire
    user = memoryUsers.find(u => u.username === username);
  }
  
  if (!user) return null;
  
  if (verifyPassword(password, user.password_hash)) {
    const token = generateToken(user);
    
    // Mettre à jour last_login
    if (hasDatabase && isDbConnected()) {
      try {
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      } catch (err) {
        // Ignorer l'erreur non bloquante
      }
    } else {
      const memUser = memoryUsers.find(u => u.id === user.id);
      if (memUser) memUser.last_login = new Date();
    }
    
    // Retourner l'utilisateur sans le hachage
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
  
  return null;
}

/**
 * Liste tous les utilisateurs (sans les mots de passe).
 */
export async function listUsers() {
  if (hasDatabase && isDbConnected()) {
    try {
      const res = await query('SELECT id, username, email, role, display_name, created_at, last_login FROM users ORDER BY username ASC');
      return res.rows;
    } catch (err) {
      console.error('[Auth] Erreur lors du listage des utilisateurs :', err);
    }
  }
  
  return memoryUsers.map(({ password_hash, ...user }) => user);
}

/**
 * Crée un nouvel utilisateur.
 */
export async function createUser({ username, password, email, role = 'viewer', display_name }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = String(email || '').trim() || null;
  const normalizedDisplayName = String(display_name || '').trim() || null;

  if (!normalizedUsername || !password) {
    const error = new Error('Nom d’utilisateur et mot de passe requis');
    error.statusCode = 400;
    throw error;
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    const error = new Error('Rôle utilisateur invalide');
    error.statusCode = 400;
    throw error;
  }

  const hashedPass = hashPassword(password);

  if (hasDatabase && isDbConnected()) {
    try {
      const existingUsername = await query(
        'SELECT id FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1',
        [normalizedUsername]
      );
      if (existingUsername.rows.length) {
        const error = new Error('Ce nom d’utilisateur existe déjà');
        error.statusCode = 409;
        throw error;
      }

      if (normalizedEmail) {
        const existingEmail = await query(
          'SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1',
          [normalizedEmail]
        );
        if (existingEmail.rows.length) {
          const error = new Error('Cette adresse email est déjà utilisée');
          error.statusCode = 409;
          throw error;
        }
      }

      const res = await query(
        `INSERT INTO users (username, email, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, role, display_name, created_at, last_login`,
        [normalizedUsername, normalizedEmail, hashedPass, role, normalizedDisplayName]
      );
      return res.rows[0];
    } catch (err) {
      if (err?.statusCode) throw err;
      if (err?.code === '23505') {
        const error = new Error('Nom d’utilisateur ou email déjà utilisé');
        error.statusCode = 409;
        throw error;
      }
      console.error('[Auth] Erreur lors de la création de l\'utilisateur :', err);
      const error = new Error('Impossible de créer l’utilisateur : erreur base de données');
      error.statusCode = 500;
      throw error;
    }
  }

  const existing = memoryUsers.find(u => String(u.username).toLowerCase() === normalizedUsername.toLowerCase());
  if (existing) {
    const error = new Error('Ce nom d’utilisateur existe déjà');
    error.statusCode = 409;
    throw error;
  }
  if (normalizedEmail && memoryUsers.some(u => String(u.email || '').toLowerCase() === normalizedEmail.toLowerCase())) {
    const error = new Error('Cette adresse email est déjà utilisée');
    error.statusCode = 409;
    throw error;
  }

  const newUser = {
    id: memoryUserIdCounter++,
    username: normalizedUsername,
    email: normalizedEmail,
    password_hash: hashedPass,
    role,
    display_name: normalizedDisplayName,
    created_at: new Date(),
    last_login: null
  };

  memoryUsers.push(newUser);
  const { password_hash, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Met à jour le rôle d'un utilisateur.
 */
export async function updateUserRole(userId, newRole) {
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    throw new Error('Rôle invalide');
  }

  if (hasDatabase && isDbConnected()) {
    try {
      await query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
      return true;
    } catch (err) {
      console.error('[Auth] Erreur lors de la mise à jour du rôle :', err);
      return false;
    }
  } else {
    // Fallback
    const user = memoryUsers.find(u => u.id === parseInt(userId, 10));
    if (user) {
      user.role = newRole;
      return true;
    }
    return false;
  }
}
