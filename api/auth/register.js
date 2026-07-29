import { pool } from '../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  try {
    // Check if username already exists
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'Username or email already registered.' });
    }

    const userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/100`;
    
    // Assign Founder/Admin role for designated admin user, otherwise Player
    const role = (username.toLowerCase() === 'thedaedragamer' || username.toLowerCase() === 'admin') ? 'Admin' : 'Player';

    await pool.query(
      'INSERT INTO users (id, username, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, email, password, role, avatarUrl]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)',
      [username, 'User Registered', `New account registered via API as ${role}`]
    );

    const userObj = {
      id: userId,
      username: username,
      email: email,
      role: role,
      avatar: avatarUrl,
      vote_streak: 0
    };

    return res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    console.error('Registration query error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}
