# IMovies — Engineering Hard Rules & Coding Guidelines
> **CRITICAL**: Every AI agent, engineer, and contributor must strictly follow these rules. Do not bypass or relax any rule without explicit user authorization.

---

## 1. Roles & Scope
- There are **only two roles**: `USER` and `ADMIN`.
- There is **no STAFF role**. Counter tasks (verification, manual cancellations, refunds) are handled under `ADMIN`.
- Route prefixes define authorization decisions:
  - `/api/public/*` — Publicly accessible (no auth required)
  - `/api/user/*` — `requireAuth`, roles: `USER` or `ADMIN`, status must be `ACTIVE`
  - `/api/admin/*` — `requireAuth`, role must be `ADMIN`

---

## 2. Money & Trust (Zero Client Trust)
1. **Never trust the client for money.** Booking requests accept only `{ showId, seatLabels[], couponCode? }`. Price, fee, discount, and total are computed strictly **server-side** from `ShowSeat.price` and the Coupon document. Client-supplied amounts are forbidden.
2. **Integer paise everywhere:** All monetary values are stored in integer paise (1 INR = 100 paise) to prevent floating-point inaccuracies.
3. **Immutable booking-time snapshots:** Store snapshotted `subtotal`, `discount`, `convenienceFee`, and `total` on the `Booking` document along with seat category/price snapshot. Subsequent pricing changes must never alter past bookings.
4. **Order creation sequencing:** Razorpay order is created **after** the database seat hold transaction is committed. Never make external payment gateway API calls inside a MongoDB transaction.
5. **Idempotent Webhooks:** Verify Razorpay HMAC signature on raw body. Check idempotency using `rawEventId` or `razorpayPaymentId`. Return `503` if `RAZORPAY_WEBHOOK_SECRET` is unset.
6. **Atomic confirmation:** On `payment.captured`, update `Payment` to `SUCCESS`, `Booking` to `CONFIRMED`, and all `ShowSeat` records to `BOOKED` inside a **single MongoDB transaction**.
7. **Late capture safety:** If a capture event arrives after hold expiration, check seat availability inside a transaction. If still free, confirm booking. If re-booked by someone else, trigger auto-refund and record refund status. Never silently drop captured money.

---

## 3. Seat Concurrency & Hold Engine
1. **Atomic conditional update inside transaction:** Seat holds must use:
   ```javascript
   updateMany(
     {
       showId,
       seatLabel: { $in: seatLabels },
       $or: [
         { status: 'AVAILABLE' },
         { status: 'HELD', holdExpiresAt: { $lt: now } }
       ]
     },
     {
       $set: { status: 'HELD', heldBy: userId, holdExpiresAt }
     }
   )
   ```
   If `modifiedCount !== seatLabels.length`, abort transaction and respond with `409 Conflict`.
2. **Single source of truth:** One centralized service `seatAvailability.service.js` determines seat availability across seat-map API, hold requests, payment verification, and admin views.
3. **Immediate expiration logic:** An expired hold (`status: 'HELD'` and `holdExpiresAt < now`) is treated as free immediately across all read and write queries. Do not wait for cron.
4. **Scheduled cleanup:** In-process `node-cron` runs every minute to tidy up orphaned records (`HELD` -> `AVAILABLE`, `AWAITING_PAYMENT` -> `EXPIRED`).
5. **Explicit release guard:** Releasing a hold must guard in the query: `updateOne({ _id, heldBy: userId, status: 'HELD' })`. Closing the browser/popup must not release seats.
6. **Single live hold per show per user:** A user may hold at most one active unpaid booking per show. Attempting a second hold responds with `409` and machine code `UNPAID_HOLD` with remaining minutes and an option to release previous hold.
7. **No past-show booking:** Shows cannot be booked once started (or past start time minus configured grace minutes).
8. **Referential integrity:** Screens, seat layouts, or shows with existing booking history cannot be deleted (must return `409 Conflict`).

---

## 4. Time & Dates (IST Asia/Kolkata Standard)
1. Server runs in UTC; true instants (UTC ISO / Date objects) are stored in MongoDB.
2. **All business logic and display are in Indian Standard Time (IST / Asia/Kolkata).**
3. Never use native local helpers like `setHours(0,0,0,0)` or `toISOString().slice(0,10)`.
4. Use the dedicated helper module `utils/ist-date.js` for all date ranges, day groupings, and formatting (`DD MMM YYYY, hh:mm a`).

---

## 5. API Conventions & Error Handling
1. **HTTP Status Codes:**
   - `400 Bad Request` — Validation failure (Zod)
   - `401 Unauthorized` — Missing or invalid authentication token
   - `403 Forbidden` — Authenticated but insufficient permissions or account suspended
   - `404 Not Found` — Entity does not exist
   - `409 Conflict` — State conflict (seat taken, duplicate unique key, unpaid hold exists)
   - `422 Unprocessable Entity` — Domain business rule violated
   - `429 Too Many Requests` — Rate limit exceeded
   - `500/503` — Unexpected server or external service error (never return 500 for expected conflicts)
2. **Uniform Error Response:**
   ```json
   {
     "error": "Human readable sentence",
     "code": "OPTIONAL_MACHINE_CODE"
   }
   ```
3. All user-facing error strings must be centralized in `src/constants/messages.js`.
4. Blank optional strings must be normalized to `undefined` (or omitted) before database persistence to preserve sparse/unique indexes.
5. All list endpoints must support pagination (`page`, `limit`) with an enforced maximum limit.
6. Secrets (`passwordHash`, JWT secrets, API keys) must never be returned in API responses or written to logs.

---

## 6. Process & Environment Safety
1. **Fail loudly on missing configuration:** Backend and CLI scripts must fail immediately on startup if `MONGODB_URI` or required secrets are missing.
2. **Database host logging:** On server startup and script execution, log `NODE_ENV` and connected MongoDB host/database name.
3. **Seed protection:** Seed script must be idempotent and must reject execution if database name indicates production.
4. **Audit logging:** Admin mutations must create an `AuditLog` entry capturing actor, action, target entity, before/after snapshot, IP, and timestamp.
5. **Shared UI primitives:** UI destructive actions must use a shared `ConfirmDialog` component, never native `window.confirm()`.
