# Zetech Hostel API reference

This reference reflects the checked-in route handlers in `server/routes/` and their service behavior in `server/services/`. It documents the current code, which may differ from the version deployed on Render.

## Server and setup

- **Port:** `process.env.PORT`; the code's fallback is `5000`. Startup validation nevertheless requires `PORT` to be set.
- **Local base URL:** `http://localhost:5000/api`
- **Current Render base URL:** `https://zetech-hostel-api.onrender.com/api`
- **Authentication:** send `Authorization: Bearer <JWT>` for protected routes. The token is returned by `/auth/login`, `/auth/verify-otp`, and student registration, and expires after 24 hours.
- **Admin authorization:** protected admin endpoints require the current account role to be `admin`.
- **Content type:** use `Content-Type: application/json` for JSON request bodies.
- **Path/query notation:** `:id` means a path parameter. Query parameters are listed explicitly. Routes with no body accept no body; samples `{}` are provided only where a JSON body is optional or ignored.

### Required startup environment variables

These are required by `server/config/env.js`: `PORT`, `DB_HOST`, `DB_USER`, `DB_NAME`, `JWT_SECRET`, `ADMIN_SECRET`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, and `MPESA_CALLBACK_URL`.

`DB_PASSWORD` is read by the DB connection but is not in the startup validator's required list (supply it if the database requires a password). `DB_PORT` defaults to `3306`. `DB_SSL` and `DB_SSL_CA` are optional; TLS verification is enabled by default in production. `ALLOWED_ORIGINS` and `RENDER_URL` are optional/recommended in production. `MPESA_ENV` controls sandbox/production Daraja behavior.

## Endpoint conventions and common errors

- Missing token: `401 {"error":"Access token required"}`; invalid/expired token: `403 {"error":"Invalid or expired token"}`; deleted account: `401 {"error":"Account no longer exists"}`.
- Authenticated non-admin on an admin route: `403 {"error":"Your role cannot perform this action"}` (some middleware paths say `Admin access required`).
- Most unhandled route errors return `500 {"error":"Server error"}` or `{"error":"Internal server error"}`. Listed endpoint-specific errors take precedence.
- Login, OTP, and admin-account creation are rate limited: login/send/verify OTP are limited to 5 requests per minute; admin creation is limited to 3 requests per 2 minutes. Rate-limit response is HTTP 429.
- `POST /api/auth/send-otp` looks up the account using `phone` but sends the OTP to the email address on the account; it is not SMS.
- There is no `GET /api/payments/stk-query` route. The implemented route is `POST /api/payments/stk-query`.

