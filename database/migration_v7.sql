USE zetech_hostel;

-- Admin accounts do not require a student registration number.
-- Existing registration numbers remain unchanged.
ALTER TABLE users MODIFY COLUMN reg_no VARCHAR(50) NULL;
