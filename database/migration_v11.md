# Hostel periods, checkout requests, and stay history (v11)

Apply this migration after v10. It adds:

- Admin-managed hostel periods with an opening date, duration in months, and calculated closing date.
- Student checkout requests that staff can approve or decline.
- The database indexes and fields needed for completed-stay history.

When a configured period reaches its closing date, the server closes the period, completes all checked-in stays for that campus and hostel, releases their beds, and approves any pending checkout requests for those stays. Approved bookings that were never checked in are cancelled and their beds released. Keep the backend running for the scheduled close to run promptly; overdue periods are also processed on server startup and before period/history reads.

Take a verified database backup before applying:

```powershell
cmd /c "mysqldump -h YOUR_DB_HOST -u YOUR_DB_USER -p zetech_hostel > zetech-hostel-before-v11.sql"
cmd /c "mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p < database\migration_v11.sql"
```
