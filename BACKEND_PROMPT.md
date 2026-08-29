# Real-Time Public Transport Tracking System — Backend Development Prompt (Final)

> **Revision notes for this version**
> - Persistence is **MongoDB only** (with the **Mongoose** ODM), plus **Redis** strictly for ephemeral real-time state and Pub/Sub. **No PostgreSQL / PostGIS.**
> - Geospatial data is stored as **GeoJSON** with **`2dsphere`** indexes. MongoDB has no native point-to-LineString distance, so route-deviation and along-route projection are computed in the application layer with **`@turf/*`** (see §41, §44, §56).
> - MongoDB must run as a **replica set** (even single-node in dev) so multi-document **transactions** and **change streams** are available.
> - There is **one frontend**: a single **Next.js (App Router) Progressive Web App** with role-based areas (Passenger, Driver, Conductor, Admin). Built by **one** frontend developer. The backend stays frontend-agnostic.
> - Push notifications use **Web Push (VAPID)** / FCM-for-Web, not native FCM device tokens.
> - Auth must support the browser: refresh token as an **httpOnly, Secure, SameSite cookie**; short-lived access token in the response body; bearer also accepted.

You are a senior backend architect and Node.js/TypeScript engineer.

We are building a **Real-Time Public Transport Tracking System for Small Cities**.

## Frontend

**One Next.js App Router PWA** with role-based areas served from a single codebase:

- **Public / Passenger area** — Passenger and **guest (anonymous)** mode.
- **Operations area** — Driver, Conductor.
- **Admin area** — Super Admin, Admin, Transport Manager, Dispatcher, Maintenance Manager, Support Staff.

The backend exposes versioned REST APIs (`/api/v1/*`), a Socket.IO real-time layer, an **OpenAPI 3.1 spec**, and a **mock server** (delivered in Phase 1) so the frontend can develop in parallel.

## Tech Stack

Node.js · TypeScript · Express.js · MongoDB (replica set) · Mongoose ODM · `@turf/*` for geospatial math · Redis · Socket.IO · BullMQ · JWT or Better Auth · AWS S3 (file uploads) · Web Push (VAPID) · Docker · REST APIs · WebSockets.

The system must support real-time vehicle tracking, GPS processing, ETA, geofencing, route deviation detection, delay detection, notifications, fleet management, ticketing, payments, maintenance, complaints, analytics, and administration.

---

# DEVELOPMENT RULE — 2 Backend Developers

Divide the backend into two clearly separated ownership areas. **Do not duplicate ownership.** Define interfaces/contracts (API + events) between them before coding.

## PERSON 1 — Business logic, CRUD, administration, permanent data

Owns: Authentication · Authorization · RBAC · Users · Passengers · Drivers · Conductors · Vehicles · Routes · Stops · Schedules · Trips (business lifecycle) · Fares · Ticketing · Payments · Maintenance · Complaints · Lost & Found · Incidents (business workflow) · Notifications (service) · Analytics · Reports · Audit Logs · System Settings · Admin APIs
**plus:** Client Bootstrap/Config · My-Assignment & Attendance · Device / Web-Push Subscription registration · Reference-Data Sync · File Uploads (presign) · Fare Calculation · Conductor Offline Sync · Payment QR · Service Alerts & Announcements · Journey Planner · Favourite Subscriptions · Guest Sessions · GTFS Static Export.

Person 1 focuses on **business logic, CRUD, administrative operations, and permanent business data**.

## PERSON 2 — Real-Time Tracking Engine

Owns: GPS ingestion · Redis real-time state · Socket.IO · Real-time events · ETA · Geofencing · Current-stop detection · Route deviation · Delay detection · Offline vehicle detection · Offline GPS sync · GPS history (MongoDB time-series collection) · Trip replay · Driver SOS (real-time) · Geospatial processing (`2dsphere` + `@turf/*`) · Tracking performance & security · Tracking background jobs
**plus:** Trip-statistics generation on trip end · Occupancy/crowding broadcast · GTFS-Realtime feeds.

Person 2 focuses on **real-time tracking and geospatial processing**.

---

# PERSON 1 — DETAILED RESPONSIBILITIES

## 1. Authentication

Implement: Registration · Login · Logout · Mobile OTP · Email/password auth · Refresh token · Forgot / Reset / Change password · Session management · Device/session management · Profile management.

- **Browser-friendly tokens:** issue the refresh token as an **httpOnly, Secure, SameSite=strict cookie**; return a short-TTL access token in the response body. Also accept `Authorization: Bearer` for non-browser clients. Provide `POST /api/v1/auth/refresh` that reads the cookie.
- **Guest sessions:** `POST /api/v1/auth/guest` issues a short-lived, read-only passenger-scope token. Guests may search, plan journeys, view live tracking, and join read-only Socket.IO rooms; they may **not** favourite, complain, or buy tickets until they register.
- **OTP abuse protection:** per-number and per-IP rate limits, lockout, resend cooldown.

Secure all authentication APIs.

## 2. RBAC

Roles: `SUPER_ADMIN`, `ADMIN`, `TRANSPORT_MANAGER`, `DISPATCHER`, `MAINTENANCE_MANAGER`, `SUPPORT_STAFF`, `DRIVER`, `CONDUCTOR`, `PASSENGER`, `GUEST`.

