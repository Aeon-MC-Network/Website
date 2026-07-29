import { pool } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, avatar, is_banned, vote_streak FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Account suspended by staff.' });
    }

    // Standardize role string
    if (user.role && user.role.toLowerCase() === 'moderator') user.role = 'Mod';
    if (user.role && user.role.toLowerCase() === 'administrator') user.role = 'Admin';
    if (!user.avatar) user.avatar = `https://mc-heads.net/avatar/${encodeURIComponent(user.username)}/100`;

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)',
      [user.username, 'User Login', `User logged in via API as ${user.role}`]
    );

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        voteStreak: user.vote_streak || 0
      }
    });
  } catch (error) {
    console.error('Login query error:', error);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }
}
