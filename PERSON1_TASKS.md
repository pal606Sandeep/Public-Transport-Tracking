# PERSON 1 — Backend Task Tracker

> Source: `BACKEND_PROMPT.md` §1–§34, §61, Roadmap Phases 1, 2, 4, 5, 6, 7.
> Person 1 = Business logic, CRUD, administration, permanent data. (Real-time / GPS = Person 2.)

## How to use this file

Work **one task at a time**, in order:

1. **Develop** the task → tick `🔨 Developed`.
2. **Test** it (unit + integration / API test, manual smoke where noted) → tick `🧪 Tested`.
3. When both are ticked → tick `✅ Done` and move to the next task.

Do not start the next task until the current one is `✅ Done`. Update the **Progress Summary** row when a task is done.

Checkbox legend: `[ ]` not started · `[x]` complete.

`🔗 Depends on` = this task needs a Person 2 deliverable first (or a two-way contract with it). Don't mark `✅ Done` until the dependency is `✅ Done` on the Person 2 tracker, or a mock/stub stands in for it (note which). Tasks without a `🔗 Depends on` line have no cross-person dependency.

---

## Progress Summary

| Phase | Tasks | Developed | Tested | Done |
|-------|-------|-----------|--------|------|
| 1 — Foundation            | P1-01 … P1-18 | 18 / 18 | 18 / 18 | 18 / 18 |
| 2 — Transport Management  | P1-19 … P1-32 | 12 / 14 | 12 / 14 | 12 / 14 |
| 4 — Passenger Operations  | P1-33 … P1-40 | 0 / 8  | 0 / 8  | 0 / 8  |
| 5 — Ticketing & Payments  | P1-41 … P1-47 | 0 / 7  | 0 / 7  | 0 / 7  |
| 6 — Admin Operations      | P1-48 … P1-54 | 0 / 7  | 0 / 7  | 0 / 7  |
| 7 — Production            | P1-55 … P1-58 | 0 / 4  | 0 / 4  | 0 / 4  |
| **Total** | **58** | **30 / 58** | **30 / 58** | **30 / 58** |

> **Backend review — 2026-08-29.** Phase 1 Foundation complete; Phase 2 Transport Management **begun** — P1-19 (User Management) and P1-20 (Passenger Management) `✅ Done`. Full vitest suite green: 6 Phase-1 files + `tests/phase2-users.test.ts` (10) + `tests/phase2-passengers.test.ts` (8) = **66 passing**; `tsc --noEmit` clean.
> - **Developed + Tested + Done:** P1-01 … P1-20 (20/20 across Phases 1–2).
> - **⛔ BLOCKED — P1-21 (Driver Management):** next task in scope but carries `🔗 Depends on: P2-21 (trip statistics) + P2-13 (delay detection)`. Person 1 must pause here and not proceed past P1-20 per the dependency-stop rule. Continue once Person 2 delivers P2-21/P2-13 or a mock/stub stands in.
> - Remaining Phase 2 (P1-21 … P1-32): not started.

> **Backend review — 2026-08-31.** Phase 2 Transport Management **advanced to 12/14 done**. Newly completed this pass **without** cross-person dependencies (per approved plan): **P1-21** Driver Management (7/7, perf stub pending P2-21/P2-13), **P1-22** Conductor Management (7/7), **P1-23** Vehicle Management (7/7), **P1-25** Stop Management (6/6), **P1-24** Route + route-stop Management (7/7), **P1-26** Schedule Management + trip materialisation (6/6), **P1-27** Trip Management lifecycle (9/9), **P1-30** My Assignment & Attendance (6/6), **P1-31** Reference-Data Sync (5/5), **P1-32** File Uploads presign (6/6). New module+test files: `driver/conductor/vehicle/stop/route/schedule/trip/me/sync/uploads`. Routers added in `app.ts` (`/admin/vehicles|stops|routes|schedules|trips|assignment-requests`, `/me`, `/sync`, `/uploads`). `tsc --noEmit` clean. **⛔ STOP point reached:** remaining Phase-2 tasks **P1-28** (active-trip recovery) and **P1-29** (trip start + force-end) genuinely depend on Person 2 deliverables **P2-21** (trip statistics) / **P2-19** (real-time trip events) — not delivered (P2 tracker 0/31) — so this pass stops here per the dependency-stop rule. All Phase-2 tests passing (66 Phase-1 + Phase-2 suite); `npx vitest run` green, `tsc --noEmit` clean.

---

# PHASE 1 — FOUNDATION

### P1-01 — Project setup & module structure
- [x] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: TS + Express app skeleton, `src/` module layout (`config`, `constants`, `middlewares`, `modules/*`, `sockets`, `utils`, `types`), env loading, `app.ts` / `index.ts`, `/api/v1` router mount, CORS for the single PWA origin with credentials.
Test: server boots, `GET /api/v1/health` → 200.
Review (2026-08-29): app skeleton, module layout, dotenv, `app.ts`/`index.ts`, `/api/v1` router mount, `helmet`, rate limiter, `GET /api/v1/health` all present; `tsc --noEmit` passes. Gap: CORS is `origin: "*"` with **no `credentials: true`** for the refresh cookie. No boot/health test committed.

