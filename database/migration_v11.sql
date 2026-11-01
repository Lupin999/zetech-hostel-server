USE zetech_hostel;

CREATE TABLE IF NOT EXISTS hostel_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campus VARCHAR(100) NOT NULL,
    hostel ENUM('Boys', 'Girls') NOT NULL,
    semester VARCHAR(80) NOT NULL,
    opens_on DATE NOT NULL,
    duration_months TINYINT UNSIGNED NOT NULL,
    closes_on DATE NOT NULL,
    status ENUM('scheduled', 'open', 'closed') NOT NULL DEFAULT 'scheduled',
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_hostel_period_due (status, closes_on),
    INDEX idx_hostel_period_scope (campus, hostel, status)
);

CREATE TABLE IF NOT EXISTS checkout_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(1000) NULL,
    status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
    decision_note VARCHAR(1000) NULL,
    reviewed_by INT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_checkout_requests_status (status, requested_at),
    INDEX idx_checkout_requests_user (user_id, requested_at)
);
