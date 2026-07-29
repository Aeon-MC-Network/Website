import mysql from 'mysql2/promise';
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

  console.log('Database connected! Initializing tables...');

  // Create Roles Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255),
      permissions JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    INSERT IGNORE INTO roles (id, name, description, permissions) VALUES
    (1, 'Player', 'Default player privileges', '["forum:read", "store:buy"]'),
    (2, 'Content Creator', 'Creator status and streaming privileges', '["forum:read", "forum:create", "store:buy"]'),
    (3, 'Mod', 'Moderation and report management privileges', '["forum:read", "forum:create", "forum:moderate", "user:warn", "user:kick"]'),
    (4, 'Admin', 'Full platform administrator access', '["*"]')
  `);
  console.log('✓ Roles table created and seeded.');

  // Create Users Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Player',
      avatar VARCHAR(255),
      is_banned TINYINT(1) DEFAULT 0,
      vote_streak INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email)
    )
  `);
  console.log('✓ Users table created.');

  // Create Sessions Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      ip_address VARCHAR(45),
      user_agent VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expires (expires_at)
    )
  `);
  console.log('✓ Sessions table created.');

  // Create Audit Logs Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_action (action)
    )
  `);
  console.log('✓ Audit Logs table created.');

  await connection.end();
  console.log('🎉 Database initialization complete!');
}

initDatabase().catch((err) => {
  console.error('❌ Error initializing database:', err);
  process.exit(1);
});