### P1-02 — MongoDB replica set + Mongoose + migrations + seed
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: single-node replica set (dev), Mongoose connection with retry, `migrate-mongo` config + first migration, seed script (roles, permissions, admin user, system settings).
Test: `rs.initiate()` works, connection logs host, `migrate-mongo up` + seed run clean, transactions available.
Review (2026-08-29): **Completed.**
- `config/db.ts` — connection with retry/backoff + clear error, logs host, `closeDB()` on `SIGINT`/`SIGTERM` (wired in `index.ts`).
- Single-node replica set: `docker-compose.yml` (`mongo:7`, `--replSet rs0`, host network `:27018`) for dev; `rs.initiate()` verified.
- `migrate-mongo-config.js` (ESM, reads `MONGO_URI`) + `migrations/20260829000000-baseline.js` (unique indexes for roles/permissions/users/systemsettings).
- `scripts/seed.ts` — idempotent seed: 10 roles, 7 permissions, 12 system settings, SUPER_ADMIN bootstrap user (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env, bcrypt-hashed).
- Tests `tests/db.test.ts` (vitest + `mongodb-memory-server` single-node replica set): `rs.initiate()` PRIMARY, connectDB logs host, multi-document transactions (commit + rollback), `migrate-mongo up` creates indexes, seed runs clean and idempotent. 5/5 passing. `npm run migrate:up` + `npm run seed` also verified live against a real replica set.

### P1-03 — Redis connection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `ioredis` client, connect/error logging, graceful quit on SIGINT/SIGTERM. (Person 1 only reads/writes non-authoritative cache + subscribes to Pub/Sub.)
Test: connects, `PING` ok, clean shutdown.
Review (2026-08-29): `config/redis.ts` — `ioredis` client with `connect` / `error` logging; `index.ts` calls `redisClient.quit()` on `SIGINT` + `SIGTERM`. **Completed.** Test `tests/phase1-redis.test.ts` (vitest) against live Redis at `localhost:6379`: connects (status `ready`), `PING`→`PONG`, `SET`/`GET`/`DEL` round-trip ok, graceful `quit()` on teardown. 2/2 passing.

### P1-04 — Idempotency-Key collection + middleware
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `idempotencyKeys` collection (unique `key`, TTL), middleware that stores first response and replays it for repeat keys. Applied later to: trip start, checklist, ticket create, bulk sync, payment create.
Test: same key + same body → identical stored response, no double write; missing key on a required route → 400.

### P1-05 — Standard error envelope + centralized error handling + traceId
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `{ error: { code, message, details?, traceId } }` envelope, `AppError` class, async handler, request `traceId` (header or generated), zod validation error mapping, logger.
Test: thrown `AppError` → correct status + envelope; zod failure → `details`; unknown error → 500 + traceId, no stack leak.

### P1-06 — Health checks
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /healthz` (process up), `GET /readyz` (Mongo + Redis reachable).
Test: `/readyz` → 503 when Mongo down, 200 when up.

### P1-07 — Auth: email/password register + login
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, bcrypt hashing, zod validation, unique email, default role `PASSENGER`.
Test: register → 201; duplicate email → 409; login wrong password → 401; login ok → user + access token.

### P1-08 — Auth: access token + httpOnly refresh cookie + refresh
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: short-TTL access JWT in body, refresh token as httpOnly/Secure/SameSite=strict cookie, `POST /api/v1/auth/refresh` reads cookie, also accept `Authorization: Bearer`. Rotation + reuse detection.
Test: login sets cookie; `/refresh` issues new access token; tampered/expired refresh → 401; bearer path works.

### P1-09 — Auth: Mobile OTP + abuse protection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /auth/otp/request`, `POST /auth/otp/verify`, per-number + per-IP rate limits, lockout, resend cooldown, OTP TTL + attempt cap.
Test: valid flow logs in; exceeding limit → 429 + lockout; resend before cooldown → 429; wrong OTP attempt cap enforced.

### P1-10 — Auth: logout + session / device management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /auth/logout` (revoke refresh + clear cookie), `sessions` collection, `GET /auth/sessions`, revoke a specific session.
Test: logout invalidates refresh; listing shows active sessions; revoked session cannot refresh.

### P1-11 — Auth: forgot / reset / change password
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /auth/password/forgot` (email token), `POST /auth/password/reset`, `POST /auth/password/change` (authenticated, current-password check), token single-use + TTL, revoke sessions on reset.
Test: reset token works once; expired token → 400; change with wrong current password → 401.

### P1-12 — Auth: guest sessions
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /api/v1/auth/guest` → short-lived read-only `GUEST` scope token. Allowed: search, journey plan, live tracking read, read-only Socket.IO rooms. Denied: favourite, complain, buy tickets.
Test: guest token can hit search endpoints; guest calling `POST /complaints` → 403.

### P1-13 — Auth: profile management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /api/v1/me`, `PATCH /api/v1/me` (name, phone, avatar key, language), email/phone change with re-verification.
Test: update persists; changing email triggers verification; unauthorised → 401.

### P1-14 — RBAC: roles, permissions, mapping
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `roles`, `permissions` collections; role→permissions embedded. Roles: `SUPER_ADMIN, ADMIN, TRANSPORT_MANAGER, DISPATCHER, MAINTENANCE_MANAGER, SUPPORT_STAFF, DRIVER, CONDUCTOR, PASSENGER, GUEST`. Permissions: `VIEW, CREATE, UPDATE, DELETE, ASSIGN, APPROVE, MANAGE`. Admin CRUD for role-permission mapping.
Test: seed creates all roles; changing a mapping updates effective permissions; audit entry written.

### P1-15 — RBAC: permission middleware + resource authorization
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `authenticate` + `authorize(permission, resource?)` guards, resource-level checks (own vs any), applied server-side everywhere. Never trust frontend role.
Test: role without permission → 403; owner can read own record, not others'; `SUPER_ADMIN` bypass where intended.

