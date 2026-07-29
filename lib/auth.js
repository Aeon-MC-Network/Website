import jwt from 'jsonwebtoken';
import { db } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'aeonmc_secret_jwt_key_2026_production';

// Allowed origins for CORS enforcement
const ALLOWED_ORIGINS = [
  'https://www.aeonmc.com',
  'https://aeonmc.com',
  'https://aeon-mc-network.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

/**
 * Apply global CORS headers allowing access from production and test origins.
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
 * Generate signed JWT token containing user identity and web_roles permissions.
 */
export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      role_name: user.role_name || user.role,
      permissions: user.permissions || {
        staff_wiki: !!user.can_access_staff_wiki,
        staff_forum: !!user.can_access_staff_forum,
        plan_analytics: !!user.can_access_plan_analytics,
        jira: !!user.can_access_jira
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
 * Authenticate incoming request via JWT token or DB session token.
 * Attaches decoded user & web_roles capability flags to req.user context.
 */
export async function authenticate(req, res) {
  applyCors(req, res);

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || req.query?.token || req.body?.token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    return null;
  }

  // 1. Try JWT Token verification
  const decodedJwt = verifyToken(token);
  if (decodedJwt) {
    req.user = decodedJwt;
    return decodedJwt;
  }

  // 2. Fallback to DB session token lookup
  try {
    const [rows] = await db.query(
      `SELECT s.id as session_id, s.expires_at, u.id, u.username, u.email, r.role_name,
              r.can_access_staff_wiki, r.can_access_staff_forum, r.can_access_plan_analytics, r.can_access_jira
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       JOIN web_roles r ON u.role_id = r.id
       WHERE s.id = ? AND s.expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
      return null;
    }

    const sessionUser = rows[0];
    let roleDisplay = sessionUser.role_name;
    if (roleDisplay === 'founder' || roleDisplay === 'admin') roleDisplay = 'Admin';
    else if (roleDisplay === 'moderator') roleDisplay = 'Mod';
    else if (roleDisplay === 'developer') roleDisplay = 'Developer';
    else if (roleDisplay === 'helper') roleDisplay = 'Helper';
    else if (roleDisplay === 'creator') roleDisplay = 'Content Creator';
    else roleDisplay = 'Player';

    const userCtx = {
      id: sessionUser.id,
      username: sessionUser.username,
      email: sessionUser.email,
      role: roleDisplay,
      role_name: sessionUser.role_name,
      permissions: {
        staff_wiki: Boolean(sessionUser.can_access_staff_wiki),
        staff_forum: Boolean(sessionUser.can_access_staff_forum),
        plan_analytics: Boolean(sessionUser.can_access_plan_analytics),
        jira: Boolean(sessionUser.can_access_jira)
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
 * Middleware wrapper for Express or Vercel route handlers.
 */
export function authMiddleware(req, res, next) {
  authenticate(req, res).then((user) => {
    if (user && typeof next === 'function') {
      next();
    }
  });
}

/**
 * RBAC Helper: Enforces specific web_roles capability flag.
 */
export function requirePermission(permissionKey) {
  return async function (req, res, next) {
    const user = req.user || await authenticate(req, res);
    if (!user) return;

    const hasPermission = user.permissions && Boolean(user.permissions[permissionKey]);
    if (!hasPermission && user.role_name !== 'founder' && user.role_name !== 'admin') {
      return res.status(403).json({ success: false, message: `Access denied. Requires permission: ${permissionKey}` });
    }

    if (typeof next === 'function') next();
  };
}

/**
 * RBAC Helper: Enforces minimum role membership.
 */
export function requireRole(allowedRoles) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return async function (req, res, next) {
    const user = req.user || await authenticate(req, res);
    if (!user) return;

    const userRole = (user.role_name || user.role || '').toLowerCase();
    const isAllowed = rolesArray.map(r => r.toLowerCase()).includes(userRole);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient role privileges.' });
    }

    if (typeof next === 'function') next();
  };
}
