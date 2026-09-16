-- Migration v6: Add missing columns that exist in code but were never added to the schema
-- Run this on any existing database that was created from setup.sql + v2–v5 migrations.

USE zetech_hostel;

-- 1. Add `course` column to users (student's course of study)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS course VARCHAR(100) NULL AFTER campus;

-- 2. Add `suspended` and `suspend_reason` to bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
    ADD COLUMN IF NOT EXISTS suspend_reason TEXT NULL AFTER suspended;

-- 3. Add `target` column to notices ('all', 'Boys', 'Girls')
ALTER TABLE notices
    ADD COLUMN IF NOT EXISTS target ENUM('all', 'Boys', 'Girls') NOT NULL DEFAULT 'all' AFTER message;
