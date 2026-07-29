import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

const ROLE_MAP = {
  'founder': 1,
  'developer': 2,
  'dev': 2,
  'admin': 3,
  'administrator': 3,
  'moderator': 4,
  'mod': 4,
  'helper': 5,
  'creator': 6,
  'content creator': 6,
  'player': 7
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate requesting user
    const requester = await authenticate(req, res);
    if (!requester) return;

    // 2. Restrict to Founder, Developer, and Admin roles
    const requesterRole = (requester.role_name || requester.role || '').toLowerCase();
    const isAuthorized = ['founder', 'developer', 'admin'].includes(requesterRole) || [1, 2, 3].includes(requester.role_id);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Access restricted to Founder, Developer, and Admin roles.'
      });
    }

    const { targetUsername, targetUserId, newRole, newRoleId } = req.body || {};

    if (!targetUsername && !targetUserId) {
      return res.status(400).json({ success: false, message: 'Target username or target user ID is required.' });
    }

    // Determine target role_id
    let targetRoleId = parseInt(newRoleId);
    if (isNaN(targetRoleId) || targetRoleId < 1 || targetRoleId > 7) {
      if (newRole && ROLE_MAP[newRole.toString().toLowerCase()]) {
        targetRoleId = ROLE_MAP[newRole.toString().toLowerCase()];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Valid roles: founder, developer, admin, moderator, helper, creator, player.'
        });
      }
    }

    // Fetch target user from database
    let userRows;
    if (targetUserId) {
      [userRows] = await db.query('SELECT id, username, role_id FROM users WHERE id = ?', [targetUserId]);
    } else {
      [userRows] = await db.query('SELECT id, username, role_id FROM users WHERE LOWER(username) = LOWER(?)', [targetUsername]);
    }

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const targetUser = userRows[0];

    // Fetch new role name from web_roles
    const [roleRows] = await db.query('SELECT role_name FROM web_roles WHERE id = ?', [targetRoleId]);
    const targetRoleName = roleRows.length > 0 ? roleRows[0].role_name : 'player';

    // Update target user's role_id in MySQL
    await db.query('UPDATE users SET role_id = ? WHERE id = ?', [targetRoleId, targetUser.id]);

    // Get requester IP address
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();

    // Log entry in audit_logs
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [
        requester.id,
        'Update Rank',
        `Requester ${requester.username} updated ${targetUser.username} role_id to ${targetRoleId} (${targetRoleName})`,
        ipAddress
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Successfully updated rank for ${targetUser.username} to ${targetRoleName}.`,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        role_id: targetRoleId,
        role_name: targetRoleName
      }
    });
  } catch (error) {
    console.error('Set rank API error:', error);
    return res.status(500).json({ success: false, error: 'Database update failed' });
  }
}
