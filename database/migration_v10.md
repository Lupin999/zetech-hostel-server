# Room numbering and M-Pesa-only payments (v10)

Apply this migration after v9. It renumbers the existing Nairobi rooms within each hostel:

- Boys: 101–106 become 2–7; the existing Boys room 1 remains 1.
- Girls: 107–112 become 1–6.

Payment records are retained. Any historic `cash` entry is relabeled `legacy_manual` before cash is removed from the database enum. The application accepts only new M-Pesa payment submissions.

Take a verified database backup before applying. This migration is intended for the existing room numbering and should be applied once.

```powershell
cmd /c "mysqldump -h YOUR_DB_HOST -u YOUR_DB_USER -p zetech_hostel > zetech-hostel-before-v10.sql"
cmd /c "mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p < database\migration_v10.sql"
```

Verify the names and payment methods:

```sql
SELECT hostel, campus, room_number FROM rooms ORDER BY hostel, campus, room_number;
SELECT payment_method, COUNT(*) FROM payments GROUP BY payment_method;
```
