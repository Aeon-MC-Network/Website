import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authUser = await authenticate(req, res);
    if (!authUser) return;

    const userId = authUser.user_id || authUser.id;

    const [rows] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.ign, u.role_id, u.discord_id, u.steam_id, u.created_at, r.role_name,
              r.can_edit_vote_links, r.can_manage_wikis, r.can_moderate_users, r.can_manage_roles
       FROM users u
       JOIN web_roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      user: {
        user_id: user.user_id,
        id: user.user_id,
        username: user.username,
        email: user.email,
        ign: user.ign,
        role_id: user.role_id,
        role: user.role_name,
        role_name: user.role_name,
        discord_id: user.discord_id,
        steam_id: user.steam_id,
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.ign || user.username)}/100`,
        permissions: {
          can_edit_vote_links: Boolean(user.can_edit_vote_links),
          can_manage_wikis: Boolean(user.can_manage_wikis),
          can_moderate_users: Boolean(user.can_moderate_users),
          can_manage_roles: Boolean(user.can_manage_roles)
        },
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
