import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function initDatabase() {
  console.log('Connecting to Bloom MySQL database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'dal-241001.bloom.host',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 's119339_Aeonweb',
    user: process.env.DB_USER || 'u119339_EBMpCjBdyV',
    password: process.env.DB_PASS || 'ippEWHGzW5a5vNUKi4IN39h9'
  });

  console.log('Database connected! Creating tables...');

  // Disable foreign key checks for clean migration
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  // Drop old tables if structure differs
  await connection.query('DROP TABLE IF EXISTS audit_logs');
  await connection.query('DROP TABLE IF EXISTS sessions');
  await connection.query('DROP TABLE IF EXISTS users');
  await connection.query('DROP TABLE IF EXISTS web_roles');
  await connection.query('DROP TABLE IF EXISTS roles');

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Create Roles Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS web_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL UNIQUE,
      can_access_staff_wiki TINYINT(1) DEFAULT 0,
      can_access_staff_forum TINYINT(1) DEFAULT 0,
      can_access_plan_analytics TINYINT(1) DEFAULT 0,
      can_access_jira TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT IGNORE INTO web_roles (id, role_name, can_access_staff_wiki, can_access_staff_forum, can_access_plan_analytics, can_access_jira) VALUES
    (1, 'founder', 1, 1, 1, 1),
    (2, 'developer', 1, 1, 1, 1),
    (3, 'admin', 1, 1, 1, 1),
    (4, 'moderator', 1, 1, 1, 0),
    (5, 'helper', 1, 1, 0, 0),
    (6, 'creator', 0, 0, 0, 0),
    (7, 'player', 0, 0, 0, 0);
  `);
  console.log('✓ web_roles table created and seeded with capability matrix.');

  // 2. Create Users Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INT DEFAULT 7,
      minecraft_uuid VARCHAR(36) DEFAULT NULL,
      discord_id VARCHAR(32) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES web_roles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ users table created.');

  // 3. Create Persistent Web Sessions Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ sessions table created.');

  // 4. Create Audit Logs Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT DEFAULT NULL,
      ip_address VARCHAR(45) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ audit_logs table created.');

  // Seed Founder/Admin Account
  const founderPassHash = await bcrypt.hash('SecurePassword123!', 10);
  await connection.query(`
    INSERT INTO users (username, email, password_hash, role_id)
    VALUES (?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role_id = 1;
  `, ['TheDaedraGamer', 'thedaedragamer@aeonmc.com', founderPassHash]);
  console.log('✓ Founder account (TheDaedraGamer) seeded with role_id=1 (founder).');

  await connection.end();
  console.log('🎉 Database initialization and seeding complete!');
}

initDatabase().catch((err) => {
  console.error('❌ Error initializing database:', err);
  process.exit(1);
});
