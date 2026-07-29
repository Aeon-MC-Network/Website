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
    const requester = await authenticate(req, res);
    if (!requester) return;

    const requesterRole = (requester.role_name || requester.role || '').toLowerCase();
    const isAuthorized = ['founder', 'developer', 'admin'].includes(requesterRole) || [1, 2, 3].includes(requester.role_id);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Rank admin privileges required (Founder, Developer, Admin).'
      });
    }

    const { targetUsername, targetUserId, newRole, newRoleId } = req.body || {};

    if (!targetUsername && !targetUserId) {
      return res.status(400).json({ success: false, message: 'targetUsername or targetUserId is required.' });
    }

    let targetRoleId = parseInt(newRoleId);
    if (isNaN(targetRoleId) || targetRoleId < 1 || targetRoleId > 7) {
      if (newRole && ROLE_MAP[newRole.toString().toLowerCase()]) {
        targetRoleId = ROLE_MAP[newRole.toString().toLowerCase()];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Valid roles: Founder, Developer, Admin, Moderator, Helper, Creator, Player.'
        });
      }
    }

    let userRows;
    if (targetUserId) {
      [userRows] = await db.query('SELECT user_id, username, role_id FROM users WHERE user_id = ?', [targetUserId]);
    } else {
      [userRows] = await db.query('SELECT user_id, username, role_id FROM users WHERE LOWER(username) = LOWER(?)', [targetUsername]);
    }

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const targetUser = userRows[0];

    const [roleRows] = await db.query('SELECT role_name FROM web_roles WHERE role_id = ?', [targetRoleId]);
    const targetRoleName = roleRows.length > 0 ? roleRows[0].role_name : 'Player';

    await db.query('UPDATE users SET role_id = ? WHERE user_id = ?', [targetRoleId, targetUser.user_id]);

    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();
    const requesterId = requester.user_id || requester.id;

    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [
        requesterId,
        'Update Rank',
        `Requester ${requester.username} updated ${targetUser.username} (ID: ${targetUser.user_id}) role_id to ${targetRoleId} (${targetRoleName})`,
        ipAddress
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Successfully updated rank for ${targetUser.username} to ${targetRoleName}.`,
      targetUser: {
        user_id: targetUser.user_id,
        username: targetUser.username,
        role_id: targetRoleId,
        role_name: targetRoleName
      }
    });
  } catch (error) {
    console.error('Rank admin error:', error);
    return res.status(500).json({ success: false, error: 'Database update failed' });
  }
}
