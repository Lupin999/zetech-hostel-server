USE zetech_hostel;

ALTER TABLE bookings
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
    ADD COLUMN departure_date DATE NULL,
    ADD COLUMN checked_in_at TIMESTAMP NULL,
    ADD COLUMN checked_out_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NULL,
    request_type ENUM('maintenance', 'complaint') NOT NULL DEFAULT 'maintenance',
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    resolution TEXT NULL,
    assigned_to INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_requests_status_created (status, created_at),
    INDEX idx_requests_user (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    visitor_name VARCHAR(120) NOT NULL,
    visitor_phone VARCHAR(30) NULL,
    purpose VARCHAR(255) NOT NULL,
    status ENUM('expected', 'checked_in', 'checked_out', 'cancelled') NOT NULL DEFAULT 'expected',
    arrival_at TIMESTAMP NULL,
    departure_at TIMESTAMP NULL,
    recorded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_visitors_resident_status (resident_id, status),
    INDEX idx_visitors_arrival (arrival_at)
);

CREATE TABLE IF NOT EXISTS refund_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    requested_by INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'processed') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    processed_at TIMESTAMP NULL,
    external_reference VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_refunds_status_created (status, created_at),
    INDEX idx_refunds_payment (payment_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80) NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_actor (actor_user_id, created_at),
    INDEX idx_audit_entity (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS room_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    inspected_by INT NULL,
    condition_status ENUM('good', 'attention_required', 'uninhabitable') NOT NULL,
    cleanliness ENUM('clean', 'needs_cleaning', 'poor') NOT NULL,
    safety_status ENUM('clear', 'issue_found') NOT NULL,
    notes TEXT NULL,
    inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_inspections_room_date (room_id, inspected_at)
);