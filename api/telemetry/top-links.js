import { db } from '../../lib/db.js';
import { applyCors, authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const user = await authenticate(req, res);
    if (!user) return;

    const userId = user.user_id || user.id;

    // Execute rolling 7-day Top 9 Frequent Destinations SQL query
    const [rows] = await db.query(
      `SELECT link_destination, link_title, COUNT(*) AS visit_count
       FROM user_link_clicks
       WHERE user_id = ?
         AND clicked_at >= NOW() - INTERVAL 7 DAY
       GROUP BY link_destination, link_title
       ORDER BY visit_count DESC
       LIMIT 9`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      top_links: rows
    });
  } catch (error) {
    console.error('Top links query error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