## System

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /health` | No | None | No body | Plain text `ok` | No route-specific errors |
| `GET /api/ping` | No | None | No body | `{"ok":true,"ts":<unix-ms>}` | No route-specific errors |
| `GET /api/programmes` | No | None | No body | Array of `{level,code,name}` programme objects | No route-specific errors |
| `GET /api/status` | No | None | No body | `{"status":"running","version":"1.0.0","uptime":"<seconds>s","database":"connected\|error\|disconnected","timestamp":"<ISO date>"}` | Database problems are represented in the success body as `database:"error"` |
| `GET /api/docs` | No | None | No body | JSON overview of the API and selected endpoint examples | No route-specific errors |
| `GET /api/db-test` (development only) | No | None | No body | `{"connected":true,"tables":[...]}` or `{"connected":false,"error":"..."}` | Only mounted when `NODE_ENV` is not `production` |

## Auth

`course` values must match a name returned by `GET /api/programmes`. Student registration requires a registration number of `PROGRAMME_CODE-XX'NNNN/YYYY` (a hyphen may replace the apostrophe) whose code matches the selected programme. Phone values may be local Kenyan form or international form and are normalized when saved.

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `POST /api/auth/register` | No | None | Required: `reg_no` string, `email` string, `phone` string, `full_name` string, `course` string, `password` string (min 6). Optional: `gender` string (`Male`\|`Female`), `hostel_preference` string (defaults to Boys/Girls based on gender). Sample: `{"reg_no":"BCOM-01'0046/2024","email":"student@example.com","phone":"0712345678","full_name":"Test Student","course":"Bachelor of Commerce","password":"ChangeMe1","gender":"Male","hostel_preference":"Boys"}` | HTTP 201 `{"message":"User registered successfully","token":"<JWT>","user":{"id":1,"reg_no":"...","email":"...","phone":"...","full_name":"...","role":"student","campus":"Zetech","gender":"Male","hostel_preference":"Boys","course":"..."}}` | 400 invalid/missing fields, registration format/course mismatch, duplicate user/phone; 500 server error |
| `POST /api/auth/login` | No | None | Required: `email` string, `password` string. Sample: `{"email":"student@example.com","password":"ChangeMe1"}` | `{"token":"<JWT>","user":{"id":1,"reg_no":"...","email":"...","phone":"...","full_name":"...","role":"student","campus":"Zetech","gender":"Male","hostel_preference":"Boys","course":"..."}}` | 400 missing/invalid email or missing password; 401 account not found or incorrect password; 500 |
| `POST /api/auth/send-otp` | No | None | Required: `phone` string. Sample: `{"phone":"+254712345678"}` | `{"message":"OTP sent to st***@example.com","maskedEmail":"st***@example.com"}` | 400 missing/invalid/too short/too long number; 404 no account; 503 mail delivery failed/timed out; 500 |
| `POST /api/auth/verify-otp` | No | None | Required: `phone` string, `code` string (6 digits). Sample: `{"phone":"+254712345678","code":"123456"}` | `{"token":"<JWT>","user":{...user fields as in login...}}` | 400 missing/invalid phone or missing fields; 401 invalid/expired code (attempt count in message); 429 OTP lockout; 404 no account; 500 |
| `GET /api/auth/verify` | Yes | None | No body | `{"user":{...id,reg_no,email,phone,full_name,role,campus,gender,hostel_preference,course...}}` | 401 account not found; 403 invalid/expired token; 500 |
| `PUT /api/auth/profile/info` | Yes | None | Required: `full_name` string. Optional: `course` string, `email` string, `phone` string; students must include a nonblank phone. Sample: `{"full_name":"Test Student","course":"Bachelor of Commerce","email":"student@example.com","phone":"+254712345678"}` | `{"message":"Profile updated","user":{...updated user fields...}}` | 400 missing name, invalid/duplicate email or phone; 401/403 token; 500 |
| `PUT /api/auth/profile` | Yes | None | Required: `currentPassword` string, `newPassword` string (min 6). Sample: `{"currentPassword":"ChangeMe1","newPassword":"NewPassword2"}` | `{"message":"Password updated successfully"}` | 400 missing passwords, too-short new password, wrong current password; 401/403 token; 404 user; 500 |
| `DELETE /api/auth/account` | Yes | None | Required: `currentPassword` string. Sample: `{"currentPassword":"ChangeMe1"}` | `{"message":"Account and linked booking/payment records permanently deleted"}` | 400 missing/wrong password; 401/403 token; 404 account; 409 last admin cannot be deleted; 500 |
| `POST /api/auth/forgot-password` | No | None | Required: `email` string. Sample: `{"email":"student@example.com"}` | `{"message":"Reset code sent to st***@example.com","maskedEmail":"st***@example.com"}` | 400 missing email; 404 account not found; 503 email delivery failure; 500 |
| `POST /api/auth/reset-password` | No | None | Required: `email` string, `code` string, `newPassword` string (min 6). Sample: `{"email":"student@example.com","code":"123456","newPassword":"NewPassword2"}` | `{"message":"Password reset successfully. You can now login with your new password."}` | 400 missing fields or short password; 401 invalid/expired code; 404 user; 500 |
| `POST /api/auth/create-admin` | No (secret required) | None | Required: `email` string, `full_name` string, `password` string (min 6), `adminSecret` string. Optional: `phone` string. Sample: `{"email":"admin@example.com","full_name":"Hostel Admin","password":"AdminPass1","phone":"+254712345678","adminSecret":"<ADMIN_SECRET>"}` | HTTP 201 `{"message":"Admin account created successfully"}` | 400 invalid fields/duplicate user; 403 invalid admin secret; 429 rate limited; 500 |

