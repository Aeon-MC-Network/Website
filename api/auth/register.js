import { db } from '../../lib/db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username or email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const roleId = (username.toLowerCase() === 'thedaedragamer' || username.toLowerCase() === 'founder') ? 1 : 7;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, roleId]
    );

    const userId = result.insertId;

    const [roles] = await db.query('SELECT role_name FROM web_roles WHERE id = ?', [roleId]);
    const roleName = roles.length > 0 ? roles[0].role_name : 'player';

    let roleDisplay = roleName;
    if (roleDisplay === 'founder' || roleDisplay === 'admin') roleDisplay = 'Admin';
    else if (roleDisplay === 'moderator') roleDisplay = 'Mod';
    else if (roleDisplay === 'developer') roleDisplay = 'Developer';
    else if (roleDisplay === 'helper') roleDisplay = 'Helper';
    else if (roleDisplay === 'creator') roleDisplay = 'Content Creator';
    else roleDisplay = 'Player';

    const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/100`;

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        username: username,
        email: email,
        role: roleDisplay,
        role_name: roleName,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Registration query error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