Implement roles, permissions, role-permission mapping, API authorization, resource authorization, permission middleware/guards.

Permissions: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `ASSIGN`, `APPROVE`, `MANAGE`.

**Backend authorization must always be enforced server-side. Never depend on frontend role checks.**

## 3. User Management

Create · Get (list) · Get by ID · Update · Activate/deactivate · Delete · Search · Filter · Pagination · Profile · Status · Activity.

## 4. Passenger Management

Passenger profile · preferences · favorite routes · favorite stops · saved locations · recent searches · history · block/unblock.

Passenger features: search routes · search stops · find bus source→destination · view route details · view stop details · view ETA (from real-time service) · view live vehicle location · favorites · notifications · complaints · Lost & Found · tickets · payments. See §26 (Journey Planner) and §29 (Favourite Subscriptions).

## 5. Driver Management

Driver CRUD · profile · employee ID · license details · license expiry · joining date · driver status · attendance · shift management · vehicle assignment · route assignment · schedule assignment · driver performance · driver trip history · driver complaints.

- **Self-view:** expose read-only `GET /api/v1/me/performance` (trips completed, late trips, deviations, rating, working hours) for the operations area. Full performance analytics remain admin-only.

Person 2 handles the driver's real-time online/GPS state.

## 6. Conductor Management

Conductor CRUD · profile · employee ID · shift · attendance · vehicle assignment · route assignment · trip assignment · ticket sales · revenue collection · conductor performance. See §25 (Fare Calculation) and §33 (Conductor Offline Sync).

## 7. Vehicle Management

Vehicle CRUD · registration number · model · type · capacity · fuel type · GPS device ID · vehicle status · driver assignment · conductor assignment · route assignment · vehicle history.

Business statuses: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `RETIRED`.

- Add `wheelchairAccessible` (bool) and `amenities` (jsonb). Expose in all passenger-facing reads.

Person 2 owns real-time location and real-time status.

## 8. Route Management

Create · Update · Delete · Activate/deactivate · route number · route name · source · destination · distance · estimated duration · route geometry (**GeoJSON `LineString`**, `2dsphere` index) · direction · route status.

Route-stop management: add stop · remove stop · reorder stops · stop sequence. Store the ordered stop list on the route document (array of `{ stopId, sequence, scheduledOffsetMinutes }`) plus a denormalised `stops` reference collection; `scheduledOffsetMinutes` (from route start) lets schedules and ETAs be computed per stop.

## 9. Stop Management

Create · Update · Delete/deactivate · stop name · location (**GeoJSON `Point`** `[lng, lat]`, `2dsphere` index) · facilities · shelter · accessibility · nearby landmarks · route assignment.

Person 2 uses these coordinates for geofencing and current-stop detection.

## 10. Schedule Management

Create · Update · Delete · assign route · assign vehicle · assign driver · assign conductor · operating hours · daily · weekly · weekend · holiday · special schedules.

- Schedule generation must materialise concrete **trip instances** (see §11) for a given date range so §25 (My Assignment) can read them.

## 11. Trip Management (business lifecycle)

Statuses: `SCHEDULED`, `ASSIGNED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`, `MISSED`.

- Transitions: `ACTIVE → PAUSED → ACTIVE`; `PAUSED → COMPLETED` allowed. While `PAUSED`, Person 2 suspends/reduces GPS broadcast and sets the vehicle real-time status to `ON_BREAK` (not `OFFLINE`).

Implement: create trip · assign trip/driver/vehicle/conductor · schedule · cancel · complete · miss · trip history · trip summary.

- `GET /api/v1/me/active-trip` — returns the caller's currently open trip (`ACTIVE`/`PAUSED`) with resume state: tripId, route (geometry + ordered stops + offsets), last known position, current/next stop, startedAt. Used for reload/crash recovery (important: the web PWA can be reloaded or backgrounded at any time).
- `PATCH /api/v1/trips/:id { action: "pause" | "resume" | "end" }` — requires `Idempotency-Key`. On `end`, Person 2 finalises the GPS trail and emits **trip statistics** (distance, duration, stops served, on-time vs schedule); Person 1 stores these as the trip summary.
- `POST /api/v1/trips` (start) — requires `Idempotency-Key`.
- `POST /api/v1/admin/trips/:id/force-end` — DISPATCHER ends a trip remotely; emits `trip:completed` and notifies the operations area.
- **Pre-trip checklist:** `POST /api/v1/trips/:id/checklist` (fuel, tyres, brakes, lights, documents-valid, cleanliness). Store the record; a System Settings flag `checklistBlocksTripStart` decides whether a failed item blocks trip start.

Person 2 owns GPS/tracking during an active trip.

## 12. Fare Management

Create · Update · Delete · route-based fares · distance/stage-based fares · passenger categories · student discount · senior citizen discount · concessions · daily/weekly/monthly pass. See §25 (Fare Calculation endpoint) — clients never compute fare.

## 13. Ticketing

Ticket creation · QR ticket · ticket validation · cancellation · expiry · history · search · daily/weekly/monthly/student pass. Ticket creation and bulk ticket sync require an `Idempotency-Key`.