## Rooms

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/rooms` | Yes | None | No body | Array of room rows (`rooms.*`) plus `occupied` approved-booking count | 401/403 token; 500 |
| `POST /api/rooms` | Yes; admin | None | Required: `room_number` string, `hostel` string (`Boys`\|`Girls`), `campus` string, `price` number. Optional: `room_type` string (defaults to `quad`), `capacity` integer (defaults to 4). Sample: `{"room_number":"A101","hostel":"Boys","campus":"Main","room_type":"quad","capacity":4,"price":30000}` | HTTP 201 `{"message":"Room added"}` | 400 missing/invalid required fields or duplicate room; 401/403 token/role; 500 |
| `PUT /api/rooms/:id` | Yes; admin | Path: `id` positive integer | Optional fields: `room_number` string, `hostel` `Boys`\|`Girls`, `campus` string, `room_type` string, `capacity` integer 1–8, `price` number ≥0, `status` `available`\|`full`\|`maintenance`. Sample: `{"price":32000,"status":"available"}` | `{"message":"Room updated"}` | 400 invalid id/fields; 401/403 token/role; 500 |
| `DELETE /api/rooms/:id` | Yes; admin | Path: `id` positive integer | No body | `{"message":"Room deleted"}` | 400 invalid id or room has active bookings; 401/403; 500 |
| `GET /api/rooms/:id/beds` | Yes | Path: `id` positive integer | No body | Array of bed rows (`id`, `room_id`, `bed_number`, `position`, `status`, etc.) | 400 invalid id; 401/403 token; 500 |

## Bookings

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/bookings/active` | Yes | None | No body | Active booking object with room/bed details, or `null` | 401/403; 500 |
| `GET /api/bookings/status` | Yes | None | No body | `{"open":true}` or `{"open":false}` | Handler falls back to `{"open":true}` if status lookup fails |
| `PUT /api/bookings/toggle` | Yes; admin | None | `open` boolean (expected; not validated). Sample: `{"open":true}` | `{"open":true,"message":"Booking opened"}` (or closed) | 401/403; 500 |
| `POST /api/bookings` | Yes | None | `room_id` integer required in practice; `bed_id` integer optional; `semester` string optional (uses active period or current semester); `arrival_date` string `YYYY-MM-DD` optional. Sample: `{"room_id":1,"bed_id":1,"semester":"May-Aug 2026","arrival_date":"2026-06-01"}` | HTTP 201 `{"message":"Booking request submitted"}` | 400 booking closed, existing booking, invalid/past date, unavailable room/bed or closed period; 404 room; 401/403; 500 |
| `GET /api/bookings/my` | Yes | None | No body | Array of caller's bookings with room and bed details | 401/403; 500 |
| `GET /api/bookings/all` | Yes; admin | None | No body | Array of all bookings with student, room, bed, and latest payment status/amount | 401/403; 500 |
| `PUT /api/bookings/:id/status` | Yes; admin | Path: `id` positive integer | Required: `status` string (`approved`\|`rejected`). Required on rejection: `reason` string length 5–500. Sample: `{"status":"rejected","reason":"Room capacity is full."}` | `{"message":"Booking approved"}` or `{"message":"Booking rejected","reason":"..."}` | 400 invalid id/status/reason or room full; 404 booking; 401/403; 500 |
| `PUT /api/bookings/:id/suspend` | Yes; admin | Path: `id` positive integer | `suspended` boolean expected; `reason` string optional. Sample: `{"suspended":true,"reason":"Outstanding account issue"}` | `{"message":"Booking suspended"}` or unsuspended | 400 invalid id/input; 404 approved booking not found; 401/403; 500 |
| `DELETE /api/bookings/:id` | Yes; caller must own booking | Path: `id` positive integer | No body | `{"message":"Booking cancelled"}` | 400 only pending bookings can be cancelled; 404 booking not found; 401/403; 500 |

