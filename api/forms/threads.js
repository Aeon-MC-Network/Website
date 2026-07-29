import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const categoryId = req.query?.category_id;
      let query = `
        SELECT t.thread_id, t.category_id, t.author_id, t.title, t.status, t.keep_forever, t.last_activity_at, t.created_at,
               c.category_name, u.username as author_name, u.ign as author_ign
        FROM threads t
        JOIN categories c ON t.category_id = c.category_id
        JOIN users u ON t.author_id = u.user_id
      `;
      let params = [];

      if (categoryId) {
        query += ' WHERE t.category_id = ?';
        params.push(categoryId);
      }

      query += ' ORDER BY t.keep_forever DESC, t.last_activity_at DESC LIMIT 50';

      const [rows] = await db.query(query, params);
      return res.status(200).json({ success: true, threads: rows });
    } catch (error) {
      console.error('Threads query error:', error);
      return res.status(500).json({ success: false, error: 'Database query failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const { category_id, title, content_html } = req.body || {};

      if (!category_id || !title || !content_html) {
        return res.status(400).json({ success: false, message: 'category_id, title, and content_html are required.' });
      }

      const userId = user.user_id || user.id;

      // Insert thread
      const [threadResult] = await db.query(
        'INSERT INTO threads (category_id, author_id, title, status, keep_forever) VALUES (?, ?, ?, ?, ?)',
        [category_id, userId, title, 'active', 0]
      );

      const threadId = threadResult.insertId;

      // Insert initial post
      await db.query(
        'INSERT INTO posts (thread_id, author_id, content_html) VALUES (?, ?, ?)',
        [threadId, userId, content_html]
      );

      return res.status(200).json({
        success: true,
        message: 'Thread created successfully.',
        thread_id: threadId
      });
    } catch (error) {
      console.error('Thread creation error:', error);
      return res.status(500).json({ success: false, error: 'Database thread creation failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
