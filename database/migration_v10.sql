USE zetech_hostel;

-- Keep room numbers consecutive within each hostel.
UPDATE rooms
SET room_number = CASE room_number
    WHEN '101' THEN '2'
    WHEN '102' THEN '3'
    WHEN '103' THEN '4'
    WHEN '104' THEN '5'
    WHEN '105' THEN '6'
    WHEN '106' THEN '7'
    END
WHERE hostel = 'Boys' AND room_number IN ('101', '102', '103', '104', '105', '106');

UPDATE rooms
SET room_number = CASE room_number
    WHEN '107' THEN '1'
    WHEN '108' THEN '2'
    WHEN '109' THEN '3'
    WHEN '110' THEN '4'
    WHEN '111' THEN '5'
    WHEN '112' THEN '6'
    END
WHERE hostel = 'Girls' AND room_number IN ('107', '108', '109', '110', '111', '112');

-- Preserve existing cash rows as historical records while disallowing cash in
-- all new payment submissions and removing it from the payment method enum.
ALTER TABLE payments
    MODIFY COLUMN payment_method ENUM('mpesa', 'cash', 'legacy_manual') NOT NULL;

UPDATE payments
SET payment_method = 'legacy_manual'
WHERE payment_method = 'cash';

ALTER TABLE payments
    MODIFY COLUMN payment_method ENUM('mpesa', 'legacy_manual') NOT NULL;
