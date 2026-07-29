import jwt from 'jsonwebtoken';
import { db } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'aeonmc_secret_jwt_key_2026_production';

const ALLOWED_ORIGINS = [
  'https://www.aeonmc.com',
  'https://aeonmc.com',
  'https://aeon-mc-network.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

/**
 * Helper to parse cookies from Cookie header string.
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });

  return list;
}

/**
 * Apply global CORS headers allowing access from production & local test origins.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Generate signed 7-day JWT token containing user identity and web_roles capabilities.
 */
export function signToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id || user.id,
      id: user.user_id || user.id,
      username: user.username,
      email: user.email,
      ign: user.ign || user.username,
      role_id: user.role_id,
      role: user.role || user.role_name,
      role_name: user.role_name || user.role,
      permissions: user.permissions || {
        can_edit_vote_links: Boolean(user.can_edit_vote_links),
        can_manage_wikis: Boolean(user.can_manage_wikis),
        can_moderate_users: Boolean(user.can_moderate_users),
        can_manage_roles: Boolean(user.can_manage_roles)
      }
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token string.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Authenticate incoming request via JWT Bearer token, Cookie header, or DB session token.
 * Attaches decoded user & web_roles capability flags to req.user context.
 */
export async function authenticate(req, res) {
  applyCors(req, res);

  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);

  const token = authHeader?.replace(/^Bearer\s+/i, '') ||
                cookies['aeon_auth_token'] ||
                cookies['aeon_session_token'] ||
                req.query?.token ||
                req.body?.token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing token.' });
    return null;
  }

  // 1. JWT Verification
  const decodedJwt = verifyToken(token);
  if (decodedJwt) {
    req.user = decodedJwt;
    return decodedJwt;
  }

  // 2. DB Session Token Lookup
  try {
    const [rows] = await db.query(
      `SELECT s.id as session_id, s.expires_at, u.user_id, u.username, u.email, u.ign, u.role_id, r.role_name,
              r.can_edit_vote_links, r.can_manage_wikis, r.can_moderate_users, r.can_manage_roles
       FROM sessions s
       JOIN users u ON s.user_id = u.user_id
       JOIN web_roles r ON u.role_id = r.role_id
       WHERE s.id = ? AND s.expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
      return null;
    }

    const sessionUser = rows[0];
    const userCtx = {
      user_id: sessionUser.user_id,
      id: sessionUser.user_id,
      username: sessionUser.username,
      email: sessionUser.email,
      ign: sessionUser.ign,
      role_id: sessionUser.role_id,
      role: sessionUser.role_name,
      role_name: sessionUser.role_name,
      permissions: {
        can_edit_vote_links: Boolean(sessionUser.can_edit_vote_links),
        can_manage_wikis: Boolean(sessionUser.can_manage_wikis),
        can_moderate_users: Boolean(sessionUser.can_moderate_users),
        can_manage_roles: Boolean(sessionUser.can_manage_roles)
      }
    };

    req.user = userCtx;
    return userCtx;
  } catch (err) {
    console.error('Authentication DB error:', err);
    res.status(500).json({ success: false, error: 'Database session verification failed.' });
    return null;
  }
}

/**
 * RBAC Helper: Enforces specific web_roles capability flag.
 */
export function requirePermission(permissionKey) {
  return async function (req, res, next) {
    const user = req.user || await authenticate(req, res);
    if (!user) return;

    const hasPermission = user.permissions && Boolean(user.permissions[permissionKey]);
    if (!hasPermission && user.role_id !== 1 && (user.role_name || '').toLowerCase() !== 'founder') {
      return res.status(403).json({ success: false, message: `Access denied. Requires permission: ${permissionKey}` });
    }

    if (typeof next === 'function') next();
  };
}

/**
 * RBAC Helper: Enforces role privileges.
 */
export function requireRole(allowedRoles) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return async function (req, res, next) {
    const user = req.user || await authenticate(req, res);
    if (!user) return;

    const userRole = (user.role_name || user.role || '').toLowerCase();
    const isAllowed = rolesArray.map(r => r.toLowerCase()).includes(userRole) || (rolesArray.includes(1) && user.role_id === 1);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient role privileges.' });
    }

    if (typeof next === 'function') next();
  };
}
