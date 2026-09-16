USE zetech_hostel;

-- Add phone column to users
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL UNIQUE AFTER email;

-- OTP codes table for phone login
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
