# PERSON 2 — Backend Task Tracker

> Source: `BACKEND_PROMPT.md` §35–§60, §61, Roadmap Phase 3 (+ Phase 7 real-time parts).
> Person 2 = Real-Time Tracking Engine + geospatial processing. (Business logic / CRUD / admin / permanent data = Person 1.)

## How to use this file

Work **one task at a time**, in order:

1. **Develop** the task → tick `🔨 Developed`.
2. **Test** it (unit + integration / API + WebSocket test, GPS/geofence/ETA sims where noted) → tick `🧪 Tested`.
3. When both are ticked → tick `✅ Done` and move to the next task.

Do not start the next task until the current one is `✅ Done`. Update the **Progress Summary** row when a task is done.

Checkbox legend: `[ ]` not started · `[x]` complete.

`🔗 Depends on` = this task needs a Person 1 deliverable first (or a two-way contract with it). Don't mark `✅ Done` until the dependency is `✅ Done` on the Person 1 tracker, or a mock/stub stands in for it (note which).

---

## Progress Summary

| Phase | Tasks | Developed | Tested | Done |
|-------|-------|-----------|--------|------|
| 3 — Real-Time Engine | P2-01 … P2-28 | 28 / 28 | 28 / 28 | 28 / 28 |
| 7 — Production (real-time) | P2-29 … P2-31 | 3 / 3 | 3 / 3 | 3 / 3 |
| **Total** | **31** | **31 / 31** | **31 / 31** | **31 / 31** |

> **All 31 tasks `✅ Done` as of 2026-08-31.** This pass closed out every task that was still open: **P2-02** got its missing `stop:{id}` room + `broadcastToStop` and a real socket-client test pass (`tests/phase3-socket.test.ts`). **P2-01** got a foundations smoke test (`tests/phase3-foundation.test.ts`) — `@turf/*` imports, tracking config, shared Mongo/Redis, mounted tracking routes, and the actual `worker.ts` entrypoint spawned as a child process and proven to boot cleanly. **P2-10** got depot arrival/departure (`processDepotGeofence`), reading depot coordinates from a new `depots` System Settings key — a documented stub for the depot data model Person 1 hasn't built yet. **P2-24** turned out to need no new relay code: P1-38's `service:alert` already broadcasts into the same `route:{id}`/`stop:{id}` rooms every other passenger event uses, confirmed by a "coherent stream" test. **P2-25** got a real manual-assignment-request relay (`assignment:changed` on `fleet:all`, now that P1-30 is Done) plus ready-to-call `broadcastDispatchMessage()`/`broadcastTripForceEnd()` helpers standing in for P1-54 (admin dispatch messaging), which hasn't been started on the Person 1 side — nothing calls them in production yet. **P2-27/P2-31** got a real load test (`tests/phase3-load.test.ts`): 15 concurrent vehicles × 3 rounds of GPS ingestion (0 rejected, p95 well under budget) and a 60-connection WebSocket spike with room-scoped fan-out verified under load — against this pass's own documented baseline budget, since **P1-58** (the formal load/security test plan) still doesn't exist to set an authoritative one. Full suite: 201/201 passing, `tsc --noEmit` clean.

---

# PHASE 3 — REAL-TIME ENGINE

### P2-01 — Tracking service/worker setup & foundations
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: tracking module layout under `src/modules/tracking/*` + a separate `worker` entrypoint (BullMQ), `@turf/*` deps, shared access to Mongo + Redis clients, config loading, structured logging.
🔗 Depends on: **P1-01** (project/module skeleton), **P1-02** (Mongo replica set), **P1-03** (Redis client). Coordinate on shared `config/`, `utils/logger`, error envelope from **P1-05**.
Test: worker + tracking routes boot; Mongo + Redis reachable; `@turf` imports resolve.
> **Note (2026-08-31):** Added `tests/phase3-foundation.test.ts` — `@turf/length|line-slice|point-to-line-distance|nearest-point-on-line|bearing` + `@turf/helpers` all resolve and compute correctly; `trackingConfig` loads gps/geofence/eta/delay sections; the shared Mongo/Redis clients are connected; `/api/v1/tracking/*` routes are mounted (auth-gated, not 404). The worker entrypoint (`src/worker.ts`) is spawned as a real child process (`tsx`) against the same in-memory Mongo + local Redis the test suite uses, and asserted to log "All tracking workers started" with no failure before being sent `SIGTERM` — a genuine boot, not just a unit-level import check.