## Payments

The STK flow requires an approved booking belonging to the caller. The API requests a fixed KES 12,000 deposit. `MPESA_CALLBACK_URL` must be a publicly reachable callback URL for the deployed environment.

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `POST /api/payments/admin/verified` | Yes; admin | None | Required: `booking_id` positive integer, `amount` positive decimal number (up to 2 decimals), `mpesa_code` string 6–20 alphanumeric chars, `verified` boolean `true` (string `"true"` is also accepted). Sample: `{"booking_id":1,"amount":12000,"mpesa_code":"QWE1234567","verified":true}` | HTTP 201 `{"message":"Verified M-Pesa payment recorded","paymentId":1}` | 400 invalid details/amount/receipt; 403 role; 409 inactive booking or duplicate receipt; 401 token; 500 |
| `POST /api/payments/stk-push` | Yes | None | Required: `phone` string digits only, Kenyan M-Pesa number; `booking_id` positive integer or digit string. Sample: `{"phone":"0712345678","booking_id":1}` | `{"message":"STK push sent","amount":12000,"checkoutRequestId":"ws_CO_..."}` | 400 malformed body, no approved booking, invalid Kenyan number, already confirmed, or provider rejects; 401/403; 502 Safaricom/provider request failure; 500 payment recording failure |
| `POST /api/payments/stk-query` | Yes | None | Required: `checkout_request_id` string returned by STK push. Sample: `{"checkout_request_id":"ws_CO_..."}` | `{"status":"confirmed","message":"Payment confirmed by Safaricom"}`, `{"status":"failed","message":"..."}`, or `{"status":"pending","message":"..."}` | 400 missing id; 404 checkout request not found/does not belong to caller; 401/403. Safaricom query errors generally return HTTP 200 with a pending status/message. |
| `POST /api/payments/callback` | No token (Safaricom callback) | None | Required shape: `Body.stkCallback` object. Sample: `{"Body":{"stkCallback":{"MerchantRequestID":"mr-1","CheckoutRequestID":"ws_CO_...","ResultCode":0,"ResultDesc":"The service request is processed successfully","CallbackMetadata":{"Item":[{"Name":"MpesaReceiptNumber","Value":"QWE1234567"}]}}}}` | `{"ResultCode":0,"ResultDesc":"Accepted"}` | 400 invalid payload; 403 rejected source IP in production; handler returns accepted on processing errors to acknowledge callback |
| `GET /api/payments/my` | Yes | None | No body | Array of caller's payment rows with room/hostel/semester | 401/403; 500 |
| `GET /api/payments/all` | Yes; admin | None | No body | Array of all payment rows with room, student and booking details | 401/403; 500 |

## Notifications

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/notifications` | Yes | None | No body | Array of caller's notification rows | 401/403; 500 |
| `POST /api/notifications/send` | Yes; admin | None | Required: `user_id` positive integer; `message` nonblank string. Sample: `{"user_id":1,"message":"Please contact the hostel office."}` | `{"message":"Sent"}` | 400 missing user/message; 401/403; 500 |
| `PATCH /api/notifications/read` | Yes | None | No body (body is ignored). Sample: `{}` | `{"message":"All notifications marked as read"}` | 401/403; 500 |

## Notices

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/notices` | Yes | None | No body | Array of visible notice rows with `author`; students see all/hostel-targeted notices for their active booking, admins see all | 401/403; 500 |
| `POST /api/notices` | Yes; admin | None | Required: `title` nonblank string, `message` nonblank string. Optional: `target` string (`all`\|`boys`\|`girls`; other values default to `all`). Sample: `{"title":"Water outage","message":"Water service is interrupted until 4 PM.","target":"all"}` | HTTP 201 `{"message":"Notice posted"}` | 400 missing title/message; 401/403; 500 |
| `DELETE /api/notices/:id` | Yes; admin | Path: `id` positive integer | No body | `{"message":"Notice deleted"}` | 400 invalid id; 401/403; 500 |