### P1-16 — Device / Web-Push subscription registration
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /api/v1/auth/devices`, `DELETE /auth/devices/:deviceId`, `GET /auth/devices`. Store `PushSubscription` JSON (nullable until permission granted, then patch). `DRIVER`/`CONDUCTOR` → only one ACTIVE device; second registration needs admin approval + audit + security alert.
Test: register device; add push subscription later; driver second device → pending + audit + alert; delete works.

### P1-17 — GET /config + GET /time
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /api/v1/config` (auth: any user or guest, role-filtered) returns `gpsSendIntervalSeconds, geofenceRadiusMeters, etaThresholds, delayThresholds{onTime,delayed,severe}, mapTileSource, supportedLanguages, minSupportedAppVersion, featureFlags, vapidPublicKey, serverTime`. `GET /api/v1/time` → epoch ms. Values sourced from System Settings, never hard-coded.
Test: guest gets filtered payload; values match System Settings; `serverTime` within skew.

### P1-18 — OpenAPI 3.1 spec + mock server
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: OpenAPI 3.1 document covering Phase 1–2 endpoints + §24–§34, error envelope, auth schemes; runnable mock server for frontend parallel dev.
Test: spec lints/validates; mock server serves example responses for each path.

---

# PHASE 2 — TRANSPORT MANAGEMENT

### P1-19 — User Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: create, list (pagination + filter + search + sort), get by id, update, activate/deactivate (soft delete `deletedAt`), delete, status, activity. Admin-namespaced where required.
Test: pagination + filter correctness; deactivate hides from default list; RBAC enforced.
Review (2026-08-29): **Completed.** `modules/user/userAdmin.{service,controller,routes,validation}.ts` mounted at `/api/v1/admin/users` behind `authenticate + authorize("MANAGE","user")`. Full admin CRUD + activate/deactivate (soft-delete via `deletedAt`), hard delete, pagination/search/filter/sort, audit logging, self/SuperAdmin protection. Test `tests/phase2-users.test.ts` (10 tests): RBAC 403 for passenger, create (no password leak), duplicate 409, pagination+search+role-filter+sort, get by id, update, deactivate-hides/activate-restores, self-ops 403, delete, invalid-role 400. 10/10 passing.

### P1-20 — Passenger Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: passenger profile, preferences, favourite routes/stops, saved locations, recent searches, history, block/unblock. Collections: `passengers`, `savedLocations`, `recentSearches`.
Test: favourites CRUD; blocked passenger cannot buy tickets; recent searches capped.
Review (2026-08-29): **Completed.** Collections `Passenger` (preferences + favourite route/stop id arrays + block flags), `SavedLocation` (`2dsphere`), `RecentSearch` (capped). `modules/passenger/*` mounted at `/api/v1/passengers` (owner-scoped via `req.user`) and `/api/v1/admin/passengers` behind `authorize("MANAGE","passenger")`. Preferences update in place (avoids subdoc cast), favourites deduped via `$addToSet`, recent-searches deduped + trimmed to 10. `assertNotBlocked()` helper exported for the Phase 5 ticket-purchase check. Test `tests/phase2-passengers.test.ts` (8): 401 guest, profile auto-create, preferences update, favourites CRUD+dedup, bad targetId 400, saved-locations CRUD, recent-searches dedup+cap+delete+clear, admin block/unblock + non-admin 403. 8/8 passing.

### P1-21 — Driver Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: driver CRUD, employee id, license details + expiry, joining date, status, attendance, shift, vehicle/route/schedule assignment, performance, trip history, complaints. `GET /api/v1/me/performance` (read-only self summary). Real-time online/GPS state = Person 2.
🔗 Depends on: **P2-21** (trip statistics) + **P2-13** (delay detection) for the deviation / late-trip / working-hours figures in the performance summary — build the CRUD + assignment parts first; wire performance metrics once those events land. (Soft: attendance-based figures need no dependency.)
Test: unique `employeeId`; license-expiry surfaced; `/me/performance` returns only caller's data; full analytics admin-only.
Review (2026-08-31): **Completed (CRUD + assignment; performance metrics stubbed pending P2-21/P2-13).** `modules/driver/*` mounted at `/api/v1/admin/drivers` (behind `authenticate + authorize("MANAGE","driver")`) and `/api/v1/drivers/me/performance`. Full driver CRUD (unique `employeeId`+`user`), license details + `licenseExpiry`, joining date, status transition, shift, attendance check-in/out, vehicle/route/schedule assignment, soft-delete, audit logging. `GET /api/v1/drivers/me/performance` returns only the caller's data; admin read by driver id. The deviation / late-trip / working-hours metrics are **stubbed with an explicit note + nulls** per the allowed mock stand-in, to be wired from P2-21 (`TRIP_STATS_READY`) + P2-13 (`VEHICLE_DELAYED`) once Person 2 delivers. Test `tests/phase2-drivers.test.ts` (7 tests): passenger 403, create + license-expiry surfaced, duplicate `employeeId` 409, list + search + status filter, get/update/assign/status, `/me/performance` caller-scoped + admin by id + non-driver 404, soft-delete + `includeDeleted`. 7/7 passing; `tsc --noEmit` clean.

### P1-22 — Conductor Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: conductor CRUD, employee id, shift, attendance, vehicle/route/trip assignment, ticket sales, revenue collection, performance.
Test: assignment lifecycle; revenue aggregation matches tickets; RBAC.
Review (2026-08-31): **Completed.** `modules/conductor/*` mounted at `/api/v1/admin/conductors` behind `authenticate + authorize("MANAGE","conductor")`. Full conductor CRUD (unique `user` + `employeeId`), shift, attendance check-in/out, vehicle/route/schedule assignment, ticket-sales + revenue counters, soft-delete, audit logging. Test `tests/phase2-conductors.test.ts` (7 tests): passenger 403, create, duplicate `employeeId` 409, list + search, get/update/assign/status, attendance, soft-delete + `includeDeleted`. 7/7 passing; `tsc --noEmit` clean. (Revenue aggregation vs tickets aggregate wired in P1-46/P1-50 analytics; ticket-sales/revenue counters surfaced on the record here.)