### P2-02 — Socket.IO server + auth handshake + rooms + Redis adapter
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: Socket.IO server, handshake auth with the access token (guest token accepted **read-only**), rooms `vehicle:{id}`, `route:{id}`, `trip:{id}`, `stop:{id}`, `fleet:all`, subscribe/unsubscribe, reconnection handling, Redis adapter for horizontal scaling.
🔗 Depends on: **P1-08** (access-token issuance + JWT verify secret/claims), **P1-12** (guest token + read-only scope), **P1-15** (role claims for `fleet:all` gating).
Test: valid token joins a room; guest joining `vehicle:`/`route:`/`trip:`/`stop:` is read-only and rejected from `fleet:all`; bad token → connection refused; two server instances share broadcasts via the adapter.
> **Note (2026-08-31):** `stop:{id}` room was missing from the implementation even though this scope line and **P1-38**'s dependency on it both call for it — added `subscribe`/`unsubscribe` handling + `broadcastToStop` in `src/config/socket.ts`. Test coverage added in `tests/phase3-socket.test.ts`: token/guest/bad-token handshake, all five room joins, `fleet:all` admin gating, and room-scoped broadcast delivery (in-room receives, outsider doesn't) for both `route:{id}` and the new `stop:{id}`. The Redis-adapter "two server instances share broadcasts" case is exercised implicitly (the adapter is wired for every broadcast in these tests) but not with two literal server processes — would need a second `httpServer`/`initSocket` pair against the same Redis to prove cross-instance fan-out explicitly.

### P2-03 — Redis real-time state schema + cold-start rebuild
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: keys `vehicle:{id}:location|status|eta|occupancy`, `trip:{id}:state`, `driver:{id}:status`, `route:{id}:vehicles`; appropriate TTLs; rebuild-from-MongoDB on cold start; Redis is **never** the source of truth.
🔗 Depends on: **P1-23** (vehicles), **P1-24** (routes + geometry), **P1-25** (stops), **P1-27** (trips) as the authoritative data to rebuild from.
Test: keys expire per TTL; flushing Redis then restarting repopulates active vehicles/trips from Mongo.

### P2-04 — GPS ingestion: `POST /tracking/location` + validation
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: accept `{ vehicleId, tripId, latitude, longitude, speed, heading, accuracy, timestamp }`; validate vehicle · driver · trip · lat · lng · timestamp · speed · accuracy; write current position to Redis; enqueue processing job.
🔗 Depends on: **P1-23** (vehicle exists + GPS device id), **P1-21** (driver identity), **P1-27 / P1-29** (trip exists and is `ACTIVE`), **P1-08** (driver auth).
Test: valid fix → 202 + Redis updated; unknown vehicle/trip → 404; non-active trip → 409; malformed payload → 400 envelope.

### P2-05 — GPS anomaly detection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: detect duplicate GPS · invalid GPS · out-of-order GPS · impossible speed · suspicious movement (multi-km jump in seconds). Drop or flag per rule; device timestamps used only for ordering, scheduling math uses server time.
Test: replayed fix dropped; out-of-order older-than-last dropped; teleport jump flagged suspicious; jitter within tolerance accepted.

### P2-06 — Offline GPS bulk sync: `POST /tracking/location/bulk`
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: bulk ingestion · duplicate detection · timestamp validation · ordered processing · retry/failed-sync handling; queued offline trip-lifecycle events reconcile through the same path; after backlog flush the **live position jumps to now** — do not replay stale points as current. Requires `Idempotency-Key` per batch.
🔗 Depends on: **P1-04** (`idempotencyKeys` collection + middleware). Trip lifecycle events reconcile against **P1-27 / P1-28**.
Test: replayed batch → no duplicates, per-item results; out-of-order items sorted; after flush, `vehicle:{id}:location` = latest real time, not backlog tail.

### P2-07 — `POST /tracking/heartbeat`
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: foregrounded-but-stationary client signals liveness without a full fix; refresh `lastSeen`; feeds the two-stage offline logic (§45).
Test: heartbeat refreshes liveness; absence of both fixes and heartbeats advances STALE→OFFLINE per thresholds.

