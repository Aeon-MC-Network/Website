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

    const { link_destination, link_title } = req.body || {};

    if (!link_destination || !link_title) {
      return res.status(400).json({ success: false, message: 'link_destination and link_title are required.' });
    }

    const userId = user.user_id || user.id;

    await db.query(
      'INSERT INTO user_link_clicks (user_id, link_destination, link_title) VALUES (?, ?, ?)',
      [userId, link_destination, link_title]
    );

    return res.status(200).json({ success: true, message: 'Click telemetry recorded.' });
  } catch (error) {
    console.error('Telemetry click error:', error);
    return res.status(500).json({ success: false, error: 'Database logging failed' });
  }
}
