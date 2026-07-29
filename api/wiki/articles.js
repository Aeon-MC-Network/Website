import { db } from '../../lib/db.js';
import { applyCors, authenticate, verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      const user = token ? verifyToken(token) : null;

      const perms = user?.permissions || {};
      const isStaff = Boolean(perms.can_manage_wikis) || Boolean(perms.can_moderate_users) || (user && [1, 2, 3, 4].includes(user.role_id));

      let query = `
        SELECT w.article_id, w.category, w.title, w.slug, w.content_html, w.author_id, w.is_staff_only, w.display_order, w.updated_at,
               u.username as author_name
        FROM wiki_articles w
        LEFT JOIN users u ON w.author_id = u.user_id
        WHERE w.is_published = 1
      `;
      let params = [];

      if (!isStaff) {
        query += ' AND w.is_staff_only = 0';
      }

      query += ' ORDER BY w.category ASC, w.display_order ASC, w.article_id ASC';

      const [rows] = await db.query(query, params);
      return res.status(200).json({ success: true, articles: rows, isStaff: Boolean(isStaff) });
    } catch (error) {
      console.error('Wiki articles query error:', error);
      return res.status(500).json({ success: false, error: 'Database query failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const perms = user.permissions || {};
      const canEdit = Boolean(perms.can_manage_wikis) || [1, 2, 3, 4].includes(user.role_id) || ['founder', 'developer', 'admin', 'moderator'].includes((user.role_name || user.role || '').toLowerCase());

      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'Forbidden. Staff privileges required (Moderator+).' });
      }

      const { article_id, category, title, slug, content_html, is_staff_only, display_order } = req.body || {};

      if (!title || !content_html) {
        return res.status(400).json({ success: false, message: 'Title and content_html are required.' });
      }

      const articleCategory = category || 'General';
      const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const staffOnly = is_staff_only ? 1 : 0;
      const order = parseInt(display_order || 0);
      const userId = user.user_id || user.id;

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ipAddress = rawIp.toString().split(',')[0].trim();

      if (article_id) {
        await db.query(
          'UPDATE wiki_articles SET category = ?, title = ?, slug = ?, content_html = ?, is_staff_only = ?, display_order = ? WHERE article_id = ?',
          [articleCategory, title, articleSlug, content_html, staffOnly, order, article_id]
        );

        await db.query(
          'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [userId, 'Update Wiki Article', `Staff ${user.username} updated article #${article_id} (${title})`, ipAddress]
        );

        return res.status(200).json({ success: true, message: 'Wiki article updated successfully.' });
      } else {
        const [result] = await db.query(
          'INSERT INTO wiki_articles (category, title, slug, content_html, author_id, is_staff_only, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [articleCategory, title, articleSlug, content_html, userId, staffOnly, order]
        );

        await db.query(
          'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
          [userId, 'Create Wiki Article', `Staff ${user.username} created wiki article #${result.insertId} (${title})`, ipAddress]
        );

        return res.status(200).json({ success: true, message: 'Wiki article created successfully.', article_id: result.insertId });
      }
    } catch (error) {
      console.error('Wiki save error:', error);
      return res.status(500).json({ success: false, error: 'Database save failed' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const perms = user.permissions || {};
      const canEdit = Boolean(perms.can_manage_wikis) || [1, 2, 3, 4].includes(user.role_id);

      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'Forbidden. Staff privileges required (Moderator+).' });
      }

      const articleId = req.query?.article_id || req.body?.article_id;
      if (!articleId) {
        return res.status(400).json({ success: false, message: 'article_id is required.' });
      }

      await db.query('UPDATE wiki_articles SET is_published = 0 WHERE article_id = ?', [articleId]);

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ipAddress = rawIp.toString().split(',')[0].trim();
      const userId = user.user_id || user.id;

      await db.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'Delete Wiki Article', `Staff ${user.username} unpublished wiki article #${articleId}`, ipAddress]
      );

      return res.status(200).json({ success: true, message: 'Wiki article unpublished.' });
    } catch (error) {
      console.error('Wiki delete error:', error);
      return res.status(500).json({ success: false, error: 'Database delete failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
