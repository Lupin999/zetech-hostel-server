USE zetech_hostel;

-- Widen phone column to support email-based reset codes
ALTER TABLE otp_codes MODIFY COLUMN phone VARCHAR(100) NOT NULL;