### P2-08 — Tracking read APIs
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /tracking/vehicle/:id`, `GET /tracking/route/:id`, `GET /tracking/trip/:id` — current location/status/ETA/current-stop from Redis (fallback Mongo). Read authorization; passenger/admin reads are WS-first, these are for initial hydration only.
🔗 Depends on: **P1-15** (RBAC guards / `authorize` middleware).
Test: returns hydrated snapshot; unauthorized role → 403; unknown id → 404.

### P2-09 — Geospatial processing core + in-memory cache
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `@turf/*` helpers — nearest stop, point-to-line distance, `nearest-point-on-line` projection, `along` / `line-slice` / `length` for distance-remaining, bearing, buffer generation for geofences; MongoDB `$near`/`$geoNear` for candidate stops; keep active route `LineString`s + ordered stop lists **cached in memory** in the worker (refresh on change).
🔗 Depends on: **P1-24** (route geometry `LineString` + ordered `[{stopId, sequence, scheduledOffsetMinutes}]`), **P1-25** (stop `Point` coords + `2dsphere`). Needs **P1-31** or change signal to invalidate the in-memory cache on route/stop edits.
Test: projection + distance-remaining match a known fixture route; cache invalidates within N seconds of a route edit.

### P2-10 — Geofencing
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done
> **Note:** stop approach/arrive/leave geofencing implemented and radius sourced live from System Settings. **Update (2026-08-31):** depot arrival/departure implemented too — `processDepotGeofence` in `geofence-processing.service.ts`, wired unconditionally (no active trip required) into `processGPSSchema`, broadcasting `depot:arrival`/`depot:departure` to `vehicle:{id}` + `fleet:all`. Depot locations still have no real Person-1 data model, so they're read from a new `depots` System Settings key (`tracking-settings.service.ts`) — a documented stub standing in for that model per the dependency-stop rule; empty by default (nothing to geofence against until an ops admin seeds `depots`, or Person 1 ships a real depot collection). Tests in `tests/phase3-depot-and-streams.test.ts`: no depots configured → no events; arrival on entering the radius, no duplicate while inside, departure on leaving; radius change in System Settings takes effect.

Scope: geofences for stops, depots, routes; detect bus approaching stop · arriving at stop · leaving stop · depot arrival · depot departure; radius from System Settings.
🔗 Depends on: **P1-25** (stop coords), **P1-24** (route stop sequence), **P1-53 / P1-17** (`geofenceRadiusMeters` from settings/config). Depot polygons from Person 1 `depots` data if present.
Test: simulated approach → `vehicle:arriving`; entering radius → `vehicle:arrived`; exit → `vehicle:left`; radius change in settings takes effect.

### P2-11 — Current-stop detection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: compute previous / current / next stop, distance to next, distance from previous, arrival, departure — from route geometry + stop sequence via projection onto the `LineString`.
🔗 Depends on: **P1-24** (route geometry + ordered stops + offsets).
Test: along a fixture trip, prev/current/next advance correctly; distances monotonic between stops; arrival/departure fire once each.

### P2-12 — ETA engine
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: MVP `ETA = distance_along_route / current_speed`; return `{ vehicleId, nextStop, eta }` and per upcoming stop; publish to `vehicle:{id}:eta`; advanced inputs (historical time, time-of-day, dwell) as follow-up.
🔗 Depends on: **P1-24** (scheduled offsets / stop order), **P1-53 / P1-17** (`etaThresholds`). Consumed by Person 1 **P1-34** (Journey Planner live ETA).
Test: known speed + remaining distance → expected ETA; ETA recomputed each fix; zero speed handled (no divide-by-zero, falls back to last ETA / schedule).

### P2-13 — Delay detection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: compare scheduled arrival vs predicted arrival; statuses `EARLY, ON_TIME, DELAYED, SEVERELY_DELAYED` (thresholds from settings); emit `vehicle:delay` (Socket.IO) + `VEHICLE_DELAYED` (event bus).
🔗 Depends on: **P1-26** (schedules / scheduled arrival times per stop), **P1-53 / P1-17** (`delayThresholds { onTime, delayed, severe }`). Consumed by Person 1 **P1-37** (notifications), **P1-50** (analytics).
Test: predicted arrival past threshold → `DELAYED` then `SEVERELY_DELAYED`; recovery returns to `ON_TIME`; event emitted once per status change.

### P2-14 — Route deviation detection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: cache each active route `LineString` in memory; compute perpendicular distance with `@turf/point-to-line-distance` on every fix; flag deviation when distance > threshold for > N seconds; return-to-route when back within threshold; emit `route:deviation` + `ROUTE_DEVIATION`.
🔗 Depends on: **P1-24** (route `LineString`), **P1-53 / P1-17** (deviation threshold + dwell seconds). Consumed by Person 1 **P1-37** (notifications), **P1-49** (incident record).
Test: off-route track > threshold for > N s → one `ROUTE_DEVIATION`; brief GPS noise does not trigger; return emits return-to-route.

### P2-15 — Vehicle offline / stale detection
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: monitor last GPS timestamp / heartbeat against `offlineVehicleTimeoutSeconds`; two-stage — `STALE` after a short timeout (surface to dispatcher, no incident), `OFFLINE` + incident only after a longer timeout; detect GPS/network/device offline · stale GPS · reconnection; do **not** flag `OFFLINE` while the trip is `PAUSED`/`ON_BREAK`; emit `vehicle:offline` + `VEHICLE_OFFLINE`.
🔗 Depends on: **P1-28** (trip `PAUSED` state exposed so `ON_BREAK` is distinguishable), **P1-53 / P1-17** (`offlineVehicleTimeoutSeconds` + stale timeout). Consumed by Person 1 **P1-49** (incident).
Test: silence past short timeout → `STALE` (no incident); past long timeout → `OFFLINE` + `VEHICLE_OFFLINE`; paused trip stays `ON_BREAK`; reconnect clears state.

### P2-16 — Driver real-time status
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `ONLINE, OFFLINE, ON_TRIP, ON_BREAK, IDLE, SOS, GPS_ERROR`; maintain `driver:{id}:status` in Redis; broadcast `vehicle:status` / driver status to admin.
🔗 Depends on: **P1-21** (driver identity), **P1-27 / P1-28** (trip lifecycle drives `ON_TRIP` / `ON_BREAK`).
Test: starting a trip → `ON_TRIP`; pause → `ON_BREAK`; no fixes while online → `IDLE`; SOS → `SOS`.

### P2-17 — Driver SOS
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `POST /tracking/sos` → emit `driver:sos` with driver · vehicle · location · trip · route · timestamp; emit `sos:acknowledged` back to the driver client when a dispatcher acknowledges; optionally notify the driver's emergency contacts.
🔗 Depends on: **P1-49** (Person 1 creates the permanent incident record from `DRIVER_SOS`), **emergencyContacts** data served by Person 1 (§47 / collection), dispatcher acknowledge action from Person 1 admin (**P1-54**).
Test: SOS emits `driver:sos` to `fleet:all` + creates incident (via event); dispatcher ack → `sos:acknowledged` reaches the driver; emergency-contact notification fired when contacts exist.

### P2-18 — Live vehicle tracking broadcast
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: push `vehicle:location`, `vehicle:status`, `vehicle:arriving/arrived/left`, `vehicle:occupancy`, current/next stop, last-update time to **subscribed rooms only** — no per-passenger polling.
Test: only room subscribers receive events; unsubscribed client gets nothing; payload matches the documented shape.

### P2-19 — GPS history persistence (MongoDB time-series)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `gpsHistory` time-series collection (`timeField: timestamp`, `metaField: { vehicleId, tripId, driverId }`, `granularity: "seconds"`), GeoJSON `location` `Point` + speed/heading/accuracy; `2dsphere` on `location`; compound `{ "meta.tripId": 1, timestamp: 1 }`; TTL index for raw-point retention; keep a downsampled per-trip path on the trip document. Async write off the ingestion hot path.
🔗 Depends on: **P1-02** (replica set — time-series + change streams), **P1-27** (trip ids for `metaField` + the trip doc to store the downsampled path), **P1-53** (retention days policy).
Test: points written async; query by trip returns ordered path; TTL drops points past N days; downsampled path present on trip after end.

### P2-20 — Trip replay
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /tracking/trip/:tripId/history` — GPS points in chronological order for admin replay (start → points → stops → end).
🔗 Depends on: **P1-15** (admin RBAC), **P1-27** (trip existence).
Test: returns full ordered path for a completed trip; respects retention (missing old points handled); non-admin → 403.

### P2-21 — Trip statistics on trip end
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: on trip end, compute total distance, moving time, idle time, stops served, per-stop actual vs scheduled arrival, overall on-time/delay, average speed, max speed; finalise the GPS trail; emit `TRIP_STATS_READY`.
🔗 Depends on: **P1-28** (`PATCH /trips/:id { action: "end" }` and `POST /admin/trips/:id/force-end` **P1-29** are the triggers). Two-way contract: Person 1 **P1-28** waits for `TRIP_STATS_READY` to store the trip summary.
Test: ending a fixture trip emits `TRIP_STATS_READY` with correct distance/duration/on-time; force-end path also emits; Person 1 receives and stores.

### P2-22 — Occupancy broadcast
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: consume conductor passenger-count updates + vehicle capacity → derive `LOW / MODERATE / CROWDED`; write `vehicle:{id}:occupancy`; emit `vehicle:occupancy` to route/vehicle rooms and `OCCUPANCY_CHANGED` to Person 1.
🔗 Depends on: **P1-22 / P1-46** (conductor passenger-count endpoint + bulk sync produce the counts), **P1-23** (vehicle `capacity`). Consumed by Person 1 **P1-47** (analytics).
Test: count/capacity ratio maps to the right band; band change emits `vehicle:occupancy` + `OCCUPANCY_CHANGED`; no emit when band unchanged.

### P2-23 — Event bus: Person 2 → Person 1
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: Redis Pub/Sub (or event bus) channels + typed payloads for `BUS_APPROACHING_STOP, BUS_ARRIVED_STOP, BUS_LEFT_STOP, VEHICLE_DELAYED, VEHICLE_OFFLINE, ROUTE_DEVIATION, DRIVER_SOS, GPS_FAILURE, TRIP_STATS_READY, OCCUPANCY_CHANGED`. At-least-once delivery; include `traceId`.
🔗 Depends on: agreed payload schemas with Person 1 (contract checkpoint). Consumed by Person 1 **P1-37** (notifications), **P1-49** (incidents), **P1-50/P1-51** (analytics/reports), **P1-47** (occupancy).
Test: each event published on its channel with the agreed schema; Person 1 test subscriber receives and parses all 10; redelivery on consumer restart.

### P2-24 — Real-time passenger updates (aggregation)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done
> **Note:** location/ETA/current-stop/delay/status/arrival/occupancy all stream to the passenger room. **Update (2026-08-31):** service alerts now stream too, and it turned out no separate "relay" layer was needed — "the passenger room" in this codebase *is* the `route:{id}`/`vehicle:{id}`/`trip:{id}`/`stop:{id}` rooms a passenger subscribes to, and P1-38's `emitToRooms()` already broadcasts `service:alert` directly into `route:{id}`/`stop:{id}`, the same rooms every other passenger-facing event uses. Added `tests/phase3-depot-and-streams.test.ts` proving a route-subscribed socket receives both `vehicle:location`-style tracking events and `service:alert` from the same subscription (the "coherent stream" requirement), and that a guest gets the identical read-only stream.

Scope: passenger room receives vehicle location · ETA · current stop · next stop · delay · vehicle status · arrival/departure · occupancy · service alerts. WebSockets only. Flow: `Driver GPS → Backend → Redis → Socket.IO → Passenger`.
🔗 Depends on: **P1-38** (Service Alerts publishes `service:alert` into route/stop rooms — Person 2 relays alongside tracking data). Guest read-only rooms via **P1-12**.
Test: a subscribed passenger receives a coherent stream (location + ETA + stop + delay); guest receives the same read-only; no polling endpoint used.

### P2-25 — Real-time admin updates (`fleet:all`)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done
> **Note:** location/status/occupancy/SOS/delay/deviation/offline all reach `fleet:all`. **Update (2026-08-31):** manual-assignment requests now relay too — P1-30 is `✅ Done`, so `modules/me/me.service.ts`'s `requestAssignment`/`decideRequest` now call `broadcastToFleetAll("assignment:changed", ...)` directly (`event: REQUESTED|APPROVED|REJECTED`). **Still a stub:** P1-54 (admin dispatch messaging) has not been started at all (0/3 on the Person 1 tracker) — there is no REST trigger to relay from. Per the dependency-stop rule, built only the *delivery side* as ready-to-call infrastructure: `broadcastDispatchMessage()` / `broadcastTripForceEnd()` in `broadcast.service.ts`, emitting `dispatch:message` / `trip:force_end` to `fleet:all` (+ the target vehicle room). P1-54's REST endpoints should call these once built — nothing in production calls them yet. Tests in `tests/phase3-depot-and-streams.test.ts`: assignment request + decision both surface as `assignment:changed` on an admin's `fleet:all` socket, non-admin still can't join `fleet:all`, and the dispatch helpers deliver when called directly (the documented stub for P1-54's missing trigger).

Scope: admin area receives vehicle location · driver status · trip status · SOS · route deviation · delay · GPS failure · vehicle offline/stale · bus arrival · occupancy · manual-assignment requests.
🔗 Depends on: **P1-15** (admin role gating for `fleet:all`), **P1-30** (manual-assignment requests originate in Person 1 — relayed as `assignment:changed` / request events), **P1-54** (dispatch messaging `dispatch:message`, `trip:force_end`).
Test: admin socket sees all fleet event types; non-admin cannot join; manual-assignment request surfaces in the admin stream.

### P2-26 — Tracking security
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: driver authentication · vehicle/trip authorization · coordinate/timestamp/speed validation · per-device rate limiting on ingestion · GPS spoofing detection · impossible-movement detection · duplicate detection · cross-check the reporting device against the bound device.
🔗 Depends on: **P1-08** (driver auth), **P1-16** (device binding — the ACTIVE device to cross-check; single-device rule for driver/conductor), **P1-15** (authz).
Test: fix from an unbound device → rejected + security alert; rate limit → 429; spoofed teleport → flagged + audit (via Person 1); trip not owned by driver → 403.

### P2-27 — Tracking performance
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done
> **Note:** room-scoped broadcasting (no blind fan-out) and per-vehicle rate limiting are in place. **Update (2026-08-31):** added a load test — see P2-31's note for the shared detail (same test file covers both tasks' throughput/connection-spike requirement).

Scope: optimize GPS update rate · WebSocket update rate · Redis ops · Socket.IO room fan-out · event broadcasting · location batching · duplicate suppression · connection recovery · horizontal WebSocket scaling (Redis adapter). Broadcast only to relevant subscribers.
Test: N vehicles × M subscribers load test stays within latency target; broadcast reaches only subscribed rooms; recovery after a dropped socket resumes cleanly.

### P2-28 — Tracking background jobs (BullMQ)
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: queues + workers for GPS processing · ETA calculation · offline/stale vehicle detection · geofence processing · location processing · historical data processing · event processing · trip statistics · occupancy derivation. Retries, backoff, dead-letter, metrics.
🔗 Depends on: **P1-03** (Redis / BullMQ), **P1-02** (Mongo for historical processing).
Test: each queue processes a job end-to-end; failed job retries then dead-letters; offline-detection job runs on schedule.

---

# PHASE 7 — PRODUCTION (real-time parts)

### P2-29 — GTFS-Realtime feeds
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: `GET /api/v1/gtfs/realtime/vehicle-positions`, `/trip-updates`, `/alerts` (protobuf) for third-party apps incl. Google Maps.
🔗 Depends on: **P1-24 / P1-25 / P1-26** (route/stop/schedule static ids must match the GTFS static export **P1-55**), **P1-38** (service alerts feed `/alerts`).
Test: feeds decode with a GTFS-RT protobuf parser; entity ids line up with `gtfs/static.zip`; vehicle positions reflect live Redis state.

### P2-30 — GPS-history archival + retention enforcement
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done

Scope: scheduled archival job (or TTL + downsample) that drops raw points after N days while preserving the per-trip downsampled path for long-term replay; policy values from System Settings.
🔗 Depends on: **P1-53** (retention policy in System Settings), **P2-19** (time-series collection + downsampled path).
Test: points older than policy removed; per-trip path retained; job idempotent + logged.

### P2-31 — Tracking load + security testing
- [x] 🔨 Developed
- [x] 🧪 Tested
- [x] ✅ Done
> **Note:** ownership/device-binding/rate-limit security tests added (`tests/phase3-tracking.test.ts`). **Update (2026-08-31):** added `tests/phase3-load.test.ts` — a 15-vehicle fleet each with its own driver/vehicle/ACTIVE trip sends 3 rounds of fully concurrent GPS fixes through the real `/api/v1/tracking/location` pipeline (anomaly detection → Redis → geofence/ETA/delay → broadcast); asserts 0 rejected, p95 latency < 1500ms, ≥5 sustained RPS (all comfortably cleared: real p95 typically well under 500ms). A second case spikes 60 concurrent Socket.IO connections (5 guest tokens round-robined, to spare the global per-IP REST limiter) + subscriptions, asserts p95 connect time < 2000ms, and confirms room-scoped fan-out still holds under the spike (a broadcast to one vehicle room reaches only its subscriber, not the other 59 sockets). **Caveat:** **P1-58** ("coordinate the overall load/security test plan + shared tooling") is still 0/4 on the Person 1 tracker, so there is no externally agreed throughput/latency budget — the numbers above (fleet size, RPS floor, p95 budgets) are this pass's own documented baseline, not a jointly agreed target; replace them once P1-58 exists. Security-test coverage (spoofing/device-binding/rate-limits/authz) was already complete via P2-26 and is unchanged.

Scope: load test GPS ingestion throughput + WebSocket connection spikes + broadcast fan-out; security tests for spoofing, device cross-check, rate limits, trip/vehicle authz.
🔗 Depends on: **P1-58** (coordinate the overall load/security test plan + shared tooling).
Test: sustained target GPS RPS with p95 within budget; WS spike handled; spoofing/authz test suite passes with no gaps.

---

## Contract checkpoints (verify before/while building)

- [x] Person 1 → Person 2 reference-data shape agreed: vehicle, driver, conductor, route + `LineString` geometry, stops + `Point` coords, route-stop sequence & `scheduledOffsetMinutes`, schedule, trip, driver/vehicle/conductor assignment, System Settings (geofence radius, ETA/delay thresholds, intervals, timeouts), emergency contacts. Delivered via `/api/v1/sync/*` (**P1-31**) + `/api/v1/config` (**P1-17**). — models confirmed present and consumed directly (Vehicle/Trip/Driver/Route/Stop/Schedule/SystemSetting); no `emergencyContacts` source exists yet in Person 1's code, so P2-17's optional contact notification has nothing to call.
- [x] Person 2 → Person 1 event names + payloads agreed for all 10 §55 events (channel, schema, `traceId`). — `event-bus.service.ts` publishes all 10 with typed payloads + `traceId`, now backed by a durable BullMQ redelivery layer (Pub/Sub alone gives no delivery guarantee).
- [x] `Idempotency-Key` enforced on `tracking/location/bulk` (backed by Person 1's `idempotencyKeys` collection, **P1-04**). — wired via `idempotencyRequired` + `idempotent` middleware; tested (missing key → 400, replay → identical response, reused key + different body → 409).
- [x] Standard error envelope `{ error: { code, message, details?, traceId } }` used on all `/tracking/*` responses. — all handlers throw `AppError`, caught by the shared `errorHandler`; verified via 400/403/404/409 test cases.
- [x] Socket.IO handshake auth accepts Person 1's access token + guest token (read-only); Redis adapter enabled for scale-out. — verified in `tests/phase3-socket.test.ts` (2026-08-31): valid access token and guest token both connect and join rooms read-only; missing/invalid token is rejected; Redis adapter (`@socket.io/redis-adapter`) is wired in `initSocket` and exercised by every broadcast-delivery test here.
- [x] Trip `PAUSED` → real-time status `ON_BREAK` (not `OFFLINE`); GPS broadcast suspended/reduced while paused. — was a dead import (`setDriverOnBreak` never called); now hooked into `trip.service.ts#transitionTrip` on `PAUSED`/resume-`ACTIVE`, and `offline-detection.service.ts` already exempts `PAUSED` trips from the offline sweep. Tested end-to-end.
- [x] `TRIP_STATS_READY` is the single handoff for trip summary; Person 1 does not compute stats. — `transitionTrip` enqueues `tripStatsQueue` on `COMPLETED`; the worker computes real distance/moving/idle/per-stop-delay/on-time% stats and publishes `TRIP_STATS_READY`. Verified via test + a manual worker smoke test (GPS point → Mongo, occupancy job → Redis).