## Health

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/health` | Yes | None | No body | Health profile object, or `null` when not created | 401/403; 500 |
| `POST /api/health` | Yes | None | Optional: `medical_conditions` string, `dietary_restrictions` string. Sample: `{"medical_conditions":"Asthma","dietary_restrictions":"Peanuts"}` | `{"message":"Health profile saved"}` | 401/403; 500 (may include the thrown error message) |

## Operations

All paths start `/api/operations`. Student-scoped list operations return the caller's records; admins can see/manage all where indicated. Validation failures generally return `400 {"error":"<first validation message>"}`; missing records are `404 {"error":"Record not found"}`; service conflicts use the listed status and `{"error":"..."}`.

| Method and full path | Token / admin | Path and query params | Body fields, types, requiredness; Postman sample | Success response | Possible errors |
|---|---|---|---|---|---|
| `GET /api/operations/students` | Yes; admin | Query: `search` optional string | No body | Array of student summaries (`id,reg_no,email,phone,full_name,role,campus,course,created_at,current_room`) | 400 invalid search; 401/403; 500 |
| `PATCH /api/operations/students/:id/role` | Yes; admin | Path: `id` positive integer | Required: `role` string (`student`\|`admin`). Sample: `{"role":"student"}` | `{"message":"User role updated"}` or `{"message":"User already has this role"}` | 400 invalid id/role or changing own role; 401/403; 404 user; 500 |
| `GET /api/operations/stays` | Yes; admin | None | No body | Array of approved-stay summaries including resident, room/bed, dates, and confirmed payment count | 401/403; 500 |
| `GET /api/operations/my-stay` | Yes | None | No body | `{"stay":<active stay summary or null>}` | 401/403; 500 |
| `GET /api/operations/history` | Yes; admin | Query: `search` optional string | No body | Array of completed stay summaries (max 1000) | 400 invalid search; 401/403; 500 |
| `PUT /api/operations/stays/:id/check-in` | Yes; admin | Path: `id` booking ID, positive integer | No body | `{"message":"Resident checked in"}` | 400 invalid id; 409 needs approved, paid, not-yet-checked-in booking; 401/403; 500 |
| `PUT /api/operations/stays/:id/temporary-access` | Yes; admin | Path: `id` booking ID, positive integer | Required: `reason` string 5–500 chars. Optional: `access_type` string (`temporary`\|`mercy`, defaults `temporary`). Sample: `{"reason":"Payment confirmation is pending.","access_type":"temporary"}` | `{"message":"Resident checked in"}`; payment remains due and action is audited | 400 invalid fields; 409 booking not eligible/already checked in; 401/403; 500 |
| `PUT /api/operations/stays/:id/check-out` | Yes; admin | Path: `id` booking ID, positive integer | No body | `{"message":"Resident checked out"}` | 400 invalid id; 409 resident not checked in/already checked out; 401/403; 500 |
| `PUT /api/operations/stays/:id/dates` | Yes; admin | Path: `id` booking ID, positive integer | Optional: `arrival_date` ISO date or null, `departure_date` ISO date or null. Sample: `{"arrival_date":"2026-06-01","departure_date":"2026-09-30"}`. Omitted values are passed as null. | `{"message":"Stay dates updated"}` | 400 invalid id/date/order or stay over 4 months; 401/403; 404 active approved stay; 500 |
| `GET /api/operations/checkout-requests` | Yes | None | No body | Array of checkout requests; admin gets all, student gets own | 401/403; 500 |
| `POST /api/operations/checkout-requests` | Yes | None | Optional: `reason` string, max 1000 chars. Sample: `{"reason":"I am leaving campus at the end of the term."}` | `{"id":1,"message":"Checkout request submitted for staff review"}` | 400 invalid reason; 401/403; 409 no active checked-in stay/already pending request; 500 |
| `PATCH /api/operations/checkout-requests/:id/decision` | Yes; admin | Path: `id` positive integer | Required: `decision` string (`approved`\|`declined`). Optional: `note` string max 1000. Optional: `clearance_confirmed` boolean; must be `true` when approving. Sample: `{"decision":"approved","note":"Room inspected.","clearance_confirmed":true}` | `{"message":"Checkout request approved"}` or declined | 400 invalid id/decision/fields or missing clearance confirmation; 401/403; 404 pending request; 409 stay no longer active; 500 |
| `GET /api/operations/periods` | Yes; admin | None | No body | Array of hostel-period rows | 401/403; 500 |
| `POST /api/operations/periods` | Yes; admin | None | Required: `campus` string (1–100), `hostel` string (`Boys`\|`Girls`), `semester` string (1–80), `opens_on` ISO date, `duration_months` integer 1–4. Sample: `{"campus":"Main","hostel":"Boys","semester":"May-Aug 2026","opens_on":"2026-05-01","duration_months":4}` | `{"id":1,"closes_on":"2026-09-01","message":"Hostel period scheduled"}` | 400 invalid data; 401/403; 409 overlaps existing period; 503 scheduling lock unavailable; 500 |
| `GET /api/operations/requests` | Yes | None | No body | Array of service/maintenance requests; student-scoped, admin gets all | 401/403; 500 |
| `POST /api/operations/requests` | Yes; checked-in resident | None | Required: `title` string 3–160, `description` string 5–5000. Optional: `request_type` (`maintenance`\|`complaint`, defaults `maintenance`), `priority` (`low`\|`normal`\|`high`\|`urgent`, defaults `normal`), `room_id` positive integer. Sample: `{"request_type":"maintenance","title":"Leaking tap","description":"The bathroom tap is leaking continuously.","priority":"normal","room_id":1}` | `{"id":1,"message":"Request submitted"}` | 400 invalid fields; 401/403; 403 no active checked-in room or room mismatch; 500 |
| `PATCH /api/operations/requests/:id` | Yes; admin | Path: `id` positive integer | Required: `status` (`open`\|`in_progress`\|`resolved`\|`closed`). Optional: `resolution` string max 5000, `assigned_to` positive integer or null. Sample: `{"status":"resolved","resolution":"Replaced the tap.","assigned_to":2}` | `{"message":"Request updated"}` | 400 invalid fields; 401/403; 404 request; 500 |
| `GET /api/operations/visitors` | Yes | None | No body | Array of visitor records; student-scoped, admin gets all | 401/403; 500 |
| `POST /api/operations/visitors` | Yes; checked-in resident | None | Required: `visitor_name` string 2–120, `purpose` string 2–255. Optional: `visitor_phone` string max 30. Sample: `{"visitor_name":"Alex Doe","visitor_phone":"+254712345678","purpose":"Family visit"}` | `{"id":1,"message":"Visitor registered"}` | 400 invalid fields; 401/403; 403 no active checked-in room; 500 |
| `PATCH /api/operations/visitors/:id/status` | Yes; admin | Path: `id` positive integer | Required: `status` (`checked_in`\|`checked_out`\|`cancelled`). Sample: `{"status":"checked_in"}` | `{"message":"Visitor status updated"}` | 400 invalid id/status; 401/403; 404 visitor; 409 disallowed status transition; 500 |
| `GET /api/operations/inspections` | Yes; admin | None | No body | Array of inspection rows including room and inspector information | 401/403; 500 |
| `POST /api/operations/inspections` | Yes; admin | None | Required: `room_id` positive integer, `condition_status` (`good`\|`attention_required`\|`uninhabitable`), `cleanliness` (`clean`\|`needs_cleaning`\|`poor`), `safety_status` (`clear`\|`issue_found`). Optional: `notes` string max 5000. Sample: `{"room_id":1,"condition_status":"good","cleanliness":"clean","safety_status":"clear","notes":"No issues found."}` | `{"id":1,"message":"Room inspection recorded"}` | 400 invalid fields; 401/403; 500 |
| `DELETE /api/operations/inspections/:id` | Yes; admin | Path: `id` positive integer | No body | `{"message":"Room inspection deleted"}` | 400 invalid id; 401/403; 404 inspection; 500 |
| `PATCH /api/operations/rooms/:id/status` | Yes; admin | Path: `id` positive integer | Required: `status` (`available`\|`full`\|`maintenance`). Sample: `{"status":"maintenance"}` | `{"message":"Room status updated"}` | 400 invalid id/status; 401/403; 404 room; 500 |
| `GET /api/operations/payments/:id/receipt` | Yes; owner or admin | Path: `id` positive payment ID | No body | Receipt object `{id,amount,payment_method,mpesa_code,payment_date,status,booking_id,semester,full_name,reg_no,room_number,hostel,campus}` | 400 invalid id; 401/403; 404 not found/not owned; 500 |
| `GET /api/operations/balances` | Yes | None | No body | Array of balances (`booking_id,user_id,semester,arrival_date,departure_date,full_name,reg_no,room_number,hostel,amount_due,amount_paid,balance`); students get own, admin gets all | 401/403; 500 |
| `GET /api/operations/reports` | Yes; admin | Query: `from` optional ISO date, `to` optional ISO date | No body | `{"bookings":[...],"rooms":{...},"payments":{...},"requests":[...],"visitors_checked_in":0,"from":"YYYY-MM-DD","to":"YYYY-MM-DD","payment_rows":[...],"balance_rows":[...]}` | 400 invalid or reversed range; 401/403; 500 |
| `GET /api/operations/audit` | Yes; admin | None | No body | Array of audit rows with `actor_name` and `actor_email` | 401/403; 500 |

## Suggested end-to-end test order

Use a test database and M-Pesa sandbox; do not use a production payment flow for a Postman smoke test.

1. `GET /api/ping`, then `GET /api/status`.
2. Create an initial admin using `POST /api/auth/create-admin` and your `ADMIN_SECRET`; login with `POST /api/auth/login` and save its `token` as `adminToken`.
3. As admin, `POST /api/rooms` to create a room. `GET /api/rooms` and `GET /api/rooms/:id/beds` to copy a room/bed ID.
4. Register a student with `POST /api/auth/register`, or use an existing student; login and save the token as `studentToken`.
5. If a hostel period exists, verify it is open with `GET /api/operations/periods`; create an active period with `POST /api/operations/periods` if needed. `GET /api/bookings/status` should report open.
6. As the student, `POST /api/bookings` with the room ID (and optional available bed ID), then `GET /api/bookings/my`.
7. As admin, `GET /api/bookings/all`, then `PUT /api/bookings/:id/status` with `{"status":"approved"}`.
8. As the student, call `POST /api/payments/stk-push` with the booking ID and Kenyan phone. Use its `checkoutRequestId` in `POST /api/payments/stk-query`; M-Pesa may remain pending until the test STK prompt is approved or cancelled.
9. Verify `GET /api/payments/my` and `GET /api/operations/balances`. A manual payment endpoint is admin-only and must only be used after actual receipt verification.
10. Admin can then check in via `PUT /api/operations/stays/:id/check-in` after confirmed payment; test health, notices, notifications, service requests, and checkout endpoints as needed.

## Reported Render payment errors

- An unauthenticated `POST` to the deployed `/api/payments/stk-query` returns `401 Access token required`, confirming that the route is mounted. An authenticated `404 Payment request not found` means there is no saved checkout for that user and ID; the server only stores a checkout after Safaricom accepts the STK request.
- A failed replacement STK request now leaves the previous pending checkout record intact. Deploy the updated client as well so polling stops on an HTTP error instead of repeating a 404.
- The handler maps Safaricom STK-push provider failures to HTTP 502. Check Render logs for `STK PUSH ERROR` and its `stage`, `providerStatus`, `providerCode`, and provider message; verify the Daraja sandbox/live credentials, environment selection, shortcode/passkey, and publicly reachable callback URL are from the same environment. No live STK request was sent during diagnosis.
