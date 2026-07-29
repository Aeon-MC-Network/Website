import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        'SELECT vote_id, title, url, reward_description, is_active, display_order FROM vote_links WHERE is_active = 1 ORDER BY display_order ASC, vote_id ASC'
      );
      return res.status(200).json({ success: true, vote_links: rows });
    } catch (error) {
      console.error('Vote links fetch error:', error);
      return res.status(500).json({ success: false, error: 'Database query failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const perms = user.permissions || {};
      const canEdit = Boolean(perms.can_edit_vote_links) || [1, 2, 3].includes(user.role_id) || ['founder', 'developer', 'admin'].includes((user.role_name || user.role || '').toLowerCase());

      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required to manage vote links.' });
      }

      const { vote_id, title, url, reward_description, display_order } = req.body || {};

      if (!title || !url) {
        return res.status(400).json({ success: false, message: 'title and url are required.' });
      }

      const reward = reward_description || '1x Vote Key + $500 In-Game Coins';
      const order = parseInt(display_order || 0);

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ipAddress = rawIp.toString().split(',')[0].trim();
      const userId = user.user_id || user.id;

      if (vote_id) {
        await db.query(
          'UPDATE vote_links SET title = ?, url = ?, reward_description = ?, display_order = ? WHERE vote_id = ?',
          [title, url, reward, order, vote_id]
        );

        await db.query(
          'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [userId, 'Update Vote Link', `User ${user.username} updated vote link #${vote_id} (${title})`, ipAddress]
        );

        return res.status(200).json({ success: true, message: 'Vote link updated successfully.' });
      } else {
        const [result] = await db.query(
          'INSERT INTO vote_links (title, url, reward_description, display_order) VALUES (?, ?, ?, ?)',
          [title, url, reward, order]
        );

        await db.query(
          'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [userId, 'Add Vote Link', `User ${user.username} created vote link #${result.insertId} (${title})`, ipAddress]
        );

        return res.status(200).json({ success: true, message: 'Vote link created successfully.', vote_id: result.insertId });
      }
    } catch (error) {
      console.error('Vote link save error:', error);
      return res.status(500).json({ success: false, error: 'Database save failed' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const perms = user.permissions || {};
      const canEdit = Boolean(perms.can_edit_vote_links) || [1, 2, 3].includes(user.role_id) || ['founder', 'developer', 'admin'].includes((user.role_name || user.role || '').toLowerCase());

      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required to delete vote links.' });
      }

      const voteId = req.query?.vote_id || req.body?.vote_id;
      if (!voteId) {
        return res.status(400).json({ success: false, message: 'vote_id is required.' });
      }

      await db.query('UPDATE vote_links SET is_active = 0 WHERE vote_id = ?', [voteId]);

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ipAddress = rawIp.toString().split(',')[0].trim();
      const userId = user.user_id || user.id;

      await db.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'Delete Vote Link', `User ${user.username} deactivated vote link #${voteId}`, ipAddress]
      );

      return res.status(200).json({ success: true, message: 'Vote link removed.' });
    } catch (error) {
      console.error('Vote link delete error:', error);
      return res.status(500).json({ success: false, error: 'Database delete failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
