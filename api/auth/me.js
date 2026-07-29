import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authUser = await authenticate(req, res);
    if (!authUser) return; // Response handled inside authenticate()

    // Fetch fresh live user profile directly from Bloom MySQL
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role_id, u.minecraft_uuid, u.discord_id, u.created_at, r.role_name,
              r.can_access_staff_wiki, r.can_access_staff_forum, r.can_access_plan_analytics, r.can_access_jira
       FROM users u
       JOIN web_roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [authUser.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
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
        role_id: user.role_id,
        role: roleDisplay,
        role_name: user.role_name,
        minecraft_uuid: user.minecraft_uuid,
        discord_id: user.discord_id,
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.username)}/100`,
        permissions: {
          staff_wiki: Boolean(user.can_access_staff_wiki),
          staff_forum: Boolean(user.can_access_staff_forum),
          plan_analytics: Boolean(user.can_access_plan_analytics),
          jira: Boolean(user.can_access_jira)
        },
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ success: false, error: 'Database profile query failed' });
  }
}
