import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const threadId = req.query?.thread_id;
      if (!threadId) {
        return res.status(400).json({ success: false, message: 'thread_id parameter is required.' });
      }

      const [rows] = await db.query(
        `SELECT p.post_id, p.thread_id, p.author_id, p.content_html, p.created_at,
                u.username as author_name, u.ign as author_ign, r.role_name as author_role
         FROM posts p
         JOIN users u ON p.author_id = u.user_id
         LEFT JOIN web_roles r ON u.role_id = r.role_id
         WHERE p.thread_id = ?
         ORDER BY p.post_id ASC`,
        [threadId]
      );

      return res.status(200).json({ success: true, posts: rows });
    } catch (error) {
      console.error('Posts query error:', error);
      return res.status(500).json({ success: false, error: 'Database query failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const { thread_id, content_html } = req.body || {};

      if (!thread_id || !content_html) {
        return res.status(400).json({ success: false, message: 'thread_id and content_html are required.' });
      }

      // Check if thread is archived
      const [threads] = await db.query('SELECT status FROM threads WHERE thread_id = ?', [thread_id]);
      if (threads.length === 0) {
        return res.status(404).json({ success: false, message: 'Thread not found.' });
      }

      if (threads[0].status === 'archived') {
        return res.status(403).json({ success: false, message: 'Thread is archived (read-only).' });
      }

      const userId = user.user_id || user.id;

      // Insert post reply
      const [result] = await db.query(
        'INSERT INTO posts (thread_id, author_id, content_html) VALUES (?, ?, ?)',
        [thread_id, userId, content_html]
      );

      // Update thread last_activity_at
      await db.query(
        'UPDATE threads SET last_activity_at = NOW() WHERE thread_id = ?',
        [thread_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Reply posted successfully.',
        post_id: result.insertId
      });
    } catch (error) {
      console.error('Post creation error:', error);
      return res.status(500).json({ success: false, error: 'Database post creation failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