## 14. Payments

Payment creation · verification · status · gateway integration · UPI · card · net banking · wallet · refund · transaction history · failed payments · reconciliation. Use **webhook-based** verification where supported. See §27 (Payment QR).

## 15. Maintenance

Vehicle maintenance · service schedule · service history · repairs · parts · tyre replacement · oil changes · inspections.

Vehicle documents: registration · insurance · fitness certificate · pollution certificate — with expiry management (insurance/registration/fitness/PUC expiry, service due) and reminder jobs.

## 16. Complaint Management

Create · categories · view · assign · update · escalate · resolve · close · history · attachments · passenger feedback · rating.

Categories: bus delay · driver behavior · conductor behavior · vehicle condition · cleanliness · overcrowding · route issue · fare issue · safety · other. Attachments use presigned S3 uploads (§32).

## 17. Lost & Found

Lost item report · found item report · description · image attachment · vehicle info · route info · date/time · lost/found matching · staff assignment · status updates · return confirmation · case closure.

## 18. Incident Management (business workflow)

Statuses: `OPEN`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.

Types: accident · breakdown · passenger incident · traffic · route issue · other.

Person 2 emits real-time signals (`DRIVER_SOS`, `ROUTE_DEVIATION`, `GPS_FAILURE`, `VEHICLE_OFFLINE`); Person 1 converts them into incident records and runs the workflow.

## 19. Notification Service

Channels: **Web Push (VAPID)** · SMS · email · in-app.

Templates · preferences · history · read/unread · user settings. Preferences add `quietHours { start, end }` and `digest` (bool).

- **Web Push:** store a `PushSubscription` (endpoint + p256dh + auth keys) per user per browser (see §30). Send via VAPID. Note: iOS delivers web push only to an **installed** PWA on iOS 16.4+; handle missing/expired subscriptions gracefully (410 → delete).

Consumes Person 2 events (`BUS_APPROACHING`, `BUS_ARRIVED`, `BUS_DELAYED`, `VEHICLE_OFFLINE`, `ROUTE_DEVIATION`, `DRIVER_SOS`) and Service Alerts (§28) to fan out to the right users (incl. favourite subscribers, §29).

## 20. Analytics

Passengers (daily/monthly/active/new users, popular routes/stops, peak hours) · Vehicles (utilization, trips, distance, performance) · Drivers (trips completed, delays, complaints, attendance, working hours) · Routes (popular routes, avg travel time, performance, delay stats) · Revenue (daily/monthly, per route/vehicle/payment method).

## 21. Reports

Vehicles · Drivers · Conductors · Routes · Stops · Trips · Passengers · Tickets · Payments · Revenue · Complaints · Maintenance · Incidents. Filters: date · route · vehicle · driver. Export CSV/PDF where required.

## 22. Audit Logs

Track: login · logout · user create/update · vehicle/route/schedule changes · permission changes · admin actions · deletes · important business actions.

Record: user · action · resource · resourceId · oldValue · newValue · timestamp · IP/device.

## 23. System Settings

Organization · city · operating hours · holidays · fare settings · notification settings · language settings · ETA thresholds · delay thresholds · geofence configuration · system configuration.

Also: `checklistBlocksTripStart` · `gpsSendIntervalSeconds` · `offlineVehicleTimeoutSeconds` · `mapTileSource` · `minSupportedAppVersion` · `featureFlags`.

These admin-managed values are surfaced to the frontend only via `GET /api/v1/config` (§24) — never hard-coded client-side.

---

# PERSON 1 — ADDITIONAL MODULES

## 24. Client Bootstrap & Config

- `GET /api/v1/config` — Auth: any authenticated user or guest (role-filtered payload). Returns `gpsSendIntervalSeconds`, `geofenceRadiusMeters`, `etaThresholds`, `delayThresholds { onTime, delayed, severe }`, `mapTileSource`, `supportedLanguages`, `minSupportedAppVersion`, `featureFlags`, `vapidPublicKey`, `serverTime` (epoch ms). Single call the frontend makes on load.
- `GET /api/v1/time` — server epoch ms; clients correct clock skew for scheduling math.

## 25. My Assignment & Attendance

- `GET /api/v1/me/assignments?date=YYYY-MM-DD` — Auth: `DRIVER`/`CONDUCTOR`. Returns assigned vehicle, route (geometry + ordered stops + offsets + scheduled times), shift window, list of scheduled trips with status.
- `POST /api/v1/me/assignments/request` — staff requests a manual assignment when none exists; `DISPATCHER` approves/rejects from the admin area.
- `POST /api/v1/me/attendance/check-in` · `POST /api/v1/me/attendance/check-out` — marks staff on/off duty against the shift; feeds performance.

## 26. Journey Planner

- `GET /api/v1/journeys?from=<lat,lng|stopId>&to=<lat,lng|stopId>&time=<ts>` — ranked journey options: legs (walk/ride), transfer points, walking distance to first stop, per-leg and total fare, total duration, next departure per leg with live ETA where a trip is active.

## 27. Fare Calculation & Payment QR

