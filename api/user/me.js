import { pool } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get identifier from query parameters, body, or authorization header
  const username = req.query?.username || req.body?.username;
  const userId = req.query?.id || req.body?.id;

  if (!username && !userId) {
    return res.status(400).json({ success: false, message: 'Username or user ID is required.' });
  }

  try {
    let rows;
    if (userId) {
      [rows] = await pool.query(
        'SELECT id, username, email, role, avatar, is_banned, vote_streak, created_at FROM users WHERE id = ?',
        [userId]
      );
    } else {
      [rows] = await pool.query(
        'SELECT id, username, email, role, avatar, is_banned, vote_streak, created_at FROM users WHERE LOWER(username) = LOWER(?)',
        [username]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || `https://mc-heads.net/avatar/${encodeURIComponent(user.username)}/100`,
        isBanned: Boolean(user.is_banned),
        voteStreak: user.vote_streak || 0,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('User profile query error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
