-- Zetech Hostel Database Migration
-- Run this in phpMyAdmin on the existing zetech_hostel database

USE zetech_hostel;

-- 1. Add beds table
CREATE TABLE IF NOT EXISTS beds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    bed_number VARCHAR(10) NOT NULL,
    position ENUM('upper', 'lower') NOT NULL,
    status ENUM('available', 'occupied') DEFAULT 'available',
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 2. Add bed_id column to bookings table
ALTER TABLE bookings ADD COLUMN bed_id INT NULL AFTER room_id;
ALTER TABLE bookings ADD FOREIGN KEY (bed_id) REFERENCES beds(id);

-- 3. Alter users role enum to include accounts and warden
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'admin', 'accounts', 'warden') DEFAULT 'student';

-- 4. Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Add health_profile table
CREATE TABLE IF NOT EXISTS health_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    medical_conditions TEXT,
    dietary_restrictions TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