- `POST /api/v1/fares/calculate { routeId, boardingStopId, destinationStopId, passengerCategory, concessionId? }` → `{ amount, currency, breakdown, appliedConcession }`. Conductor area and passenger ticketing both call this.
- `POST /api/v1/payments/qr { tripId, amount, purpose }` → dynamic UPI string / QR payload the passenger scans; verified via the payment webhook; on success emits `payment:confirmed` for the conductor area.

## 28. Service Alerts & Announcements

- CRUD `/api/v1/admin/service-alerts` — fields: title, message, severity, type (`disruption|closure|weather|emergency|general`), targeting (`routeIds[] | stopIds[] | geoArea | all`), `startsAt`, `endsAt`, status.
- `GET /api/v1/service-alerts?routeId=&stopId=` — public/passenger read.
- On publish → fan out via Notification Service to affected favourite/route subscribers **and** push a Socket.IO `service:alert` event to the relevant rooms.

## 29. Favourite Subscriptions

- `POST /api/v1/passengers/me/subscriptions { type: "route"|"stop", targetId }` — creates the link the Notification Service uses to push `BUS_DELAYED`, `ROUTE_DEVIATION`, `trip:cancelled`, and service-alert events for followed routes/stops. `GET` / `DELETE` to manage.

## 30. Device / Web-Push Subscription Registration

- `POST /api/v1/auth/devices { deviceId, userAgent, pushSubscription, appVersion }` · `DELETE /api/v1/auth/devices/:deviceId` · `GET /api/v1/auth/devices`.
- `pushSubscription` is the browser `PushSubscription` JSON (endpoint + keys) for Web Push; may be null until the user grants permission, then patched in.
- Rules: `DRIVER`/`CONDUCTOR` may have only **one ACTIVE device** at a time; a second registration needs admin approval and raises an audit + security alert (anti GPS-spoofing).

## 31. Reference-Data Sync

- `GET /api/v1/sync/routes|stops|fares|schedules?updatedSince=<ts>` — support `ETag`/`If-None-Match` and `updatedSince` delta responses; each response carries a version/checksum so the frontend caches for offline use and refreshes only deltas.

## 32. File Uploads

- `POST /api/v1/uploads/presign { purpose, contentType, sizeBytes }` → short-lived S3 presigned PUT URL + final object key. Purposes: `complaint`, `incident`, `lost_found`, `profile`, `vehicle_document`. Client PUTs to S3, then submits the key with the parent record. Enforce max size and content-type allowlist server-side.

## 33. Conductor Offline Sync

- `POST /api/v1/tickets/bulk` · `POST /api/v1/trips/:id/passenger-count/bulk` — each item carries a client `Idempotency-Key`; server dedupes, validates timestamps, processes in order, returns per-item results.
- `POST /api/v1/trips/:id/reconciliation { ticketsIssued, cashCollected, digitalCollected }` — server computes expected vs collected variance for revenue analytics.

## 34. GTFS Static Export

- `GET /api/v1/gtfs/static.zip` — routes, stops, schedules, fares in GTFS format for third-party apps. (GTFS-Realtime feeds are Person 2, §60.)

---

# PERSON 2 — DETAILED RESPONSIBILITIES

## 35. GPS Tracking (ingestion)

Driver browser sends:

```json
{ "vehicleId": "BUS-101", "tripId": "TRIP-123", "latitude": 19.076, "longitude": 72.877,
  "speed": 32, "heading": 180, "accuracy": 8, "timestamp": 1788000000 }
```

Validate: vehicle · driver · trip · latitude · longitude · timestamp · speed · accuracy.

Detect: duplicate GPS · invalid GPS · out-of-order GPS · impossible speed · suspicious movement.

> **Note on the web PWA driver client:** browsers cannot run reliable background geolocation. The driver client streams fixes only while the page is foregrounded with a Wake Lock held; when backgrounded it will pause and then flush a backlog on return. Design ingestion and offline-detection thresholds accordingly (see §45).

## 36. Tracking APIs

```
POST /tracking/location
POST /tracking/location/bulk
POST /tracking/heartbeat
GET  /tracking/vehicle/:id
GET  /tracking/route/:id
GET  /tracking/trip/:id
GET  /tracking/trip/:id/history
POST /tracking/sos
```

Secure with driver authentication and vehicle/trip authorization. Per-device rate limiting on ingestion. `POST /tracking/heartbeat` lets a foregrounded-but-stationary client signal liveness without a full fix.

## 37. Redis (real-time state, not source of truth)

```
vehicle:{id}:location      vehicle:{id}:status
trip:{id}:state            driver:{id}:status
route:{id}:vehicles        vehicle:{id}:eta
vehicle:{id}:occupancy
```

Stores current location, active trip, online driver, current/next stop, ETA, real-time status, occupancy level. Appropriate TTLs; rebuild-from-DB on cold start. **Redis is never the permanent source of truth.**

## 38. Socket.IO

Rooms: `vehicle:{id}` · `route:{id}` · `trip:{id}` · `fleet:all`.

Events:

```
vehicle:location   vehicle:status
vehicle:arriving   vehicle:arrived   vehicle:left
trip:started       trip:paused       trip:resumed       trip:completed   trip:cancelled
vehicle:delay      route:deviation   vehicle:offline    vehicle:occupancy
driver:sos         sos:acknowledged  gps:error
payment:confirmed  service:alert     assignment:changed   dispatch:message   trip:force_end
```

