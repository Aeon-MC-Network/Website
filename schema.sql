-- AeonMC Platform - Bloom.host MySQL Database Schema (web_roles SOP matrix)

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
