import { db } from '../../lib/db.js';
import { applyCors } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, email, password, ign, tos_accepted, marketing_opt_in } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  if (tos_accepted === false || tos_accepted === 0) {
    return res.status(400).json({ success: false, message: 'You must accept the Terms of Service to register.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username or email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const roleId = (username.toLowerCase() === 'izengal' || username.toLowerCase() === 'thedaedragamer') ? 1 : 7;
    const userIgn = ign || username;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, ign, role_id, tos_accepted, marketing_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, userIgn, roleId, 1, marketing_opt_in ? 1 : 0]
    );

    const userId = result.insertId;
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();

    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, 'User Registered', `New user registered with role_id=${roleId}`, ipAddress]
    );

    return res.status(200).json({
      success: true,
      user: {
        user_id: userId,
        id: userId,
        username: username,
        email: email,
        ign: userIgn,
        role_id: roleId,
        role: roleId === 1 ? 'Founder' : 'Player',
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(userIgn)}/100`
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
