# Operations Migration v9

This migration adds stay lifecycle fields, a completed booking state, maintenance/complaint requests, room inspections, visitor records, and admin audit history. It does not rewrite or delete existing bookings or payments. It also creates a legacy `refund_requests` table, but the application no longer exposes refund workflows. Keep that table unless any historical records have been verified and backed up before removal.

## Apply safely

1. Schedule a maintenance window and take a verified backup of the `zetech_hostel` database. Keep the backup outside the project directory.
2. Confirm the database has migrations through `migration_v8.sql` and has the existing `users`, `rooms`, `beds`, `bookings`, and `payments` tables.
3. Apply `migration_v9.sql` once to that database. It is a forward migration; do not run it a second time because the booking columns are added with `ALTER TABLE`.
4. Verify the new booking columns and `completed` status, plus the `maintenance_requests`, `room_inspections`, `visitor_logs`, and `admin_audit_logs` tables.
5. For the room-numbering and M-Pesa-only payment updates, apply `migration_v10.sql` after v9.
6. Deploy the server and client changes. Existing booking and payment data remains in place.

Example commands (the `-p` option prompts for the database password):

```powershell
cmd /c "mysqldump -h YOUR_DB_HOST -u YOUR_DB_USER -p zetech_hostel > zetech-hostel-before-v9.sql"
cmd /c "mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p < database\migration_v9.sql"
```

Do not put database passwords in command arguments, source files, or shell history. If verification fails, stop deployment and restore the verified backup using the database administrator's normal recovery procedure.