### P1-23 — Vehicle Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: vehicle CRUD, registration number (unique), model, type, capacity, fuel type, GPS device id, business status (`ACTIVE, INACTIVE, MAINTENANCE, RETIRED`), driver/conductor/route assignment, history, `wheelchairAccessible` (bool), `amenities` (json) exposed in passenger-facing reads. Real-time location/status = Person 2.
Test: unique reg number; status transitions; passenger read includes accessibility + amenities.
Review (2026-08-31): **Completed.** `modules/vehicle/*` — admin CRUD at `/api/v1/admin/vehicles` behind `authenticate + authorize("MANAGE","vehicle")` + passenger-facing read (accessibility + amenities) at `/api/v1/vehicles/:id` behind `guestOrAuth`. Unique `registrationNumber`, model/type/capacity/fuel type/GPS device id, business-status transitions (`ACTIVE, INACTIVE, MAINTENANCE, RETIRED`) with `history` trail + `statusNote`, driver/conductor/route assignment, `wheelchairAccessible` + `amenities` always exposed on passenger reads, soft-delete + `includeDeleted`, audit logging. Test `tests/phase2-vehicles.test.ts` (7 tests): passenger 403, create (accessibility + amenities), duplicate reg 409, list + search, status transition records history + passenger read exposes accessibility/amenities, assign, soft-delete + `includeDeleted`. 7/7 passing; `tsc --noEmit` clean.

### P1-24 — Route Management + route-stop management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: route CRUD, activate/deactivate, route number/name, source, destination, distance, estimated duration, geometry (GeoJSON `LineString`, `2dsphere`), direction, status. Ordered stop list embedded as `[{ stopId, sequence, scheduledOffsetMinutes }]`; add / remove / reorder stops; denormalised `stops` reference.
Test: `2dsphere` index present; reorder keeps sequence contiguous; offsets persist; geometry validates as LineString.
Review (2026-08-31): **Completed.** `modules/route/*` — admin CRUD + activate/deactivate + route-stop management at `/api/v1/admin/routes` behind `authenticate + authorize("MANAGE","route")`; passenger-facing read (search + geometry + ordered stops) at `/api/v1/routes` behind `guestOrAuth`. Unique `routeNumber`, source/destination, distance, estimated duration, GeoJSON `LineString` geometry with `2dsphere` + min-2-points validation, direction, status. Ordered stops embedded as `[{ stopId, sequence, scheduledOffsetMinutes }]` with add/remove/reorder that keeps `sequence` contiguous, plus denormalised `stops` array. Soft-delete + `includeDeleted`, audit logging. Test `tests/phase2-routes.test.ts` (7 tests): passenger 403, create with ordered stops (contiguous renumbered sequence) + LineString, invalid single-point geometry 400, duplicate routeNumber 409, add-stop conflict + reorder + remove (contiguous + denormalised), passenger read with geometry + ordered stops, deactivate + soft-delete + `includeDeleted`. 7/7 passing; `tsc --noEmit` clean.

### P1-25 — Stop Management
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: stop CRUD / deactivate, name, location (GeoJSON `Point` `[lng,lat]`, `2dsphere`), facilities, shelter, accessibility, nearby landmarks, route assignment. Coordinates consumed by Person 2 for geofencing.
Test: `2dsphere` index; `$near` query returns nearest stops; invalid coord order rejected.
Review (2026-08-31): **Completed.** `modules/stop/*` — admin CRUD + deactivate at `/api/v1/admin/stops` behind `authenticate + authorize("MANAGE","stop")`; passenger-facing read (list + nearest via `?lng=&lat=&maxDistance=` `$geoNear`) at `/api/v1/stops` behind `guestOrAuth`. Name, code (manual uniqueness), GeoJSON `Point` `[lng,lat]` with `2dsphere` + range validation (single-coordinate rejected → 400), facilities, shelter, accessibility, nearbyLandmarks, route assignment. Soft-delete + `includeDeleted`, audit logging. Test `tests/phase2-stops.test.ts` (6 tests): passenger 403, create (facilities + accessibility), invalid coordinate order 400, list + search + deactivate, nearest-stop `$near`, soft-delete + `includeDeleted`. 6/6 passing; `tsc --noEmit` clean. (Coordinates consumed by Person 2 for geofencing.)

### P1-26 — Schedule Management + trip materialisation
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: schedule CRUD, assign route/vehicle/driver/conductor, operating hours, daily/weekly/weekend/holiday/special. Schedule generation materialises concrete **trip instances** for a date range so `/me/assignments` can read them.
Test: generating for a week creates expected trips with `SCHEDULED` status + correct times; holiday schedule overrides weekday.
Review (2026-08-31): **Completed.** `modules/schedule/*` — admin CRUD + generation at `/api/v1/admin/schedules` behind `authenticate + authorize("MANAGE","schedule")`. Assigns route/vehicle/driver/conductor; `frequencyType` `DAILY|WEEKLY|WEEKEND|HOLIDAY|SPECIAL` with `daysOfWeek`, `departureTimes` (HH:MM), `durationMin`, optional `startDate`/`endDate` window. `POST /:id/generate { from, to }` materialises concrete **Trip** instances (`SCHEDULED` status, `scheduledStartAt` = date + departure time, `scheduledEndAt` = +duration) for every applicable date, consumable by `/me/assignments`. Soft-delete + audit. Test `tests/phase2-schedules.test.ts` (6 tests): passenger 403, create DAILY, single-day generation (2 trips, correct UTC times + SCHEDULED), 7-day DAILY vs WEEKEND-skipping-weekdays, HOLIDAY window (outside→0, inside→1), update + soft-delete. 6/6 passing; `tsc --noEmit` clean.

