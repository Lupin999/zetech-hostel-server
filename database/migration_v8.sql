USE zetech_hostel;

-- Restore registration fields used by the current student registration route.
ALTER TABLE users
    ADD COLUMN gender ENUM('Male', 'Female') NULL AFTER campus,
    ADD COLUMN hostel_preference ENUM('Boys', 'Girls') NULL AFTER gender;
