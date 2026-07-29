# AeonMC Network - Vercel Serverless & Bloom MySQL Reference Notes

## 1. Bloom.host MySQL Database Setup
- **Host**: `dal-241001.bloom.host`
- **Port**: `3306`
- **Database Name**: `s119339_Aeonweb`
- **Username**: `u119339_EBMpCjBdyV`
- **Password**: `ippEWHGzW5a5vNUKi4IN39h9`
- **Connection URL**: `jdbc:mysql://u119339_EBMpCjBdyV:ippEWHGzW5a5vNUKi4IN39h9@dal-241001.bloom.host:3306/s119339_Aeonweb`

---

## 2. SQL Schema & Table Structure

```sql
-- 1. Create Roles Table (Matches AeonMC SOP Capability Matrix)
CREATE TABLE IF NOT EXISTS `web_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `can_access_staff_wiki` TINYINT(1) DEFAULT 0,
  `can_access_staff_forum` TINYINT(1) DEFAULT 0,
  `can_access_plan_analytics` TINYINT(1) DEFAULT 0,
  `can_access_jira` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Populate default AeonMC roles
INSERT IGNORE INTO `web_roles` (`id`, `role_name`, `can_access_staff_wiki`, `can_access_staff_forum`, `can_access_plan_analytics`, `can_access_jira`) VALUES
(1, 'founder', 1, 1, 1, 1),
(2, 'developer', 1, 1, 1, 1),
(3, 'admin', 1, 1, 1, 1),
(4, 'moderator', 1, 1, 1, 0),
(5, 'helper', 1, 1, 0, 0),
(6, 'creator', 0, 0, 0, 0),
(7, 'player', 0, 0, 0, 0);

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT DEFAULT 7, -- Defaults to 'player'
  `minecraft_uuid` VARCHAR(36) DEFAULT NULL,
  `discord_id` VARCHAR(32) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `web_roles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create Persistent Web Sessions Table
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(128) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create Audit Logs Table (Tracks administrative actions)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. Vercel Serverless Deployment Setup

### Environment Variables (Vercel Dashboard)
Configure the following environment variables in Vercel under **Settings -> Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `dal-241001.bloom.host` | Bloom MySQL Hostname |
| `DB_PORT` | `3306` | MySQL Connection Port |
| `DB_NAME` | `s119339_Aeonweb` | Database Name |
| `DB_USER` | `u119339_EBMpCjBdyV` | Database User |
| `DB_PASS` | `ippEWHGzW5a5vNUKi4IN39h9` | Database Password |
| `JWT_SECRET` | `aeonmc_secret_jwt_key_2026_production` | Secret for signing JWTs |
| `VERCEL_URL` | `https://aeon-mc-network.vercel.app` | Live Vercel App Domain |

---

## 4. Vercel Serverless Function Endpoints Overview

- `/api/auth/register.js`: Hashes passwords with `bcryptjs`, inserts account into `users` (default `role_id = 7`), and logs event in `audit_logs`.
- `/api/auth/login.js`: Authenticates against `users` and `web_roles`, generates a 7-day JWT token, inserts session record into `sessions`, and returns user capability flags (`can_access_staff_wiki`, `can_access_plan_analytics`, etc.).
- `/api/auth/me.js`: Verifies JWT or session token and queries live profile data directly from Bloom MySQL.
- `/api/ranks/set-rank.js`: Restricted to `founder`, `developer`, and `admin` roles. Updates target user `role_id` and logs action in `audit_logs`.

---

## 5. Connection Pool Helper (`lib/db.js`)
```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'dal-241001.bloom.host',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 's119339_Aeonweb',
  user: process.env.DB_USER || 'u119339_EBMpCjBdyV',
  password: process.env.DB_PASS || 'ippEWHGzW5a5vNUKi4IN39h9',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

export const db = pool;
```
