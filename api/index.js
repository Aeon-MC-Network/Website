import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../lib/db.js';
import { signToken, authenticate } from '../lib/auth.js';

const app = express();

app.use(cors({ origin: ['https://www.aeonmc.com', 'https://aeonmc.com', 'https://aeonmc-website.vercel.app', 'http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json());

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// 1. AUTH ROUTER (/api/auth)
// ==========================================
const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  const { username, email, password, ign, tos_accepted, marketing_opt_in } = req.body || {};

  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanIgn = (ign || cleanUsername).trim();

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
  }

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      message: 'Username must be 3 to 32 characters long and contain only letters, numbers, or underscores.'
    });
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  if (tos_accepted === false || tos_accepted === 0) {
    return res.status(400).json({ success: false, message: 'You must accept the Terms of Service to register.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT user_id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      const isUserDup = existing.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
      return res.status(400).json({
        success: false,
        message: isUserDup ? 'That username is already taken.' : 'That email address is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const roleId = (cleanUsername.toLowerCase() === 'izengal' || cleanUsername.toLowerCase() === 'thedaedragamer') ? 1 : 7;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, ign, role_id, tos_accepted, marketing_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cleanUsername, cleanEmail, passwordHash, cleanIgn, roleId, 1, marketing_opt_in ? 1 : 0]
    );

    const userId = result.insertId;
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();

    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, 'User Registered', `New user registered with role_id=${roleId}`, ipAddress]
    );

    return res.status(200).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        user_id: userId,
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        ign: cleanIgn,
        role_id: roleId,
        role: roleId === 1 ? 'Founder' : 'Player',
        role_name: roleId === 1 ? 'Founder' : 'Player',
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(cleanIgn)}/100`
      }
    });
  } catch (error) {
    console.error('Registration database error:', error);
    return res.status(500).json({ success: false, error: 'Database transaction failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'Please enter both your username and password.' });
  }

  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.password_hash, u.ign, u.role_id, r.role_name,
              r.can_edit_vote_links, r.can_manage_wikis, r.can_moderate_users, r.can_manage_roles
       FROM users u 
       JOIN web_roles r ON u.role_id = r.role_id 
       WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)`,
      [cleanUsername, cleanUsername]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = users[0];
    let passwordValid = false;

    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(cleanPassword, user.password_hash);
    } else {
      passwordValid = (cleanPassword === user.password_hash);
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await db.query(
      `INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [sessionToken, user.user_id, ipAddress, userAgent, expiresAt]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [user.user_id, 'User Login', `Logged in as role ${user.role_name}`, ipAddress]
    );

    const permissionsObj = {
      can_edit_vote_links: Boolean(user.can_edit_vote_links),
      can_manage_wikis: Boolean(user.can_manage_wikis),
      can_moderate_users: Boolean(user.can_moderate_users),
      can_manage_roles: Boolean(user.can_manage_roles)
    };

    const userObj = {
      user_id: user.user_id,
      id: user.user_id,
      username: user.username,
      email: user.email,
      ign: user.ign || user.username,
      role_id: user.role_id,
      role: user.role_name,
      role_name: user.role_name,
      avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.ign || user.username)}/100`,
      permissions: permissionsObj
    };

    const jwtToken = signToken(userObj);
    res.setHeader('Set-Cookie', `aeon_auth_token=${jwtToken}; Path=/; Max-Age=604800; SameSite=Lax; HttpOnly`);

    return res.status(200).json({
      success: true,
      token: jwtToken,
      sessionToken,
      jwtToken,
      user: userObj
    });
  } catch (error) {
    console.error('Login database error:', error);
    return res.status(500).json({ success: false, error: 'Database session registration failed' });
  }
});

