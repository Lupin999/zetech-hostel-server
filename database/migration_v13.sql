-- Migration v13: Store temporary/mercy access type and reason on the bookings row
-- so the Stays table can show why a student was checked in without full payment.

USE zetech_hostel;

ALTER TABLE bookings
    ADD COLUMN check_in_access_type ENUM('normal', 'temporary', 'mercy') NULL
        COMMENT 'Set when a student is checked in without full payment',
    ADD COLUMN check_in_note TEXT NULL
        COMMENT 'Reason entered by admin when granting temporary or mercy access';
