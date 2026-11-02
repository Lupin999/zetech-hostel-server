USE zetech_hostel;

ALTER TABLE payments
    ADD UNIQUE KEY unique_mpesa_receipt (mpesa_code);
