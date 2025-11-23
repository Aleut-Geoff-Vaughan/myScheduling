-- Script to set default passwords for existing users
-- Default password: "TempPass123!" (BCrypt hash with work factor 12)
-- Users should be prompted to change this on first login

-- NOTE: This is the BCrypt hash for "TempPass123!"
-- Generated with work factor 12: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgdRrvYyu

UPDATE users
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgdRrvYyu',
    password_changed_at = NOW(),
    failed_login_attempts = 0,
    locked_out_until = NULL
WHERE password_hash IS NULL;

-- Verify the update
SELECT
    id,
    email,
    display_name,
    CASE
        WHEN password_hash IS NOT NULL THEN 'Password Set'
        ELSE 'No Password'
    END as password_status,
    is_active
FROM users
ORDER BY email;