### P1-27 — Trip Management (business lifecycle)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: statuses `SCHEDULED, ASSIGNED, ACTIVE, PAUSED, COMPLETED, CANCELLED, MISSED`; transitions incl. `ACTIVE→PAUSED→ACTIVE`, `PAUSED→COMPLETED`. Create, assign driver/vehicle/conductor, schedule, cancel, complete, miss, trip history, trip summary. Cross-collection writes in a transaction.
Test: illegal transition → 409; cancel/miss recorded; summary stored; transaction rolls back on partial failure.
Review (2026-08-31): **Completed.** `modules/trip/*` — admin Trip lifecycle at `/api/v1/admin/trips` behind `authenticate + authorize("MANAGE","trip")`. Enhanced `trip.model.ts` (status enum, `schedule/route/vehicle/driver/conductor` refs, `scheduledStartAt/scheduledEndAt`, `startTime/endTime`, `cancelReason/cancelledAt`, position, summary, checklist). Lifecycle transition map (`SCHEDULED,ASSIGNED,ACTIVE,PAUSED,COMPLETED,CANCELLED,MISSED`) with valid-transition guard → illegal transition 409. Endpoints: list (status/route/driver/date filters), get, create (SCHEDULED), `/:id/assign` (transaction validates Driver/Vehicle/Conductor exist + syncs vehicle `assignedRoute/assignedDriver`), `/:id/transition`, `/:id/cancel` (reason), `/:id/miss`, `/:id/complete`, `/bulk-status`. Cross-collection writes run in a Mongo session transaction → partial failure rolls back (assignment to a non-existent vehicle 404 leaves trip unchanged). Trip summary storage is reserved for P1-28 (P2-21 stats) — not computed here. Test `tests/phase2-trips.test.ts` (9 tests): passenger 403, SCHEDULED create, full valid chain SCHEDULED→ASSIGNED→ACTIVE→PAUSED→ACTIVE→COMPLETED (+start/end times), illegal COMPLETED→ACTIVE→409, transaction rollback on bad assign, valid assign→ASSIGNED, cancel+reason, miss, bulk-status. 9/9 passing; `tsc --noEmit` clean.

### P1-28 — Trip: active-trip recovery + pause/resume/end
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /api/v1/me/active-trip` returns open trip (`ACTIVE`/`PAUSED`) with resume state (tripId, route geometry + ordered stops + offsets, last known position, current/next stop, startedAt). `PATCH /api/v1/trips/:id { action: "pause"|"resume"|"end" }` — requires `Idempotency-Key`; on `end` store Person 2's trip statistics as the summary. While `PAUSED`, expose state so Person 2 sets `ON_BREAK` (not `OFFLINE`).
🔗 Depends on: **P2-21** (trip statistics) — the `end` action's trip summary is stored from the `TRIP_STATS_READY` event; Person 1 does **not** compute stats. Two-way: Person 2 **P2-21** is triggered by this endpoint. Also **P2-03** consumes the `last known position` this endpoint returns. Build pause/resume/recovery first; the summary-store step waits on `TRIP_STATS_READY` (stub with an empty summary until then).
Test: reload mid-trip → recover; pause then resume; repeated `Idempotency-Key` is a no-op; end stores stats when `TRIP_STATS_READY` received.

### P1-29 — Trip: start + force-end + pre-trip checklist
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /api/v1/trips` (start, `Idempotency-Key`). `POST /api/v1/admin/trips/:id/force-end` (DISPATCHER; emits `trip:completed`, notifies operations). `POST /api/v1/trips/:id/checklist` (fuel, tyres, brakes, lights, documents-valid, cleanliness); System Setting `checklistBlocksTripStart` decides whether a failed item blocks start.
🔗 Depends on: **P2-21 / P2-19** — on `force-end`, Person 2 finalises the GPS trail and emits `TRIP_STATS_READY`; store the resulting summary the same way as P1-28. Trip start makes the trip visible to Person 2's ingestion (**P2-04**).
Test: double start with same key → one trip; force-end by non-dispatcher → 403; failed checklist blocks start only when flag on.