Guests may join `vehicle:` / `route:` / `trip:` rooms read-only. Auth via handshake token. Use the Redis adapter for horizontal scaling.

## 39. Live Vehicle Tracking

Real-time data: latitude · longitude · speed · direction · vehicle status · route · current stop · next stop · last update time · occupancy. Sent to the passenger and admin areas via subscribed rooms only.

## 40. Geofencing

For stops, depots, routes. Detect: bus approaching stop · arriving at stop · leaving stop · depot arrival · depot departure. Radius from System Settings.

## 41. Current-Stop Detection

Compute previous / current / next stop, distance to next, distance from previous, arrival, departure — from route geometry + stop sequence. Project the vehicle position onto the route `LineString` in the app layer with `@turf/nearest-point-on-line` + `@turf/line-slice` / `@turf/length`; MongoDB is used only to fetch the route geometry and the nearest candidate stops (`$near`).

## 42. ETA Engine

MVP: `ETA = distance_along_route / current_speed`. Advanced: current speed · historical travel time · time of day · day of week · stop dwell time · traffic · weather. Return `{ vehicleId, nextStop, eta }` and per upcoming stop. Publish to `vehicle:{id}:eta`.

## 43. Delay Detection

Compare scheduled arrival vs predicted arrival. Statuses: `EARLY`, `ON_TIME`, `DELAYED`, `SEVERELY_DELAYED` (thresholds from settings). Emit `vehicle:delay` + `VEHICLE_DELAYED` event.

## 44. Route Deviation Detection

Route matching · distance from route geometry · deviation threshold · deviation detection · return-to-route detection. Emit `route:deviation` + `ROUTE_DEVIATION` event.

- MongoDB has **no** native point-to-LineString distance. Cache each active route's `LineString` in memory and compute perpendicular distance with `@turf/point-to-line-distance` on every fix; flag deviation when distance > threshold for > N seconds, and return-to-route when back within threshold.

## 45. Vehicle Offline Detection

Monitor last GPS timestamp / heartbeat against `offlineVehicleTimeoutSeconds`. Detect GPS offline · network offline · device offline · stale GPS · reconnection. Emit `vehicle:offline` + `VEHICLE_OFFLINE` event.

- Do **not** flag `OFFLINE` while the trip is `PAUSED`/`ON_BREAK`.
- Because the web driver client can be briefly backgrounded, use a two-stage signal: `STALE` after a short timeout (surface to dispatcher, no incident), `OFFLINE` + incident only after a longer timeout with no heartbeat.

## 46. Driver Real-Time Status

`ONLINE` · `OFFLINE` · `ON_TRIP` · `ON_BREAK` · `IDLE` · `SOS` · `GPS_ERROR`.

## 47. Driver SOS

`POST /tracking/sos` → emit `driver:sos` with driver · vehicle · location · trip · route · timestamp. Person 1 creates the permanent incident record. Emit `sos:acknowledged` back to the driver client when a dispatcher acknowledges. Optionally notify the driver's emergency contacts (contact list served by Person 1).

## 48. Offline GPS Synchronization

`POST /tracking/location/bulk` — bulk ingestion · duplicate detection · timestamp validation · ordered processing · retry handling · failed-sync handling. Trip lifecycle events queued offline reconcile through the same path. Live position jumps to *now* after backlog flush — do not replay stale points as current.

## 49. GPS History (MongoDB)

Store as a **time-series collection** (`timeField: timestamp`, `metaField: { vehicleId, tripId, driverId }`, `granularity: "seconds"`) with a GeoJSON `location` `Point` (`2dsphere` index) plus speed · heading · accuracy. Filter by date · vehicle · driver · trip; return the historical path ordered by `timestamp`. Retention: a **TTL index** (or scheduled archival job) drops raw points after N days; keep a downsampled per-trip path on the trip document for long-term replay. Policy values live in System Settings.

## 50. Trip Replay

`GET /tracking/trip/:tripId/history` — GPS points in chronological order for admin replay (trip start → points → stops → trip end).

## 51. Trip Statistics on End

When a trip ends (§11), compute and hand to Person 1: total distance, moving time, idle time, stops served, per-stop actual vs scheduled arrival, overall on-time/delay, average speed, max speed. Emit `TRIP_STATS_READY`.

## 52. Occupancy Broadcast

Consume conductor passenger-count updates + vehicle capacity → derive `LOW` / `MODERATE` / `CROWDED`; write `vehicle:{id}:occupancy`; emit `vehicle:occupancy` to route/vehicle rooms and `OCCUPANCY_CHANGED` to Person 1.

## 53. Real-Time Passenger Updates

Passenger receives: vehicle location · ETA · current stop · next stop · delay · vehicle status · arrival · departure · occupancy · service alerts. **WebSockets only** — no per-passenger polling of `GET /vehicle/location`.

Flow: `Driver GPS → Backend → Redis → Socket.IO → Passenger`.

## 54. Real-Time Admin Updates

Admin area receives: vehicle location · driver status · trip status · SOS · route deviation · delay · GPS failure · vehicle offline/stale · bus arrival · occupancy · manual-assignment requests.

