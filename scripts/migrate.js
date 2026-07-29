import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function runMigrations() {
  const host = process.env.DB_HOST || 'dal-241001.bloom.host';
  const port = parseInt(process.env.DB_PORT || '3306');
  const database = process.env.DB_NAME || 's119339_Aeonweb';
  const user = process.env.DB_USER || 'u119339_EBMpCjBdyV';
  const password = process.env.DB_PASS || 'ippEWHGzW5a5vNUKi4IN39h9';

  console.log(`Connecting to Bloom MySQL server at ${host}:${port} (${database})...`);

  const connection = await mysql.createConnection({
    host,
    port,
    database,
    user,
    password
  });

  console.log('Connected! Executing unified schema migration...\n');

  // Disable Foreign Key checks for clean table replacement
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  // Drop old tables if column structures differ
  await connection.query('DROP TABLE IF EXISTS wiki_articles');
  await connection.query('DROP TABLE IF EXISTS support_tickets');
  await connection.query('DROP TABLE IF EXISTS audit_logs');
  await connection.query('DROP TABLE IF EXISTS sessions');
  await connection.query('DROP TABLE IF EXISTS posts');
  await connection.query('DROP TABLE IF EXISTS threads');
  await connection.query('DROP TABLE IF EXISTS categories');
  await connection.query('DROP TABLE IF EXISTS user_link_clicks');
  await connection.query('DROP TABLE IF EXISTS creator_hubs');
  await connection.query('DROP TABLE IF EXISTS users');
  await connection.query('DROP TABLE IF EXISTS web_roles');
  await connection.query('DROP TABLE IF EXISTS vote_links');

  // 1. Web Roles Table
  console.log('Migrating [web_roles] table...');
  await connection.query(`
    CREATE TABLE web_roles (
      role_id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL UNIQUE,
      can_edit_vote_links TINYINT(1) DEFAULT 0,
      can_manage_wikis TINYINT(1) DEFAULT 0,
      can_moderate_users TINYINT(1) DEFAULT 0,
      can_manage_roles TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT INTO web_roles (role_id, role_name, can_edit_vote_links, can_manage_wikis, can_moderate_users, can_manage_roles) VALUES
    (1, 'Founder', 1, 1, 1, 1),
    (2, 'Developer', 1, 1, 1, 0),
    (3, 'Admin', 1, 1, 1, 0),
    (4, 'Moderator', 0, 1, 1, 0),
    (5, 'Helper', 0, 0, 0, 0),
    (6, 'Creator', 0, 0, 0, 0),
    (7, 'Player', 0, 0, 0, 0);
  `);
  console.log('✓ [web_roles] table created & capability matrix seeded.');

  // 2. Users Table
  console.log('Migrating [users] table...');
  await connection.query(`
    CREATE TABLE users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      ign VARCHAR(32) NOT NULL,
      role_id INT DEFAULT 7,
      is_email_verified TINYINT(1) DEFAULT 0,
      verification_token VARCHAR(64) NULL,
      discord_id VARCHAR(64) NULL,
      steam_id VARCHAR(64) NULL,
      tos_accepted TINYINT(1) NOT NULL DEFAULT 1,
      marketing_opt_in TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES web_roles(role_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [users] table created.');

  // Seed Founder Account (Izengal / ABC123)
  const founderPassHash = await bcrypt.hash('ABC123', 10);
  await connection.query(`
    INSERT INTO users (username, email, password_hash, ign, role_id, is_email_verified, tos_accepted, marketing_opt_in)
    VALUES (?, ?, ?, ?, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role_id = 1;
  `, ['Izengal', 'izengal@aeonmc.com', founderPassHash, 'Izengal']);
  console.log('✓ Founder account [Izengal] seeded with role_id=1 (Founder).');

  // 3. Creator Hubs Table
  console.log('Migrating [creator_hubs] table...');
  await connection.query(`
    CREATE TABLE creator_hubs (
      creator_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      youtube_channel_id VARCHAR(100) NULL,
      tiktok_username VARCHAR(100) NULL,
      twitch_username VARCHAR(100) NULL,
      referral_code VARCHAR(32) UNIQUE NULL,
      bio TEXT NULL,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [creator_hubs] table created.');

  // 4. User Link Clicks Telemetry Table
  console.log('Migrating [user_link_clicks] table...');
  await connection.query(`
    CREATE TABLE user_link_clicks (
      click_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      link_destination VARCHAR(255) NOT NULL,
      link_title VARCHAR(100) NOT NULL,
      clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_time (user_id, clicked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [user_link_clicks] table created.');

  // 5. Forum Categories Table
  console.log('Migrating [categories] table...');
  await connection.query(`
    CREATE TABLE categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL,
      is_staff_only TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT INTO categories (category_id, category_name, is_staff_only) VALUES
    (1, 'Server Announcements', 0),
    (2, 'General Discussion', 0),
    (3, 'Creator Hubs & Media', 0),
    (4, 'Guides & Tutorials', 0),
    (5, 'Staff Discussion & SOP', 1);
  `);
  console.log('✓ [categories] table created & default categories seeded.');

  // 6. Forum Threads Table
  console.log('Migrating [threads] table...');
  await connection.query(`
    CREATE TABLE threads (
      thread_id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      author_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      status ENUM('active', 'archived') DEFAULT 'active',
      keep_forever TINYINT(1) DEFAULT 0,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
      INDEX idx_lifecycle (status, keep_forever, last_activity_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [threads] table created.');

  // 7. Forum Posts Table
  console.log('Migrating [posts] table...');
  await connection.query(`
    CREATE TABLE posts (
      post_id INT AUTO_INCREMENT PRIMARY KEY,
      thread_id INT NOT NULL,
      author_id INT NOT NULL,
      content_html LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [posts] table created.');

  // 8. Sessions Table
  console.log('Migrating [sessions] table...');
  await connection.query(`
    CREATE TABLE sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [sessions] table created.');

  // 9. Audit Logs Table
  console.log('Migrating [audit_logs] table...');
  await connection.query(`
    CREATE TABLE audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT DEFAULT NULL,
      ip_address VARCHAR(45) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [audit_logs] table created.');

  // 10. Admin-Editable Vote Links Table
  console.log('Migrating [vote_links] table...');
  await connection.query(`
    CREATE TABLE vote_links (
      vote_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      url VARCHAR(255) NOT NULL,
      reward_description VARCHAR(255) DEFAULT '1x Vote Key + $500 In-Game Coins',
      is_active TINYINT(1) DEFAULT 1,
      display_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT INTO vote_links (vote_id, title, url, reward_description, display_order) VALUES
    (1, 'Minecraft Server List', 'https://minecraft-server-list.com/site/aeonmc', '1x Vote Key + $500 In-Game Coins', 1),
    (2, 'Planet Minecraft', 'https://planetminecraft.com/server/aeonmc/vote', '1x Vote Key + 50 Claim Blocks', 2),
    (3, 'TopG', 'https://topg.org/minecraft-servers/server-aeonmc', '1x Vote Key + 10 XP Levels', 3),
    (4, 'Minecraft MP', 'https://minecraft-mp.com/server/aeonmc/vote', '1x Vote Key + $500 In-Game Coins', 4);
  `);
  console.log('✓ [vote_links] table created & default voting links seeded.');

  // 11. Support Center Tickets Table
  console.log('Migrating [support_tickets] table...');
  await connection.query(`
    CREATE TABLE support_tickets (
      ticket_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      type ENUM('staff_app', 'creator_app', 'report_player', 'bug_report', 'help_ticket') NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description LONGTEXT NOT NULL,
      contact_discord VARCHAR(100) NULL,
      status ENUM('open', 'in_review', 'resolved', 'closed') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ [support_tickets] table created.');

  // 12. Wiki Documentation Articles Table
  console.log('Migrating [wiki_articles] table...');
  await connection.query(`
    CREATE TABLE wiki_articles (
      article_id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      content_html LONGTEXT NOT NULL,
      author_id INT DEFAULT NULL,
      is_staff_only TINYINT(1) DEFAULT 0,
      is_published TINYINT(1) DEFAULT 1,
      display_order INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT INTO wiki_articles (article_id, category, title, slug, content_html, author_id, is_staff_only, display_order) VALUES
    (1, 'Rules & Conduct', 'Server Rules & Conduct Guidelines', 'rules-conduct', '<h3>AeonMC Official Conduct Standards</h3><p>1. Respect all players and staff members.<br>2. No cheating, hacked clients, or exploit abuse.<br>3. Keep chat civil—no hate speech or harassment.</p>', 1, 0, 1),
    (2, 'Gameplay', 'Custom Item Recipes & Enchantments', 'custom-recipes', '<h3>Custom Medieval Crafting</h3><p>Discover ancient forged armor, legend tier swords, and custom enchantments at the spawn blacksmith.</p>', 1, 0, 2),
    (3, 'Kingdoms', 'Towny Kingdom Commands & Land Claiming', 'towny-guide', '<h3>Towny Basics</h3><p>Use <code>/t new &lt;name&gt;</code> to found your town, and <code>/t claim</code> to secure territory from raiding.</p>', 1, 0, 3),
    (4, 'Staff SOP', 'Staff SOP & Moderation Standards', 'staff-sop', '<h3>Staff Operating Procedures</h3><p>Confidential documentation for Moderator+ regarding mute durations, ban escalations, and ticket responses.</p>', 1, 1, 4);
  `);
  console.log('✓ [wiki_articles] table created & default documentation seeded.');

  // Enable Foreign Key checks
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  // 13. Automated Daily 02:00 AM Forum Purging Scheduled Event
  console.log('Configuring daily 02:00 AM forum purging scheduled event...');
  try {
    await connection.query('SET GLOBAL event_scheduler = ON;');
    await connection.query('DROP EVENT IF EXISTS evt_aeon_forms_lifecycle;');
    await connection.query(`
      CREATE EVENT evt_aeon_forms_lifecycle
      ON SCHEDULE EVERY 1 DAY
      STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
      DO
      BEGIN
        UPDATE threads
        SET status = 'archived'
        WHERE status = 'active'
          AND last_activity_at < NOW() - INTERVAL 30 DAY;

        DELETE FROM threads
        WHERE status = 'archived'
          AND keep_forever = 0
          AND last_activity_at < NOW() - INTERVAL 90 DAY;
      END
    `);
    console.log('✓ [evt_aeon_forms_lifecycle] event scheduler created.');
  } catch (eventErr) {
    console.warn('⚠️ Note on event creation:', eventErr.message);
  }

  await connection.end();
  console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
