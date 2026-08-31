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
| 3 — Real-Time Engine | P2-01 … P2-28 | 2 / 28 | 0 / 28 | 0 / 28 |
| 7 — Production (real-time) | P2-29 … P2-31 | 0 / 3 | 0 / 3 | 0 / 3 |
| **Total** | **31** | **2 / 31** | **0 / 31** | **0 / 31** |

---

# PHASE 3 — REAL-TIME ENGINE

### P2-01 — Tracking service/worker setup & foundations
- [x] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: tracking module layout under `src/modules/tracking/*` + a separate `worker` entrypoint (BullMQ), `@turf/*` deps, shared access to Mongo + Redis clients, config loading, structured logging.
🔗 Depends on: **P1-01** (project/module skeleton), **P1-02** (Mongo replica set), **P1-03** (Redis client). Coordinate on shared `config/`, `utils/logger`, error envelope from **P1-05**.
Test: worker + tracking routes boot; Mongo + Redis reachable; `@turf` imports resolve.

### P2-02 — Socket.IO server + auth handshake + rooms + Redis adapter
- [x] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: Socket.IO server, handshake auth with the access token (guest token accepted **read-only**), rooms `vehicle:{id}`, `route:{id}`, `trip:{id}`, `fleet:all`, subscribe/unsubscribe, reconnection handling, Redis adapter for horizontal scaling.
🔗 Depends on: **P1-08** (access-token issuance + JWT verify secret/claims), **P1-12** (guest token + read-only scope), **P1-15** (role claims for `fleet:all` gating).
Test: valid token joins a room; guest joining `vehicle:`/`route:`/`trip:` is read-only and rejected from `fleet:all`; bad token → connection refused; two server instances share broadcasts via the adapter.

### P2-03 — Redis real-time state schema + cold-start rebuild
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: keys `vehicle:{id}:location|status|eta|occupancy`, `trip:{id}:state`, `driver:{id}:status`, `route:{id}:vehicles`; appropriate TTLs; rebuild-from-MongoDB on cold start; Redis is **never** the source of truth.
🔗 Depends on: **P1-23** (vehicles), **P1-24** (routes + geometry), **P1-25** (stops), **P1-27** (trips) as the authoritative data to rebuild from.
Test: keys expire per TTL; flushing Redis then restarting repopulates active vehicles/trips from Mongo.

### P2-04 — GPS ingestion: `POST /tracking/location` + validation
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: accept `{ vehicleId, tripId, latitude, longitude, speed, heading, accuracy, timestamp }`; validate vehicle · driver · trip · lat · lng · timestamp · speed · accuracy; write current position to Redis; enqueue processing job.
🔗 Depends on: **P1-23** (vehicle exists + GPS device id), **P1-21** (driver identity), **P1-27 / P1-29** (trip exists and is `ACTIVE`), **P1-08** (driver auth).
Test: valid fix → 202 + Redis updated; unknown vehicle/trip → 404; non-active trip → 409; malformed payload → 400 envelope.

### P2-05 — GPS anomaly detection
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: detect duplicate GPS · invalid GPS · out-of-order GPS · impossible speed · suspicious movement (multi-km jump in seconds). Drop or flag per rule; device timestamps used only for ordering, scheduling math uses server time.
Test: replayed fix dropped; out-of-order older-than-last dropped; teleport jump flagged suspicious; jitter within tolerance accepted.

### P2-06 — Offline GPS bulk sync: `POST /tracking/location/bulk`
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: bulk ingestion · duplicate detection · timestamp validation · ordered processing · retry/failed-sync handling; queued offline trip-lifecycle events reconcile through the same path; after backlog flush the **live position jumps to now** — do not replay stale points as current. Requires `Idempotency-Key` per batch.
🔗 Depends on: **P1-04** (`idempotencyKeys` collection + middleware). Trip lifecycle events reconcile against **P1-27 / P1-28**.
Test: replayed batch → no duplicates, per-item results; out-of-order items sorted; after flush, `vehicle:{id}:location` = latest real time, not backlog tail.