## 55. Real-Time Events (Person 2 → Person 1)

```
BUS_APPROACHING_STOP   BUS_ARRIVED_STOP   BUS_LEFT_STOP
VEHICLE_DELAYED        VEHICLE_OFFLINE    ROUTE_DEVIATION
DRIVER_SOS             GPS_FAILURE        TRIP_STATS_READY
OCCUPANCY_CHANGED
```

Consumable by Person 1's Notification, Incident, Analytics, and Reports services. Use Redis Pub/Sub or an event bus.

## 56. Geospatial Processing

Distance calc · nearest stop · route proximity · route matching · geofence calc · vehicle-to-route matching · vehicle-to-stop matching.

- **MongoDB** handles proximity/containment queries: `2dsphere` indexes with `$near` / `$geoNear` (nearest stop, stops near a vehicle), `$geoWithin` / `$geoIntersects` (depot polygons, geo-area service-alert targeting).
- **`@turf/*`** in the app layer handles what Mongo cannot: point-to-line distance (deviation), projection along a route, `along` / `lineSlice` / `length` for distance-remaining, bearing, and buffer generation for stop/depot geofences.
- Keep active route geometries and stop lists **cached in memory** in the tracking worker to avoid a DB round-trip per GPS fix.

## 57. Tracking Security

Driver authentication · vehicle authorization · trip authorization · coordinate validation · timestamp validation · speed validation · rate limiting · GPS spoofing detection · impossible-movement detection · duplicate detection. Cross-check the reporting device against the bound device (§30). (e.g. multi-km jump in seconds → suspicious.)

## 58. Tracking Performance

Optimize GPS update rate · WebSocket updates · Redis ops · Socket.IO rooms · event broadcasting · location batching · duplicate suppression · connection recovery · horizontal WebSocket scaling (Redis adapter). Broadcast only to subscribers of the relevant vehicle/route/trip/fleet.

## 59. Tracking Background Jobs (BullMQ)

GPS processing · ETA calculation · offline/stale vehicle detection · geofence processing · location processing · historical data processing · event processing · trip statistics · occupancy derivation.

## 60. GTFS-Realtime

`GET /api/v1/gtfs/realtime/vehicle-positions` · `/trip-updates` · `/alerts` (protobuf). Feeds third-party apps incl. Google Maps.

---

# 61. Backend Integration Contract

## Person 1 → Person 2 (reference data)

Vehicle · Driver · Conductor · Route · route geometry · Stops · stop coordinates · route-stop sequence & offsets · Schedule · Trip · driver/vehicle/conductor assignment · System Settings (geofence radius, thresholds, intervals) · emergency contacts.

## Person 2 → Person 1 (events)

`BUS_APPROACHING_STOP`, `BUS_ARRIVED_STOP`, `BUS_LEFT_STOP`, `VEHICLE_DELAYED`, `VEHICLE_OFFLINE`, `ROUTE_DEVIATION`, `DRIVER_SOS`, `GPS_FAILURE`, `TRIP_STATS_READY`, `OCCUPANCY_CHANGED`. Consumed for Notifications · Incidents · Analytics · Reports.

## Shared conventions

- **`Idempotency-Key` header** required on: trip start, checklist submit, ticket create, `tickets/bulk`, `passenger-count/bulk`, payment create, `tracking/location/bulk`.
- **Standard error envelope**: `{ error: { code, message, details?, traceId } }`.
- **Auth**: `Authorization: Bearer <jwt>` or the refresh cookie; Socket.IO auth handshake with the access token (guest token accepted read-only).
- **Time**: all scheduling math uses server time; device timestamps used only for ordering.
- Deliver an **OpenAPI 3.1 spec + a running mock server in Phase 1** so the frontend builds in parallel.
- **CORS**: allow the single PWA origin (configurable) with credentials for the refresh cookie.

---

# DATABASE RESPONSIBILITY

**MongoDB is the only database** (Mongoose ODM, replica set). **Redis** for ephemeral real-time state only. No PostgreSQL / PostGIS.

## Collections (main business DB)

```
users  roles  permissions            (RBAC; role_permissions embedded on roles)
devices  sessions  emergencyContacts  webPushSubscriptions
passengers  passengerSubscriptions  savedLocations  recentSearches
drivers  conductors  attendance
vehicles  vehicleDocuments
routes            (embeds ordered [{ stopId, sequence, scheduledOffsetMinutes }] + GeoJSON LineString geometry)
stops             (GeoJSON Point location)
schedules  trips  tripChecklists
fares  fareRules  concessions  passes
tickets  payments  paymentReconciliations
maintenance  maintenanceRecords
complaints  lostFound          (attachments embedded as arrays of S3 keys)
incidents
serviceAlerts
notifications  notificationPreferences  notificationTemplates
auditLogs  systemSettings
idempotencyKeys   (TTL; dedupe for trip start, tickets, payments, bulk sync)
```

## Modelling guidance

