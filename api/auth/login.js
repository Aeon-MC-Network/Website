import { db } from '../../lib/db.js';
import { applyCors, signToken } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing username or password' });
  }

  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.password_hash, u.ign, u.role_id, r.role_name,
              r.can_edit_vote_links, r.can_manage_wikis, r.can_moderate_users, r.can_manage_roles
       FROM users u 
       JOIN web_roles r ON u.role_id = r.role_id 
       WHERE LOWER(u.username) = LOWER(?)`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    let passwordValid = false;

    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      passwordValid = (password === user.password_hash);
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate persistent 7-day session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await db.query(
      `INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [token, user.user_id, ipAddress, userAgent, expiresAt]
    );

    // Record login in audit_logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [user.user_id, 'User Login', `Logged in as role ${user.role_name}`, ipAddress]
    );

    const permissionsObj = {
      can_edit_vote_links: Boolean(user.can_edit_vote_links),
      can_manage_wikis: Boolean(user.can_manage_wikis),
      can_moderate_users: Boolean(user.can_moderate_users),
      can_manage_roles: Boolean(user.can_manage_roles)
    };

    const userObj = {
      user_id: user.user_id,
      id: user.user_id,
      username: user.username,
      email: user.email,
      ign: user.ign,
      role_id: user.role_id,
      role: user.role_name,
      role_name: user.role_name,
      avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.ign || user.username)}/100`,
      permissions: permissionsObj
    };

    // Generate signed JWT token
    const jwtToken = signToken(userObj);

    return res.status(200).json({
      success: true,
      token,
      jwtToken,
      user: userObj
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal database error' });
  }
}
