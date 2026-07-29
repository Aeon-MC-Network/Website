import { db } from '../../lib/db.js';
import { applyCors, authenticate, verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      const user = token ? verifyToken(token) : null;

      const { type, subject, description, contact_discord } = req.body || {};

      if (!type || !subject || !description) {
        return res.status(400).json({ success: false, message: 'Type, subject, and description are required.' });
      }

      const validTypes = ['staff_app', 'creator_app', 'report_player', 'bug_report', 'help_ticket'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid ticket type specified.' });
      }

      const userId = user ? (user.user_id || user.id) : null;
      const discordContact = contact_discord || (user ? user.username : 'Anonymous');

      const [result] = await db.query(
        'INSERT INTO support_tickets (user_id, type, subject, description, contact_discord) VALUES (?, ?, ?, ?, ?)',
        [userId, type, subject, description, discordContact]
      );

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const ipAddress = rawIp.toString().split(',')[0].trim();

      await db.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [userId, 'Submit Ticket', `Submitted ${type} ticket #${result.insertId}: ${subject}`, ipAddress]
      );

      return res.status(200).json({
        success: true,
        message: 'Your ticket/application has been successfully submitted! Our staff team will review it shortly.',
        ticket_id: result.insertId
      });
    } catch (error) {
      console.error('Support ticket submission error:', error);
      return res.status(500).json({ success: false, error: 'Database save failed' });
    }
  }

  if (req.method === 'GET') {
    try {
      const user = await authenticate(req, res);
      if (!user) return;

      const perms = user.permissions || {};
      const isStaff = Boolean(perms.can_moderate_users) || [1, 2, 3, 4].includes(user.role_id);
      const userId = user.user_id || user.id;

      let query = `
        SELECT t.ticket_id, t.user_id, t.type, t.subject, t.description, t.contact_discord, t.status, t.created_at,
               u.username as author_name, u.ign as author_ign
        FROM support_tickets t
        LEFT JOIN users u ON t.user_id = u.user_id
      `;
      let params = [];

      if (!isStaff) {
        query += ' WHERE t.user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY t.ticket_id DESC LIMIT 50';

      const [rows] = await db.query(query, params);
      return res.status(200).json({ success: true, tickets: rows });
    } catch (error) {
      console.error('Support tickets query error:', error);
      return res.status(500).json({ success: false, error: 'Database query failed' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