- **Embed** small, bounded, read-together data (route→stop list, complaint→attachments, role→permissions, trip→checklist). **Reference** (store ObjectId) for large or independently-queried entities (trips, tickets, payments, gps points).
- Denormalise hot read fields (e.g. `routeNumber`, `vehicleRegNo`) onto trips/tickets to avoid `$lookup` on every read; keep a single writer per denormalised field.
- Every collection: `createdAt` / `updatedAt`; soft-delete via `deletedAt` where "deactivate" is required; `schemaVersion` for migrations.

## Geospatial

- `stops.location` — GeoJSON `Point`, `2dsphere`.
- `routes.geometry` — GeoJSON `LineString`, `2dsphere`.
- `depots.area` — GeoJSON `Polygon`, `2dsphere`.
- Queries: `$near` / `$geoNear` (nearest stop), `$geoWithin` / `$geoIntersects` (depot, geo-area targeting).
- Point-to-line distance, along-route projection, geofence buffers → `@turf/*` in the app layer.

## GPS history

- Time-series collection `gpsHistory` (`timeField: timestamp`, `metaField: meta { vehicleId, tripId, driverId }`, `granularity: seconds`), GeoJSON `location` + speed/heading/accuracy, `2dsphere` on `location`, compound `{ "meta.tripId": 1, timestamp: 1 }`, TTL for raw-point retention.

## Redis

Current vehicle location · active trips · online drivers · current/next stop · ETA · occupancy · WebSocket/Socket.IO adapter state · Pub/Sub. **Ephemeral only** — rebuildable from MongoDB on cold start.

## Indexes (minimum)

`users.email` (unique), `users.phone` (unique sparse), `drivers.employeeId` (unique), `vehicles.registrationNumber` (unique), `trips { status: 1, scheduledAt: 1 }`, `trips { "assignee.driverId": 1, scheduledAt: 1 }`, `tickets { tripId: 1 }`, `payments { status: 1, createdAt: 1 }`, `auditLogs { resource: 1, resourceId: 1, createdAt: -1 }`, `notifications { userId: 1, read: 1 }`, `serviceAlerts { status: 1, startsAt: 1, endsAt: 1 }`, `idempotencyKeys { key: 1 }` (unique) + TTL, the `2dsphere` + time-series indexes above.

## Transactions & consistency

- Use **multi-document transactions** for cross-collection writes (create trip + assignment, ticket + payment + reconciliation, incident + vehicle status). Requires the replica set.
- Enforce invariants in a service layer (Mongoose validators + guards) since MongoDB has no FKs; add unique/partial indexes for the constraints that matter.
- **Change streams** are available as an internal event source, but the Person 2 → Person 1 contract stays on Redis Pub/Sub / the event bus.

---

# API STRUCTURE

Versioned: `/api/v1/...`

```
auth  users  passengers  drivers  conductors  vehicles  routes  stops
schedules  trips  fares  tickets  payments  maintenance  complaints
lost-found  incidents  notifications  analytics  reports  tracking
config  time  me  sync  uploads  journeys  service-alerts  gtfs
```

`me/*`: `assignments`, `active-trip`, `attendance`, `performance`, passenger `subscriptions`. Devices via `auth/devices`.

Admin: `/api/v1/admin/{users,drivers,conductors,vehicles,routes,stops,schedules,trips,service-alerts,analytics,reports}`.

---

# NON-FUNCTIONAL REQUIREMENTS

Modular · scalable · secure · maintainable · testable · observable · production-ready.

Input validation (zod / Mongoose schema) · centralized error handling · logging · rate limiting · pagination · filtering · sorting · API versioning · **MongoDB multi-document transactions** for cross-collection writes · **idempotency for important operations** (via the `idempotencyKeys` collection) · proper indexes · service-layer invariant enforcement (no FKs) · request tracing (`traceId`) · health checks (`/healthz`, `/readyz`).

Environments (dev/staging/prod) · secrets via env/secret store (no secrets in code) · **`migrate-mongo`** migrations + seed scripts · CORS policy for the PWA origin.

---

# MONITORING

API · database · Redis · WebSocket · GPS ingestion · queue · error tracking · server · request latency · uptime. Recommended: Sentry · Prometheus · Grafana. Alerts on: GPS ingestion drop, queue backlog, WebSocket connection spikes, payment webhook failures.

---

# DOCKER / DEPLOYMENT

Dockerized services: `backend` · `worker` · `mongo` (**replica set** — single-node RS in dev, 3-node in prod) · `redis`.

```
Load Balancer → API Servers → Redis → MongoDB (replica set)
                     ↓
                  Workers (BullMQ)
                     ↓
              Socket.IO (Redis adapter, horizontally scaled)
```

MongoDB must be initialised as a replica set (`rs.initiate()`) so transactions and change streams work — a bare `mongod` will fail those operations.

CI/CD (GitHub Actions): lint · test · build · migrate · deploy.

---

# DEVELOPMENT RULES

