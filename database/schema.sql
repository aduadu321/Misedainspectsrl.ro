-- MariaDB / MySQL schema for the ITP NOTIFICATION backend
-- This mirrors the current MongoDB-based structures so the API can be adapted
-- to use a relational storage engine when deploying via cPanel/phpMyAdmin.

-- Adjust the database name if your hosting provider enforces a prefix.
CREATE DATABASE IF NOT EXISTS `misedain_itp_notification`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `misedain_itp_notification`;

-- Users table holds the core profile and authentication details.
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `external_id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `nume` VARCHAR(50) NOT NULL,
  `prenume` VARCHAR(50) NOT NULL,
  `nr_telefon` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `parola_hash` VARCHAR(255) NOT NULL,
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_sms_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `preferred_verification` ENUM('email','sms') NOT NULL DEFAULT 'email',
  `email_verification_token` VARCHAR(64) NULL,
  `sms_verification_code` VARCHAR(6) NULL,
  `reset_password_token` VARCHAR(64) NULL,
  `reset_password_expires` DATETIME NULL,
  `github_id` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`nr_telefon`),
  UNIQUE KEY `uk_users_github` (`github_id`),
  INDEX `idx_users_email_token` (`email_verification_token`),
  INDEX `idx_users_sms_code` (`sms_verification_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit table for outbound notifications (optional, mirrors service logs).
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `channel` ENUM('email','sms') NOT NULL,
  `purpose` ENUM('verification','activation','reset','reminder') NOT NULL,
  `status` ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  `details` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notif_user_channel` (`user_id`,`channel`),
  CONSTRAINT `fk_notification_logs_users`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If you plan to store session data server-side, uncomment the block below and
-- configure express-session with a compatible store (e.g. connect-session-knex).
--
-- CREATE TABLE IF NOT EXISTS `sessions` (
--   `sid` VARCHAR(255) NOT NULL,
--   `session` JSON NOT NULL,
--   `expires` DATETIME NOT NULL,
--   PRIMARY KEY (`sid`),
--   INDEX `idx_sessions_expires` (`expires`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;