import { db } from '../../lib/db.js';
import { applyCors, verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const user = token ? verifyToken(token) : null;
    const isStaff = user && (user.role_id === 1 || user.role_id === 2 || user.role_id === 3 || user.role_id === 4);

    let query = 'SELECT category_id, category_name, is_staff_only, created_at FROM categories';
    if (!isStaff) {
      query += ' WHERE is_staff_only = 0';
    }
    query += ' ORDER BY category_id ASC';

    const [rows] = await db.query(query);

    return res.status(200).json({
      success: true,
      categories: rows
    });
  } catch (error) {
    console.error('Categories query error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