1. No duplicated ownership between developers.
2. Define interfaces/contracts (API + events) before coding; publish OpenAPI + mock server in Phase 1.
3. Person 1 owns business entities/workflows; Person 2 owns real-time tracking + geospatial.
4. Backend authorization never depends on frontend role checks.
5. Redis is never the permanent source of truth.
6. GPS history must be persisted (MongoDB time-series collection). MongoDB + Redis are the only datastores — no PostgreSQL.
7. WebSockets for real-time updates; no per-client polling.
8. Driver GPS supports offline bulk sync; conductor ticketing/count also support offline bulk sync.
9. Every important op has validation + error handling + standard error envelope.
10. MongoDB multi-document transactions for cross-collection operations; enforce invariants in the service layer (no FKs).
11. `2dsphere` + compound indexes for frequently queried and geospatial fields; point-to-line math via `@turf/*`.
12. Consistent REST conventions; `Idempotency-Key` on all listed mutation endpoints.
13. Real-time events + payloads clearly documented.
14. All admin-tunable values served to the frontend via `GET /api/v1/config`, never hard-coded.
15. Unit + integration tests for critical modules.

---

# EXPECTED OUTPUT FROM THE AI (before implementation code)

1. **Complete Architecture** — system, backend, database, Redis, WebSocket, GPS tracking.
2. **Module Structure** — full backend folder structure (per-module, both owners).
3. **Database Design** — every MongoDB collection with its Mongoose schema (fields, types, required, defaults), embed-vs-reference decisions, indexes (incl. `2dsphere`, compound, unique/partial, TTL), the GeoJSON + time-series fields, and retention notes.
4. **API Documentation** — per endpoint: method · path · auth · role · request body · query params · success response · error responses. Include §24–§34 and §60.
5. **WebSocket Documentation** — connection, auth (incl. guest read-only), rooms, events, payloads, subscribe/unsubscribe, reconnection.
6. **Redis Design** — keys, values, TTL, Pub/Sub channels, cache strategy, cold-start rebuild.
7. **GPS Flow** — `Driver GPS → Tracking API → Validation → Redis → Geospatial (2dsphere + @turf) → ETA → Geofence → Delay/Deviation → Redis Pub/Sub → Socket.IO → Passenger/Admin`, plus async persistence to the `gpsHistory` time-series collection, the offline bulk path, and `PAUSED`/`STALE` handling for the web client.
8. **Event Contracts** — every Person 1 ⇄ Person 2 event with payloads; the shared conventions block.
9. **Security Architecture** — auth (cookie + bearer), authorization, RBAC, guest scope, rate limiting, GPS security, device binding, WebSocket security, API security.
10. **Testing Strategy** — unit, integration, API, WebSocket, GPS, geofence, ETA, offline-sync, load, security.
11. **Development Roadmap** — phased plan below.
12. **OpenAPI 3.1 spec + mock server plan**, `Idempotency-Key` convention (backed by the `idempotencyKeys` collection), error envelope, GPS-history retention/TTL policy, replica-set setup, `migrate-mongo` + seed strategy, env/secrets strategy.

---

# DEVELOPMENT ROADMAP

**Phase 1 — Foundation:** project setup · MongoDB replica set + Mongoose + `migrate-mongo` + seed · idempotency-key collection · Auth (OTP, email/password, guest, cookie refresh, OTP limits) · RBAC · device / web-push subscription registration · Redis · `GET /config` + `/time` · error envelope · OpenAPI + mock server · health checks.

**Phase 2 — Transport Management:** Users · Drivers · Conductors · Vehicles · Routes (geometry) · Stops · Schedules (trip materialisation) · Trips (full lifecycle incl. PAUSED, checklist, active-trip recovery) · My Assignment & Attendance · Reference-Data Sync · File Uploads.

**Phase 3 — Real-Time Engine:** GPS ingestion + validation · Redis state · Socket.IO (rooms, scaling) · geofencing · current-stop detection · ETA · delay detection · route deviation · offline/stale vehicle detection · offline GPS bulk sync · heartbeat · trip statistics · SOS + acknowledgement · event bus (Person 2 → Person 1).

**Phase 4 — Passenger Operations:** route/stop search · Journey Planner · Favourites + Subscriptions · Notification Service (templates, preferences, quiet hours, Web Push) · Service Alerts · Complaints · Lost & Found · real-time passenger updates.

**Phase 5 — Ticketing & Payments:** Fares · Fare Calculation · Tickets · QR · Passes · Payments · Payment QR · webhooks · Conductor Offline Sync · reconciliation · occupancy broadcast.

**Phase 6 — Admin Operations:** Maintenance + document expiry jobs · Incidents (workflow from real-time events) · Analytics · Reports (CSV/PDF) · Audit Logs · System Settings · Admin APIs · force-end / dispatch messaging.

**Phase 7 — Production:** Docker · CI/CD · monitoring (Sentry/Prometheus/Grafana) · logging · GTFS static + realtime export · GPS-history archival · load testing · security testing · horizontal scaling.

---

# FINAL GOAL

A production-ready backend where:

```
Driver → GPS → Tracking Backend → Redis → Geospatial Processing
      → ETA / Geofence / Delay / Deviation → Redis Pub/Sub → WebSocket
      → Passenger area + Admin area (one Next.js PWA)
```

with Person 1 owning all business entities, workflows, and admin operations, Person 2 owning the real-time tracking engine, **MongoDB (replica set) + Redis** the only datastores, geospatial math split between `2dsphere` queries and `@turf/*`, and both developers working in parallel against clearly defined **collection ownership, service boundaries, API contracts, and real-time event contracts**.
