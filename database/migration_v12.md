# Admin-verified M-Pesa payments (v12)

Apply this migration after v11 and before deploying the matching server code. It prevents an M-Pesa receipt from being recorded against more than one payment. MySQL permits multiple `NULL` receipt values, which are used for pending STK requests.

Check for duplicate receipts before applying:

```sql
SELECT mpesa_code, COUNT(*) AS copies
FROM payments
WHERE mpesa_code IS NOT NULL
GROUP BY mpesa_code
HAVING COUNT(*) > 1;
```

Resolve any duplicates against the official M-Pesa account and the payment ledger before continuing. Take a verified database backup before applying:

```powershell
cmd /c "mysqldump -h YOUR_DB_HOST -u YOUR_DB_USER -p zetech_hostel > zetech-hostel-before-v12.sql"
cmd /c "mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p < database\migration_v12.sql"
```

The Admin Payments workspace can then record an M-Pesa payment after the admin verifies the receipt, payer, and amount in the official M-Pesa account. A student-provided screenshot or message is not sufficient proof. The separate temporary check-in action does not create or confirm a payment.