authRouter.get('/me', async (req, res) => {
  try {
    const authUser = await authenticate(req, res);
    if (!authUser) return;

    const userId = authUser.user_id || authUser.id;

    const [rows] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.ign, u.role_id, u.discord_id, u.steam_id, u.created_at, r.role_name,
              r.can_edit_vote_links, r.can_manage_wikis, r.can_moderate_users, r.can_manage_roles
       FROM users u
       JOIN web_roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      user: {
        user_id: user.user_id,
        id: user.user_id,
        username: user.username,
        email: user.email,
        ign: user.ign,
        role_id: user.role_id,
        role: user.role_name,
        role_name: user.role_name,
        discord_id: user.discord_id,
        steam_id: user.steam_id,
        avatar: `https://mc-heads.net/avatar/${encodeURIComponent(user.ign || user.username)}/100`,
        permissions: {
          can_edit_vote_links: Boolean(user.can_edit_vote_links),
          can_manage_wikis: Boolean(user.can_manage_wikis),
          can_moderate_users: Boolean(user.can_moderate_users),
          can_manage_roles: Boolean(user.can_manage_roles)
        },
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// ==========================================
// 2. FORMS ROUTER (/api/forms)
// ==========================================
const formsRouter = express.Router();

formsRouter.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT category_id, category_name, description, display_order, is_staff_only
       FROM forum_categories
       ORDER BY display_order ASC`
    );
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Fetch forum categories error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch forum categories' });
  }
});

formsRouter.get('/threads', async (req, res) => {
  const { category_id } = req.query;
  try {
    let sql = `
      SELECT t.thread_id, t.category_id, t.author_id, t.title, t.status, t.keep_forever, t.created_at, t.updated_at,
             c.category_name, u.username as author_name, u.ign as author_ign
      FROM forum_threads t
      JOIN forum_categories c ON t.category_id = c.category_id
      JOIN users u ON t.author_id = u.user_id
    `;
    const params = [];
    if (category_id) {
      sql += ' WHERE t.category_id = ?';
      params.push(category_id);
    }
    sql += ' ORDER BY t.keep_forever DESC, t.created_at DESC';

    const [threads] = await db.query(sql, params);
    return res.status(200).json({ success: true, threads });
  } catch (error) {
    console.error('Fetch threads error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch forum threads' });
  }
});

formsRouter.post('/threads', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    const { category_id, title, content_html } = req.body || {};
    if (!category_id || !title || !content_html) {
      return res.status(400).json({ success: false, message: 'Category, title, and content are required.' });
    }

    const userId = user.user_id || user.id;
    const [result] = await db.query(
      'INSERT INTO forum_threads (category_id, author_id, title) VALUES (?, ?, ?)',
      [category_id, userId, title]
    );

    const threadId = result.insertId;
    await db.query(
      'INSERT INTO forum_posts (thread_id, author_id, content_html) VALUES (?, ?, ?)',
      [threadId, userId, content_html]
    );

    return res.status(200).json({ success: true, message: 'Thread created successfully!', thread_id: threadId });
  } catch (error) {
    console.error('Create thread error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create thread' });
  }
});

formsRouter.get('/posts', async (req, res) => {
  const { thread_id } = req.query;
  if (!thread_id) {
    return res.status(400).json({ success: false, message: 'Thread ID required' });
  }
  try {
    const [posts] = await db.query(
      `SELECT p.post_id, p.thread_id, p.author_id, p.content_html, p.created_at,
              u.username as author_name, u.ign as author_ign, r.role_name as author_role
       FROM forum_posts p
       JOIN users u ON p.author_id = u.user_id
       JOIN web_roles r ON u.role_id = r.role_id
       WHERE p.thread_id = ?
       ORDER BY p.created_at ASC`,
      [thread_id]
    );
    return res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

formsRouter.post('/posts', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    const { thread_id, content_html } = req.body || {};
    if (!thread_id || !content_html) {
      return res.status(400).json({ success: false, message: 'Thread ID and content are required.' });
    }

    const userId = user.user_id || user.id;
    await db.query(
      'INSERT INTO forum_posts (thread_id, author_id, content_html) VALUES (?, ?, ?)',
      [thread_id, userId, content_html]
    );

    await db.query('UPDATE forum_threads SET updated_at = NOW() WHERE thread_id = ?', [thread_id]);

    return res.status(200).json({ success: true, message: 'Reply posted successfully!' });
  } catch (error) {
    console.error('Post reply error:', error);
    return res.status(500).json({ success: false, error: 'Failed to post reply' });
  }
});

formsRouter.post('/pin', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    if (user.role_id > 4 && !user.permissions?.can_moderate_users) {
      return res.status(403).json({ success: false, message: 'Forbidden: Moderator status required.' });
    }

    const { thread_id, keep_forever } = req.body || {};
    if (!thread_id) {
      return res.status(400).json({ success: false, message: 'Thread ID required' });
    }

    await db.query('UPDATE forum_threads SET keep_forever = ? WHERE thread_id = ?', [keep_forever ? 1 : 0, thread_id]);

    return res.status(200).json({
      success: true,
      message: keep_forever ? 'Thread pinned successfully!' : 'Thread unpinned.'
    });
  } catch (error) {
    console.error('Pin thread error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update thread status' });
  }
});

// ==========================================
// 3. TELEMETRY ROUTER (/api/telemetry)
// ==========================================
const telemetryRouter = express.Router();

telemetryRouter.post('/click', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    const { link_destination, link_title } = req.body || {};
    if (!link_destination || !link_title) {
      return res.status(400).json({ success: false, message: 'Link destination and title required.' });
    }

    const userId = user.user_id || user.id;

    await db.query(
      `INSERT INTO user_link_clicks (user_id, link_destination, link_title, visit_count)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE visit_count = visit_count + 1, last_clicked_at = CURRENT_TIMESTAMP`,
      [userId, link_destination, link_title]
    );

    return res.status(200).json({ success: true, message: 'Telemetry recorded' });
  } catch (error) {
    console.error('Telemetry log error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record telemetry' });
  }
});

telemetryRouter.get('/top-links', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    const userId = user.user_id || user.id;

    const [top_links] = await db.query(
      `SELECT link_destination, link_title, visit_count, last_clicked_at
       FROM user_link_clicks
       WHERE user_id = ?
       ORDER BY visit_count DESC
       LIMIT 9`,
      [userId]
    );

    return res.status(200).json({ success: true, top_links });
  } catch (error) {
    console.error('Telemetry fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch top links' });
  }
});

// ==========================================
// 4. RANKS ROUTER (/api/ranks)
// ==========================================
const ranksRouter = express.Router();

ranksRouter.post('/set-rank', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    if (user.role_id > 3 && !user.permissions?.can_manage_roles) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin authorization required.' });
    }

    const { targetUsername, newRole } = req.body || {};
    if (!targetUsername || !newRole) {
      return res.status(400).json({ success: false, message: 'Target username and new role required.' });
    }

    const [roles] = await db.query(
      'SELECT role_id, role_name FROM web_roles WHERE LOWER(role_name) = LOWER(?) OR role_id = ?',
      [newRole, parseInt(newRole) || 0]
    );

    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid role specified.' });
    }

    const roleObj = roles[0];

    const [result] = await db.query(
      'UPDATE users SET role_id = ? WHERE LOWER(username) = LOWER(?)',
      [roleObj.role_id, targetUsername]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user.user_id || user.id, 'Rank Promotion', `Updated ${targetUsername} rank to ${roleObj.role_name}`, rawIp]
    );

    return res.status(200).json({
      success: true,
      message: `User ${targetUsername} updated to role '${roleObj.role_name}'.`
    });
  } catch (error) {
    console.error('Rank update error:', error);
    return res.status(500).json({ success: false, error: 'Rank update failed' });
  }
});

// ==========================================
// 5. VOTE ROUTER (/api/vote)
// ==========================================
const voteRouter = express.Router();

voteRouter.get('/links', async (req, res) => {
  try {
    const [vote_links] = await db.query(
      'SELECT vote_id, title, url, reward_description, display_order, is_active FROM vote_links WHERE is_active = 1 ORDER BY display_order ASC'
    );
    return res.status(200).json({ success: true, vote_links });
  } catch (error) {
    console.error('Fetch vote links error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch vote links' });
  }
});

voteRouter.post('/links', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    if (user.role_id > 3 && !user.permissions?.can_edit_vote_links) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin rank required to edit vote links.' });
    }

    const { vote_id, title, url, reward_description, display_order } = req.body || {};
    if (!title || !url) {
      return res.status(400).json({ success: false, message: 'Title and URL are required.' });
    }

    if (vote_id) {
      await db.query(
        'UPDATE vote_links SET title = ?, url = ?, reward_description = ?, display_order = ? WHERE vote_id = ?',
        [title, url, reward_description || '', display_order || 0, vote_id]
      );
      return res.status(200).json({ success: true, message: 'Vote link updated successfully!' });
    } else {
      await db.query(
        'INSERT INTO vote_links (title, url, reward_description, display_order) VALUES (?, ?, ?, ?)',
        [title, url, reward_description || '', display_order || 0]
      );
      return res.status(200).json({ success: true, message: 'Vote link created successfully!' });
    }
  } catch (error) {
    console.error('Save vote link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save vote link' });
  }
});

voteRouter.delete('/links', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    if (user.role_id > 3 && !user.permissions?.can_edit_vote_links) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin rank required to delete vote links.' });
    }

    const { vote_id } = req.body || {};
    if (!vote_id) {
      return res.status(400).json({ success: false, message: 'Vote ID required.' });
    }

    await db.query('UPDATE vote_links SET is_active = 0 WHERE vote_id = ?', [vote_id]);
    return res.status(200).json({ success: true, message: 'Vote link deactivated.' });
  } catch (error) {
    console.error('Delete vote link error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete vote link' });
  }
});

// ==========================================
// 6. WIKI ROUTER (/api/wiki)
// ==========================================
const wikiRouter = express.Router();

wikiRouter.get('/articles', async (req, res) => {
  try {
    const user = await authenticate(req, res, true);
    const isStaff = user && (user.role_id <= 4 || user.permissions?.can_manage_wikis);

    let sql = 'SELECT article_id, category, title, slug, content_html, is_staff_only, updated_at FROM wiki_articles';
    if (!isStaff) {
      sql += ' WHERE is_staff_only = 0';
    }
    sql += ' ORDER BY category ASC, title ASC';

    const [articles] = await db.query(sql);
    return res.status(200).json({ success: true, articles, isStaff: Boolean(isStaff) });
  } catch (error) {
    console.error('Fetch wiki articles error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch wiki articles' });
  }
});

wikiRouter.post('/articles', async (req, res) => {
  try {
    const user = await authenticate(req, res);
    if (!user) return;

    if (user.role_id > 4 && !user.permissions?.can_manage_wikis) {
      return res.status(403).json({ success: false, message: 'Forbidden: Moderator rank required for wiki management.' });
    }

    const { article_id, category, title, slug, content_html, is_staff_only } = req.body || {};
    if (!title || !content_html) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const cleanSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    const userId = user.user_id || user.id;

    if (article_id) {
      await db.query(
        'UPDATE wiki_articles SET category = ?, title = ?, slug = ?, content_html = ?, is_staff_only = ? WHERE article_id = ?',
        [category || 'General', title, cleanSlug, content_html, is_staff_only ? 1 : 0, article_id]
      );
      return res.status(200).json({ success: true, message: 'Wiki article updated!' });
    } else {
      await db.query(
        'INSERT INTO wiki_articles (category, title, slug, content_html, is_staff_only, author_id) VALUES (?, ?, ?, ?, ?, ?)',
        [category || 'General', title, cleanSlug, content_html, is_staff_only ? 1 : 0, userId]
      );
      return res.status(200).json({ success: true, message: 'Wiki article created!' });
    }
  } catch (error) {
    console.error('Save wiki article error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save wiki article' });
  }
});

// ==========================================
// 7. SUPPORT ROUTER (/api/support)
// ==========================================
const supportRouter = express.Router();

supportRouter.post('/tickets', async (req, res) => {
  try {
    const user = await authenticate(req, res, true);
    const { type, contact_discord, subject, description } = req.body || {};

    if (!contact_discord || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Discord tag, subject, and description are required.' });
    }

    const userId = user ? (user.user_id || user.id) : null;
    const ticketType = type || 'help_ticket';

    await db.query(
      'INSERT INTO support_tickets (user_id, ticket_type, contact_discord, subject, description) VALUES (?, ?, ?, ?, ?)',
      [userId, ticketType, contact_discord, subject, description]
    );

    return res.status(200).json({ success: true, message: 'Support ticket submitted successfully!' });
  } catch (error) {
    console.error('Submit support ticket error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit ticket' });
  }
});

// Mount Express Routers
app.use('/api/auth', authRouter);
app.use('/api/forms', formsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/ranks', ranksRouter);
app.use('/api/vote', voteRouter);
app.use('/api/wiki', wikiRouter);
app.use('/api/support', supportRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AeonMC Serverless API (Single Consolidated Function)',
    version: '1.0.2',
    timestamp: new Date().toISOString()
  });
});

// Server Status Proxy Cache
let serverStatusCache = null;
let lastStatusFetch = 0;

app.get('/api/server-status', async (req, res) => {
  const now = Date.now();
  if (serverStatusCache && now - lastStatusFetch < 60000) {
    return res.json(serverStatusCache);
  }

  const serverHost = 'play.aeonmc.com';
  try {
    let fetchRes = await fetch(`https://api.mcsrvstat.us/3/${serverHost}`);
    let data = await fetchRes.json().catch(() => null);
    
    if (fetchRes.ok && data && data.online) {
      serverStatusCache = { success: true, online: data.players?.online || 0, max: data.players?.max || 500 };
      lastStatusFetch = now;
      return res.json(serverStatusCache);
    }
    
    fetchRes = await fetch(`https://api.mcstatus.io/v2/status/java/${serverHost}`);
    data = await fetchRes.json().catch(() => null);
    
    if (fetchRes.ok && data && data.online) {
      serverStatusCache = { success: true, online: data.players?.online || 0, max: data.players?.max || 500 };
      lastStatusFetch = now;
      return res.json(serverStatusCache);
    }
    
    return res.json({ success: false });
  } catch (err) {
    console.error('Server status proxy error:', err);
    return res.json({ success: false });
  }
});

export default app;
