import { db } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '') || req.query?.token || req.body?.token;
  const username = req.query?.username || req.body?.username;
  const userId = req.query?.id || req.body?.id;

  try {
    let rows;
    if (token) {
      [rows] = await db.query(
        `SELECT u.id, u.username, u.email, u.created_at, r.role_name, r.can_access_staff_wiki, r.can_access_plan_analytics
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         JOIN web_roles r ON u.role_id = r.id
         WHERE s.id = ? AND s.expires_at > NOW()`,
        [token]
      );
    } else if (userId) {
      [rows] = await db.query(
        `SELECT u.id, u.username, u.email, u.created_at, r.role_name, r.can_access_staff_wiki, r.can_access_plan_analytics
         FROM users u
         JOIN web_roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [userId]
      );
    } else if (username) {
      [rows] = await db.query(
        `SELECT u.id, u.username, u.email, u.created_at, r.role_name, r.can_access_staff_wiki, r.can_access_plan_analytics
         FROM users u
         JOIN web_roles r ON u.role_id = r.id
         WHERE LOWER(u.username) = LOWER(?)`,
        [username]
      );
    } else {
      return res.status(400).json({ success: false, message: 'Session token, username, or user ID required' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User or session not found' });
    }

    const user = rows[0];

    let roleDisplay = user.role_name;
    if (roleDisplay === 'founder' || roleDisplay === 'admin') roleDisplay = 'Admin';
    else if (roleDisplay === 'moderator') roleDisplay = 'Mod';
    else if (roleDisplay === 'developer') roleDisplay = 'Developer';
    else if (roleDisplay === 'helper') roleDisplay = 'Helper';
    else if (roleDisplay === 'creator') roleDisplay = 'Content Creator';
    else roleDisplay = 'Player';

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: roleDisplay,
        role_name: user.role_name,
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.username)}/100`,
        permissions: {
          staff_wiki: !!user.can_access_staff_wiki,
          plan_analytics: !!user.can_access_plan_analytics
        },
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('User me endpoint error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