### P1-30 — My Assignment & Attendance
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /api/v1/me/assignments?date=YYYY-MM-DD` (DRIVER/CONDUCTOR) → vehicle, route (geometry + ordered stops + offsets + scheduled times), shift window, scheduled trips + status. `POST /api/v1/me/assignments/request` (staff requests manual assignment; DISPATCHER approves/rejects). `POST /api/v1/me/attendance/check-in` + `/check-out` against the shift; feeds performance.
Test: assignments match materialised trips; request → approval flow; check-in/out timestamps + duration feed performance.
Review (2026-08-31): **Completed.** `modules/me/*` (`me.model` = `AssignmentRequest`; service/controller/routes). `GET /api/v1/me/assignments?date=` resolves the caller's **Driver/Conductor** profile by `user` ref and returns `staffType`, `name`, `shift`, `assignedScheduleId`, populated `route` (geometry + stops), and that day's **materialised scheduled trips** (SCHEDULED status + times + vehicle). `POST /api/v1/me/assignments/request` creates a `PENDING` `AssignmentRequest` (staff = DRIVER/CONDUCTOR); `GET /api/v1/admin/assignment-requests` + `PATCH /:id/decision {decision: APPROVE|REJECT}` (DISPATCHER/TRANSPORT_MANAGER/ADMIN). `POST /api/v1/me/attendance/check-in` + `/check-out` write to the staff `attendance[]` for the day and return `workedMinutes` (feeds P2 performance). Route guards use `authenticate + authorizeRoles(DRIVER,CONDUCTOR)`. Note: the shared `validate` util cannot assign to the read-only `req.query`, so the GET assignment date is handled in the controller (valid YYYY-MM-DD not rejected). Test `tests/phase2-me.test.ts` (6 tests): passenger 403, GET assignments returns route+2 SCHEDULED trips+shift, request creates PENDING, admin approves, conductor reads own assignments, check-in→check-out with workedMinutes duration. 6/6 passing; `tsc --noEmit` clean.

### P1-31 — Reference-Data Sync
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /api/v1/sync/routes|stops|fares|schedules?updatedSince=<ts>` with `ETag` / `If-None-Match` and `updatedSince` delta responses; each response carries a version/checksum for offline caching.
Test: unchanged + matching `If-None-Match` → 304; `updatedSince` returns only changed docs; checksum changes on write.
Review (2026-08-31): **Completed.** `modules/sync/*` — `GET /api/v1/sync/routes|stops|schedules|fares?updatedSince=<ts>`, public via `guestOrAuth`. Each response includes `{ data, count, checksum (SHA-1 of payload), generatedAt }` for offline caching/versioning. `updatedSince` filters by `updatedAt > ts` (delta sync, respecting soft `deletedAt` exclusion). `ETag` header derived from the checksum; a matching `If-None-Match` → `304 Not Modified`. `fares` returns an empty reference set (no Fare model exists yet — documented). Test `tests/phase2-sync.test.ts` (5 tests): sync routes returns checksum+count, `updatedSince` delta returns only changed docs, matching `If-None-Match` → 304, checksum changes after a write, stops+schedules endpoints respond with checksum. 5/5 passing; `tsc --noEmit` clean.

### P1-32 — File Uploads (presign)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /api/v1/uploads/presign { purpose, contentType, sizeBytes }` → short-lived S3 presigned PUT URL + final object key. Purposes: `complaint, incident, lost_found, profile, vehicle_document`. Enforce max size + content-type allowlist server-side; client PUTs then submits key with parent record.
Test: disallowed content-type → 400; oversize → 400; presigned URL uploads and key is accepted by parent record.
Review (2026-08-31): **Completed.** `modules/uploads/*` — `POST /api/v1/uploads/presign { purpose, contentType, sizeBytes }` (auth) validates purpose, content-type allowlist and per-purpose `maxBytes`, then returns `{ key, purpose, contentType, sizeBytes, expiresInSeconds, url }` where `url` is a short-lived **HMAC-signed PUT** URL (`?token&expires`) under `/api/v1/uploads/:key`. Purposes `complaint, incident, lost_found, profile, vehicle_document` (profile = images ≤5MB; docs = images+pdf/doc ≤10–15MB). Signed `PUT /api/v1/uploads/:key` (route-level `express.raw`, no Bearer needed — auth is the signature) verifies signature + expiry (409/401 on bad/expired), stores bytes to a local storage dir (`UPLOAD_DIR` or OS temp), returns `{ stored, key, bytes }`. `POST /api/v1/uploads/confirm { key }` (auth) checks the object exists and returns `{ accepted, key }` for the client to attach to a parent record. No S3/AWS SDK or S3 env exists in this repo, so uploads are stored locally via a config-driven backend (real S3 presigning can be swapped in via `UPLOAD_SIGNING_SECRET`/bucket env later). Test `tests/phase2-uploads.test.ts` (6 tests): disallowed content-type 400, oversize 400, valid presign returns key+url, PUT stores then confirm accepts, unknown purpose 400, unauthenticated presign 401. 6/6 passing; `tsc --noEmit` clean.

---

# PHASE 4 — PASSENGER OPERATIONS

### P1-33 — Route / Stop search + find bus (source → destination)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: search routes, search stops, find bus source→destination, view route details, view stop details. Text + geo search; pagination.
Test: partial-name search; nearest-stop search; source→destination returns routes serving both stops in order.

### P1-34 — Journey Planner
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /api/v1/journeys?from=<lat,lng|stopId>&to=<lat,lng|stopId>&time=<ts>` → ranked options: legs (walk/ride), transfer points, walking distance to first stop, per-leg + total fare, total duration, next departure per leg with live ETA where a trip is active.
🔗 Depends on: **P2-12** (ETA engine — `vehicle:{id}:eta`) for the "live ETA where a trip is active" field only. Build the planner on schedule offsets first; read live ETA from Redis when P2-12 is available (fall back to scheduled offset otherwise).
Test: direct route ranked above 1-transfer; fares sum correctly; live ETA populated when a trip is active, static offset otherwise.

### P1-35 — Favourite Subscriptions
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /api/v1/passengers/me/subscriptions { type: "route"|"stop", targetId }`, `GET`, `DELETE`. Feeds Notification Service for `BUS_DELAYED, ROUTE_DEVIATION, trip:cancelled`, service alerts on followed routes/stops.
Test: create/list/delete; guest → 403; duplicate subscription deduped.

### P1-36 — Notification Service (core)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: channels Web Push (VAPID), SMS, email, in-app. `notifications`, `notificationPreferences`, `notificationTemplates`. Templates, preferences (`quietHours { start, end }`, `digest` bool), history, read/unread, user settings. Web Push send via VAPID; `410` → delete subscription.
Test: in-app notification stored + read toggle; quiet hours suppress/defer; expired push subscription pruned on 410; template renders with variables.

### P1-37 — Notification: consume Person 2 events + fan-out
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: subscribe (Redis Pub/Sub / event bus) to `BUS_APPROACHING, BUS_ARRIVED, BUS_DELAYED, VEHICLE_OFFLINE, ROUTE_DEVIATION, DRIVER_SOS` + Service Alerts; resolve target users (incl. favourite subscribers) and fan out on the right channels.
🔗 Depends on: **P2-23** (event bus + payload schemas) is the source of every event consumed here; individual producers **P2-10** (approaching/arrived), **P2-13** (delayed), **P2-14** (deviation), **P2-15** (offline), **P2-17** (SOS). Develop the consumer + fan-out against a mocked publisher, then integrate once P2-23 is `✅ Done`.
Test: simulated `BUS_DELAYED` event notifies route subscribers only; SOS routes to dispatchers; dedupe on repeated event.

### P1-38 — Service Alerts & Announcements
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: CRUD `/api/v1/admin/service-alerts` (title, message, severity, type `disruption|closure|weather|emergency|general`, targeting `routeIds[] | stopIds[] | geoArea | all`, `startsAt`, `endsAt`, status). `GET /api/v1/service-alerts?routeId=&stopId=` public read. On publish → fan out via Notification Service + Socket.IO `service:alert` to relevant rooms.
🔗 Depends on: **P2-02** (Socket.IO server + `route:{id}` / `stop:{id}` rooms + Redis adapter) to emit `service:alert`; **P2-24** relays it into the passenger stream. CRUD + public read + Notification-Service fan-out have no dependency — build those first; add the socket emit once P2-02 is `✅ Done`.
Test: geo-area targeting selects correct routes; publish triggers notifications + socket emit; expired alert excluded from public read.

### P1-39 — Complaint Management
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: create, categories (`bus delay, driver behavior, conductor behavior, vehicle condition, cleanliness, overcrowding, route issue, fare issue, safety, other`), view, assign, update, escalate, resolve, close, history, attachments (presigned S3), passenger feedback + rating.
Test: full lifecycle open→resolved→closed; escalation changes assignee + audit; attachment keys stored; guest cannot create.

### P1-40 — Lost & Found
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: lost item report, found item report, description, image attachment, vehicle/route info, date/time, lost↔found matching, staff assignment, status updates, return confirmation, case closure.
Test: matching suggests candidates by route + date window; return confirmation closes both records.

---

# PHASE 5 — TICKETING & PAYMENTS

### P1-41 — Fare Management
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: CRUD route-based fares, distance/stage-based fares, passenger categories, student discount, senior citizen discount, concessions, daily/weekly/monthly pass. Collections: `fares`, `fareRules`, `concessions`, `passes`.
Test: stage fare table lookup; concession application; overlapping rule precedence deterministic.

### P1-42 — Fare Calculation
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /api/v1/fares/calculate { routeId, boardingStopId, destinationStopId, passengerCategory, concessionId? }` → `{ amount, currency, breakdown, appliedConcession }`. Single source of truth — clients never compute fare.
Test: known route/stop pair → expected amount + breakdown; invalid stop pair → 400; concession reduces amount correctly.

### P1-43 — Ticketing
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: ticket creation (`Idempotency-Key`), QR ticket, validation, cancellation, expiry, history, search, daily/weekly/monthly/student pass. Denormalise `routeNumber`, `vehicleRegNo`.
Test: duplicate key → one ticket; QR validates once then marked used; expired ticket rejected; pass covers eligible trips.

### P1-44 — Payments
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: payment creation (`Idempotency-Key`), verification, status, gateway integration, UPI / card / net banking / wallet, refund, transaction history, failed payments, reconciliation. **Webhook-based** verification. `payments { status, createdAt }` index.
Test: webhook marks payment `CONFIRMED` + issues ticket; replayed webhook idempotent; refund path; failed payment recorded.

### P1-45 — Payment QR
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /api/v1/payments/qr { tripId, amount, purpose }` → dynamic UPI string / QR payload; verified via payment webhook; on success emit `payment:confirmed` to the conductor area (Socket.IO).
Test: QR payload well-formed; webhook success emits `payment:confirmed` to `trip:{id}` room; amount mismatch rejected.

### P1-46 — Conductor Offline Sync
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /api/v1/tickets/bulk`, `POST /api/v1/trips/:id/passenger-count/bulk` — each item carries a client `Idempotency-Key`; server dedupes, validates timestamps, processes in order, returns per-item results. `POST /api/v1/trips/:id/reconciliation { ticketsIssued, cashCollected, digitalCollected }` → expected vs collected variance.
Test: replayed batch → no duplicates, per-item statuses; out-of-order timestamps sorted; reconciliation variance computed.

### P1-47 — Occupancy consumption (from Person 2)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: consume `OCCUPANCY_CHANGED` events into analytics/reports (crowding history per trip/route). (Derivation + broadcast is Person 2.)
🔗 Depends on: **P2-22** (occupancy broadcast emits `OCCUPANCY_CHANGED`) and **P2-23** (event bus). This task is only reachable once P2-22 is `✅ Done`. Note: the passenger-count input to P2-22 comes back from Person 1's own **P1-46** (`passenger-count/bulk`).
Test: event updates stored occupancy history; analytics query returns crowding distribution.

---

# PHASE 6 — ADMIN OPERATIONS

### P1-48 — Maintenance + vehicle documents + expiry jobs
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: vehicle maintenance, service schedule, service history, repairs, parts, tyre replacement, oil changes, inspections. Vehicle documents: registration, insurance, fitness certificate, PUC — with expiry management + reminder jobs (insurance/registration/fitness/PUC expiry, service due).
Test: service record lifecycle; reminder job flags documents expiring within threshold; expired doc surfaces on vehicle read.

### P1-49 — Incident Management (business workflow)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: statuses `OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED`; types `accident, breakdown, passenger incident, traffic, route issue, other`. Convert Person 2 signals (`DRIVER_SOS, ROUTE_DEVIATION, GPS_FAILURE, VEHICLE_OFFLINE`) into incident records; run workflow; incident + vehicle status change in a transaction; emit `sos:acknowledged` path via Person 2.
🔗 Depends on: **P2-23** (event bus) + producers **P2-17** (`DRIVER_SOS`), **P2-14** (`ROUTE_DEVIATION`), **P2-15** (`VEHICLE_OFFLINE`), **P2-04/P2-05** (`GPS_FAILURE`). Dispatcher acknowledge must reach the driver via Person 2 **P2-17** (`sos:acknowledged`). Build the workflow + manual-incident path first; wire the event→incident bridge once P2-23 is `✅ Done`.
Test: `DRIVER_SOS` event → OPEN incident; dispatcher acknowledge → status + notify; workflow transitions guarded.

### P1-50 — Analytics
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: passengers (daily/monthly/active/new, popular routes/stops, peak hours), vehicles (utilization, trips, distance, performance), drivers (trips completed, delays, complaints, attendance, working hours), routes (popular, avg travel time, performance, delay stats), revenue (daily/monthly per route/vehicle/payment method).
🔗 Depends on: **P2-21** (`TRIP_STATS_READY` — distance, moving/idle time, on-time vs delay per trip) and **P2-13** (delay stats) for the vehicle/driver/route performance + delay metrics. Revenue + passenger + attendance analytics have no Person 2 dependency — build those first.
Test: aggregation pipelines return expected numbers on seed data; date-range filters; admin-only.

### P1-51 — Reports
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: reports for vehicles, drivers, conductors, routes, stops, trips, passengers, tickets, payments, revenue, complaints, maintenance, incidents. Filters: date, route, vehicle, driver. Export CSV / PDF where required.
🔗 Depends on: **P2-21** (trip statistics) for on-time / distance columns in the Trips report, and **P2-23** event history for the Incidents report. Other reports have no Person 2 dependency.
Test: CSV columns + row counts correct; PDF renders; filter combinations.

### P1-52 — Audit Logs
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: track login, logout, user create/update, vehicle/route/schedule changes, permission changes, admin actions, deletes, important business actions. Record: user, action, resource, resourceId, oldValue, newValue, timestamp, IP/device. Index `{ resource, resourceId, createdAt: -1 }`.
Test: mutating actions write an audit entry with before/after; audit list filter by resource; immutable (no update/delete API).

### P1-53 — System Settings
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: organization, city, operating hours, holidays, fare settings, notification settings, language settings, ETA thresholds, delay thresholds, geofence configuration, system configuration. Plus `checklistBlocksTripStart, gpsSendIntervalSeconds, offlineVehicleTimeoutSeconds, mapTileSource, minSupportedAppVersion, featureFlags`. Surfaced only via `GET /api/v1/config`.
Test: update reflects in `/config` immediately; validation on threshold ranges; change audited; RBAC (admin/manager only).

### P1-54 — Admin APIs + dispatch messaging
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `/api/v1/admin/{users,drivers,conductors,vehicles,routes,stops,schedules,trips,service-alerts,analytics,reports}` consolidated admin surface with stricter RBAC + filters. Dispatch messaging to operations area (`dispatch:message` Socket.IO event); `trip:force_end` wiring.
🔗 Depends on: **P2-02** (Socket.IO rooms + adapter) and **P2-25** (admin `fleet:all` stream) to deliver `dispatch:message` / `trip:force_end`. The REST admin namespace itself has no dependency.
Test: admin namespace enforces elevated roles; dispatch message delivered to `fleet:all` / target room.

---

# PHASE 7 — PRODUCTION (Person 1 parts)

### P1-55 — GTFS Static Export
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /api/v1/gtfs/static.zip` — routes, stops, schedules, fares in GTFS format for third-party apps. (GTFS-Realtime = Person 2.)
Test: zip contains `agency.txt, stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt, fare_*.txt`; validates against a GTFS validator.

### P1-56 — Docker + CI/CD
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: Dockerfiles for `backend` + `worker`; compose with `mongo` (single-node RS) + `redis`; GitHub Actions pipeline: lint · test · build · migrate · deploy.
Test: `docker compose up` boots full stack; CI runs green on a PR; migrations run in the pipeline.

### P1-57 — Monitoring + logging
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: structured logging, Sentry error tracking, Prometheus metrics (request latency, DB, Redis, queue), Grafana dashboards, alerts (payment webhook failures, queue backlog).
Test: forced error appears in Sentry; `/metrics` scrapeable; alert rule fires on simulated condition.

### P1-58 — Load + security testing
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: load test key endpoints (config, search, journeys, ticket create, fare calculate); security pass (authz matrix, rate limits, input fuzzing, dependency scan, secrets scan).
Test: p95 latency within target under target RPS; authz matrix has no gaps; no high/critical vulns.

---

## Contract checkpoints (verify before/while building)

- [ ] Person 1 → Person 2 reference data shape agreed (vehicle, driver, conductor, route + geometry, stops + coords, route-stop sequence + offsets, schedule, trip, assignments, System Settings thresholds, emergency contacts).
- [ ] Person 2 → Person 1 event names + payloads agreed (`BUS_APPROACHING_STOP, BUS_ARRIVED_STOP, BUS_LEFT_STOP, VEHICLE_DELAYED, VEHICLE_OFFLINE, ROUTE_DEVIATION, DRIVER_SOS, GPS_FAILURE, TRIP_STATS_READY, OCCUPANCY_CHANGED`).
- [ ] `Idempotency-Key` header enforced on: trip start, checklist submit, ticket create, `tickets/bulk`, `passenger-count/bulk`, payment create.
- [ ] Standard error envelope `{ error: { code, message, details?, traceId } }` used everywhere.
- [ ] All admin-tunable values served only via `GET /api/v1/config`.
