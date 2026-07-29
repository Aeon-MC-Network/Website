import { db } from '../../lib/db.js';
import { applyCors } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ success: false, message: 'Username must be between 3 and 32 characters.' });
  }

  try {
    // Check if username or email already exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username or email already registered.' });
    }

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Default role_id = 7 ('player'), founder override for initial account
    const roleId = (username.toLowerCase() === 'thedaedragamer' || username.toLowerCase() === 'founder') ? 1 : 7;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, roleId]
    );

    const userId = result.insertId;

    // Get IP address
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();

    // Log registration event in audit_logs
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, 'User Registered', `New user registered with role_id=${roleId}`, ipAddress]
    );

    const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/100`;

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        username: username,
        email: email,
        role_id: roleId,
        role: roleId === 1 ? 'Admin' : 'Player',
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
