import { db } from '../../lib/db.js';
import { applyCors } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { username, email, password, ign, tos_accepted, marketing_opt_in } = req.body || {};

  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanIgn = (ign || cleanUsername).trim();

  // Clean Input Validation
  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      message: 'Username must be 3 to 32 characters long and contain only letters, numbers, or underscores.'
    });
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  if (tos_accepted === false || tos_accepted === 0) {
    return res.status(400).json({ success: false, message: 'You must accept the Terms of Service to register.' });
  }

  try {
    // Duplicate check in Bloom MySQL
    const [existing] = await db.query(
      'SELECT user_id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      const isUserDup = existing.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
      return res.status(400).json({
        success: false,
        message: isUserDup ? 'That username is already taken.' : 'That email address is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const roleId = (cleanUsername.toLowerCase() === 'izengal' || cleanUsername.toLowerCase() === 'thedaedragamer') ? 1 : 7;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, ign, role_id, tos_accepted, marketing_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cleanUsername, cleanEmail, passwordHash, cleanIgn, roleId, 1, marketing_opt_in ? 1 : 0]
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
      message: 'Account created successfully!',
      user: {
        user_id: userId,
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        ign: cleanIgn,
        role_id: roleId,
        role: roleId === 1 ? 'Founder' : 'Player',
        role_name: roleId === 1 ? 'Founder' : 'Player',
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(cleanIgn)}/100`
      }
    });
  } catch (error) {
    console.error('Registration database error:', error);
    return res.status(500).json({ success: false, error: 'Database transaction failed' });
  }
}
