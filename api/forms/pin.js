import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const user = await authenticate(req, res);
    if (!user) return;

    // Staff check: Founder, Developer, Admin, Moderator (role_id 1-4)
    const isStaff = [1, 2, 3, 4].includes(user.role_id) || ['founder', 'developer', 'admin', 'moderator'].includes((user.role_name || user.role || '').toLowerCase());

    if (!isStaff) {
      return res.status(403).json({ success: false, message: 'Forbidden. Staff privileges required to pin threads.' });
    }

    const { thread_id, keep_forever } = req.body || {};

    if (!thread_id) {
      return res.status(400).json({ success: false, message: 'thread_id is required.' });
    }

    const pinState = (keep_forever === false || keep_forever === 0) ? 0 : 1;

    await db.query(
      'UPDATE threads SET keep_forever = ? WHERE thread_id = ?',
      [pinState, thread_id]
    );

    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();
    const userId = user.user_id || user.id;

    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, 'Pin Thread', `Staff ${user.username} set keep_forever=${pinState} on thread ${thread_id}`, ipAddress]
    );

    return res.status(200).json({
      success: true,
      message: `Thread ${thread_id} ${pinState === 1 ? 'pinned permanently (keep_forever=1)' : 'unpinned'}.`
    });
  } catch (error) {
    console.error('Thread pin error:', error);
    return res.status(500).json({ success: false, error: 'Database update failed' });
  }
}