### P2-07 — `POST /tracking/heartbeat`
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: foregrounded-but-stationary client signals liveness without a full fix; refresh `lastSeen`; feeds the two-stage offline logic (§45).
Test: heartbeat refreshes liveness; absence of both fixes and heartbeats advances STALE→OFFLINE per thresholds.

### P2-08 — Tracking read APIs
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /tracking/vehicle/:id`, `GET /tracking/route/:id`, `GET /tracking/trip/:id` — current location/status/ETA/current-stop from Redis (fallback Mongo). Read authorization; passenger/admin reads are WS-first, these are for initial hydration only.
🔗 Depends on: **P1-15** (RBAC guards / `authorize` middleware).
Test: returns hydrated snapshot; unauthorized role → 403; unknown id → 404.

### P2-09 — Geospatial processing core + in-memory cache
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `@turf/*` helpers — nearest stop, point-to-line distance, `nearest-point-on-line` projection, `along` / `line-slice` / `length` for distance-remaining, bearing, buffer generation for geofences; MongoDB `$near`/`$geoNear` for candidate stops; keep active route `LineString`s + ordered stop lists **cached in memory** in the worker (refresh on change).
🔗 Depends on: **P1-24** (route geometry `LineString` + ordered `[{stopId, sequence, scheduledOffsetMinutes}]`), **P1-25** (stop `Point` coords + `2dsphere`). Needs **P1-31** or change signal to invalidate the in-memory cache on route/stop edits.
Test: projection + distance-remaining match a known fixture route; cache invalidates within N seconds of a route edit.

### P2-10 — Geofencing
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: geofences for stops, depots, routes; detect bus approaching stop · arriving at stop · leaving stop · depot arrival · depot departure; radius from System Settings.
🔗 Depends on: **P1-25** (stop coords), **P1-24** (route stop sequence), **P1-53 / P1-17** (`geofenceRadiusMeters` from settings/config). Depot polygons from Person 1 `depots` data if present.
Test: simulated approach → `vehicle:arriving`; entering radius → `vehicle:arrived`; exit → `vehicle:left`; radius change in settings takes effect.

### P2-11 — Current-stop detection
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: compute previous / current / next stop, distance to next, distance from previous, arrival, departure — from route geometry + stop sequence via projection onto the `LineString`.
🔗 Depends on: **P1-24** (route geometry + ordered stops + offsets).
Test: along a fixture trip, prev/current/next advance correctly; distances monotonic between stops; arrival/departure fire once each.

### P2-12 — ETA engine
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: MVP `ETA = distance_along_route / current_speed`; return `{ vehicleId, nextStop, eta }` and per upcoming stop; publish to `vehicle:{id}:eta`; advanced inputs (historical time, time-of-day, dwell) as follow-up.
🔗 Depends on: **P1-24** (scheduled offsets / stop order), **P1-53 / P1-17** (`etaThresholds`). Consumed by Person 1 **P1-34** (Journey Planner live ETA).
Test: known speed + remaining distance → expected ETA; ETA recomputed each fix; zero speed handled (no divide-by-zero, falls back to last ETA / schedule).

### P2-13 — Delay detection
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: compare scheduled arrival vs predicted arrival; statuses `EARLY, ON_TIME, DELAYED, SEVERELY_DELAYED` (thresholds from settings); emit `vehicle:delay` (Socket.IO) + `VEHICLE_DELAYED` (event bus).
🔗 Depends on: **P1-26** (schedules / scheduled arrival times per stop), **P1-53 / P1-17** (`delayThresholds { onTime, delayed, severe }`). Consumed by Person 1 **P1-37** (notifications), **P1-50** (analytics).
Test: predicted arrival past threshold → `DELAYED` then `SEVERELY_DELAYED`; recovery returns to `ON_TIME`; event emitted once per status change.

### P2-14 — Route deviation detection
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: cache each active route `LineString` in memory; compute perpendicular distance with `@turf/point-to-line-distance` on every fix; flag deviation when distance > threshold for > N seconds; return-to-route when back within threshold; emit `route:deviation` + `ROUTE_DEVIATION`.
🔗 Depends on: **P1-24** (route `LineString`), **P1-53 / P1-17** (deviation threshold + dwell seconds). Consumed by Person 1 **P1-37** (notifications), **P1-49** (incident record).
Test: off-route track > threshold for > N s → one `ROUTE_DEVIATION`; brief GPS noise does not trigger; return emits return-to-route.

### P2-15 — Vehicle offline / stale detection
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: monitor last GPS timestamp / heartbeat against `offlineVehicleTimeoutSeconds`; two-stage — `STALE` after a short timeout (surface to dispatcher, no incident), `OFFLINE` + incident only after a longer timeout; detect GPS/network/device offline · stale GPS · reconnection; do **not** flag `OFFLINE` while the trip is `PAUSED`/`ON_BREAK`; emit `vehicle:offline` + `VEHICLE_OFFLINE`.
🔗 Depends on: **P1-28** (trip `PAUSED` state exposed so `ON_BREAK` is distinguishable), **P1-53 / P1-17** (`offlineVehicleTimeoutSeconds` + stale timeout). Consumed by Person 1 **P1-49** (incident).
Test: silence past short timeout → `STALE` (no incident); past long timeout → `OFFLINE` + `VEHICLE_OFFLINE`; paused trip stays `ON_BREAK`; reconnect clears state.

### P2-16 — Driver real-time status
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `ONLINE, OFFLINE, ON_TRIP, ON_BREAK, IDLE, SOS, GPS_ERROR`; maintain `driver:{id}:status` in Redis; broadcast `vehicle:status` / driver status to admin.
🔗 Depends on: **P1-21** (driver identity), **P1-27 / P1-28** (trip lifecycle drives `ON_TRIP` / `ON_BREAK`).
Test: starting a trip → `ON_TRIP`; pause → `ON_BREAK`; no fixes while online → `IDLE`; SOS → `SOS`.

### P2-17 — Driver SOS
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `POST /tracking/sos` → emit `driver:sos` with driver · vehicle · location · trip · route · timestamp; emit `sos:acknowledged` back to the driver client when a dispatcher acknowledges; optionally notify the driver's emergency contacts.
🔗 Depends on: **P1-49** (Person 1 creates the permanent incident record from `DRIVER_SOS`), **emergencyContacts** data served by Person 1 (§47 / collection), dispatcher acknowledge action from Person 1 admin (**P1-54**).
Test: SOS emits `driver:sos` to `fleet:all` + creates incident (via event); dispatcher ack → `sos:acknowledged` reaches the driver; emergency-contact notification fired when contacts exist.

### P2-18 — Live vehicle tracking broadcast
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: push `vehicle:location`, `vehicle:status`, `vehicle:arriving/arrived/left`, `vehicle:occupancy`, current/next stop, last-update time to **subscribed rooms only** — no per-passenger polling.
Test: only room subscribers receive events; unsubscribed client gets nothing; payload matches the documented shape.

### P2-19 — GPS history persistence (MongoDB time-series)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `gpsHistory` time-series collection (`timeField: timestamp`, `metaField: { vehicleId, tripId, driverId }`, `granularity: "seconds"`), GeoJSON `location` `Point` + speed/heading/accuracy; `2dsphere` on `location`; compound `{ "meta.tripId": 1, timestamp: 1 }`; TTL index for raw-point retention; keep a downsampled per-trip path on the trip document. Async write off the ingestion hot path.
🔗 Depends on: **P1-02** (replica set — time-series + change streams), **P1-27** (trip ids for `metaField` + the trip doc to store the downsampled path), **P1-53** (retention days policy).
Test: points written async; query by trip returns ordered path; TTL drops points past N days; downsampled path present on trip after end.

### P2-20 — Trip replay
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /tracking/trip/:tripId/history` — GPS points in chronological order for admin replay (start → points → stops → end).
🔗 Depends on: **P1-15** (admin RBAC), **P1-27** (trip existence).
Test: returns full ordered path for a completed trip; respects retention (missing old points handled); non-admin → 403.

### P2-21 — Trip statistics on trip end
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: on trip end, compute total distance, moving time, idle time, stops served, per-stop actual vs scheduled arrival, overall on-time/delay, average speed, max speed; finalise the GPS trail; emit `TRIP_STATS_READY`.
🔗 Depends on: **P1-28** (`PATCH /trips/:id { action: "end" }` and `POST /admin/trips/:id/force-end` **P1-29** are the triggers). Two-way contract: Person 1 **P1-28** waits for `TRIP_STATS_READY` to store the trip summary.
Test: ending a fixture trip emits `TRIP_STATS_READY` with correct distance/duration/on-time; force-end path also emits; Person 1 receives and stores.

### P2-22 — Occupancy broadcast
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: consume conductor passenger-count updates + vehicle capacity → derive `LOW / MODERATE / CROWDED`; write `vehicle:{id}:occupancy`; emit `vehicle:occupancy` to route/vehicle rooms and `OCCUPANCY_CHANGED` to Person 1.
🔗 Depends on: **P1-22 / P1-46** (conductor passenger-count endpoint + bulk sync produce the counts), **P1-23** (vehicle `capacity`). Consumed by Person 1 **P1-47** (analytics).
Test: count/capacity ratio maps to the right band; band change emits `vehicle:occupancy` + `OCCUPANCY_CHANGED`; no emit when band unchanged.

### P2-23 — Event bus: Person 2 → Person 1
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: Redis Pub/Sub (or event bus) channels + typed payloads for `BUS_APPROACHING_STOP, BUS_ARRIVED_STOP, BUS_LEFT_STOP, VEHICLE_DELAYED, VEHICLE_OFFLINE, ROUTE_DEVIATION, DRIVER_SOS, GPS_FAILURE, TRIP_STATS_READY, OCCUPANCY_CHANGED`. At-least-once delivery; include `traceId`.
🔗 Depends on: agreed payload schemas with Person 1 (contract checkpoint). Consumed by Person 1 **P1-37** (notifications), **P1-49** (incidents), **P1-50/P1-51** (analytics/reports), **P1-47** (occupancy).
Test: each event published on its channel with the agreed schema; Person 1 test subscriber receives and parses all 10; redelivery on consumer restart.

### P2-24 — Real-time passenger updates (aggregation)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: passenger room receives vehicle location · ETA · current stop · next stop · delay · vehicle status · arrival/departure · occupancy · service alerts. WebSockets only. Flow: `Driver GPS → Backend → Redis → Socket.IO → Passenger`.
🔗 Depends on: **P1-38** (Service Alerts publishes `service:alert` into route/stop rooms — Person 2 relays alongside tracking data). Guest read-only rooms via **P1-12**.
Test: a subscribed passenger receives a coherent stream (location + ETA + stop + delay); guest receives the same read-only; no polling endpoint used.

### P2-25 — Real-time admin updates (`fleet:all`)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: admin area receives vehicle location · driver status · trip status · SOS · route deviation · delay · GPS failure · vehicle offline/stale · bus arrival · occupancy · manual-assignment requests.
🔗 Depends on: **P1-15** (admin role gating for `fleet:all`), **P1-30** (manual-assignment requests originate in Person 1 — relayed as `assignment:changed` / request events), **P1-54** (dispatch messaging `dispatch:message`, `trip:force_end`).
Test: admin socket sees all fleet event types; non-admin cannot join; manual-assignment request surfaces in the admin stream.

### P2-26 — Tracking security
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: driver authentication · vehicle/trip authorization · coordinate/timestamp/speed validation · per-device rate limiting on ingestion · GPS spoofing detection · impossible-movement detection · duplicate detection · cross-check the reporting device against the bound device.
🔗 Depends on: **P1-08** (driver auth), **P1-16** (device binding — the ACTIVE device to cross-check; single-device rule for driver/conductor), **P1-15** (authz).
Test: fix from an unbound device → rejected + security alert; rate limit → 429; spoofed teleport → flagged + audit (via Person 1); trip not owned by driver → 403.

### P2-27 — Tracking performance
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: optimize GPS update rate · WebSocket update rate · Redis ops · Socket.IO room fan-out · event broadcasting · location batching · duplicate suppression · connection recovery · horizontal WebSocket scaling (Redis adapter). Broadcast only to relevant subscribers.
Test: N vehicles × M subscribers load test stays within latency target; broadcast reaches only subscribed rooms; recovery after a dropped socket resumes cleanly.

### P2-28 — Tracking background jobs (BullMQ)
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: queues + workers for GPS processing · ETA calculation · offline/stale vehicle detection · geofence processing · location processing · historical data processing · event processing · trip statistics · occupancy derivation. Retries, backoff, dead-letter, metrics.
🔗 Depends on: **P1-03** (Redis / BullMQ), **P1-02** (Mongo for historical processing).
Test: each queue processes a job end-to-end; failed job retries then dead-letters; offline-detection job runs on schedule.

---

# PHASE 7 — PRODUCTION (real-time parts)

### P2-29 — GTFS-Realtime feeds
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: `GET /api/v1/gtfs/realtime/vehicle-positions`, `/trip-updates`, `/alerts` (protobuf) for third-party apps incl. Google Maps.
🔗 Depends on: **P1-24 / P1-25 / P1-26** (route/stop/schedule static ids must match the GTFS static export **P1-55**), **P1-38** (service alerts feed `/alerts`).
Test: feeds decode with a GTFS-RT protobuf parser; entity ids line up with `gtfs/static.zip`; vehicle positions reflect live Redis state.

### P2-30 — GPS-history archival + retention enforcement
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: scheduled archival job (or TTL + downsample) that drops raw points after N days while preserving the per-trip downsampled path for long-term replay; policy values from System Settings.
🔗 Depends on: **P1-53** (retention policy in System Settings), **P2-19** (time-series collection + downsampled path).
Test: points older than policy removed; per-trip path retained; job idempotent + logged.

### P2-31 — Tracking load + security testing
- [ ] 🔨 Developed
- [ ] 🧪 Tested
- [ ] ✅ Done

Scope: load test GPS ingestion throughput + WebSocket connection spikes + broadcast fan-out; security tests for spoofing, device cross-check, rate limits, trip/vehicle authz.
🔗 Depends on: **P1-58** (coordinate the overall load/security test plan + shared tooling).
Test: sustained target GPS RPS with p95 within budget; WS spike handled; spoofing/authz test suite passes with no gaps.

---

## Contract checkpoints (verify before/while building)

- [ ] Person 1 → Person 2 reference-data shape agreed: vehicle, driver, conductor, route + `LineString` geometry, stops + `Point` coords, route-stop sequence & `scheduledOffsetMinutes`, schedule, trip, driver/vehicle/conductor assignment, System Settings (geofence radius, ETA/delay thresholds, intervals, timeouts), emergency contacts. Delivered via `/api/v1/sync/*` (**P1-31**) + `/api/v1/config` (**P1-17**).
- [ ] Person 2 → Person 1 event names + payloads agreed for all 10 §55 events (channel, schema, `traceId`).
- [ ] `Idempotency-Key` enforced on `tracking/location/bulk` (backed by Person 1's `idempotencyKeys` collection, **P1-04**).
- [ ] Standard error envelope `{ error: { code, message, details?, traceId } }` used on all `/tracking/*` responses.
- [ ] Socket.IO handshake auth accepts Person 1's access token + guest token (read-only); Redis adapter enabled for scale-out.
- [ ] Trip `PAUSED` → real-time status `ON_BREAK` (not `OFFLINE`); GPS broadcast suspended/reduced while paused.
- [ ] `TRIP_STATS_READY` is the single handoff for trip summary; Person 1 does not compute stats.
