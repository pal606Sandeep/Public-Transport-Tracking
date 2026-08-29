# Real-Time Public Transport Tracking System — Frontend Development Prompt (Final)

> **Revision notes for this version**
> - The frontend is **one Next.js (App Router) application, shipped as a Progressive Web App (PWA)** — not React Native, not two apps. All roles (Passenger, Guest, Driver, Conductor, Admin) live in one codebase behind route groups and role-based layouts.
> - There is **one frontend developer**. No Person A / Person B split — one owner, one sequenced roadmap.
> - Backend datastore is **MongoDB + Redis** (not the frontend's concern beyond the API contract); the frontend caches locally in **IndexedDB** (via Dexie) and the Cache Storage API.
> - Push uses **Web Push (VAPID)** through a service worker, not native FCM.

You are a senior frontend architect and TypeScript engineer (React / Next.js).

We are building the **frontend for a Real-Time Public Transport Tracking System for Small Cities**. The backend is built separately by two backend developers and exposes versioned REST APIs (`/api/v1/*`), a Socket.IO real-time layer, an **OpenAPI 3.1 spec**, and a **mock server** delivered in Phase 1. This prompt covers the frontend only and must consume those contracts exactly.

---

## 1. What we are building

**One Next.js App Router PWA** with four role-based areas served from a single deployment:

| Area | Roles | Nature |
|---|---|---|
| **Public / Passenger** | `GUEST`, `PASSENGER` | Installable PWA, mobile-first, works offline for read |
| **Operations** | `DRIVER`, `CONDUCTOR` | Installable PWA, mobile-first, foreground-active during a trip, offline write queue |
| **Admin** | `SUPER_ADMIN`, `ADMIN`, `TRANSPORT_MANAGER`, `DISPATCHER`, `MAINTENANCE_MANAGER`, `SUPPORT_STAFF` | Desktop-first dashboard, online, data-dense |

The user lands on the area their role permits after login; guests get the Passenger area read-only.

---

## 2. Tech Stack

- **Framework:** Next.js (App Router, React 18/19, TypeScript, `output: "standalone"`).
- **Rendering:** mostly client components for the app shell + real-time views; server components / route handlers only for SEO-light public pages and BFF proxying if needed. This is an app, not a content site — prefer CSR + React Query for authenticated areas.
- **PWA / service worker:** **Serwist** (`@serwist/next`) — precache the app shell, runtime-cache strategies per route, Web Push handling, Background Sync. Web App Manifest with maskable icons, `display: standalone`, separate `start_url` per install target if needed.
- **Server state:** TanStack Query (React Query) — one query key per resource, cache + invalidation, `select` shaping, offline-aware.
- **Client state:** Zustand (auth/session, active-trip, offline-queue status, map viewport, UI prefs).
- **Realtime:** `socket.io-client` wrapped in a typed client (auth handshake, declarative room subscribe/unsubscribe, reconnect + resync).
- **Local persistence:** **Dexie (IndexedDB)** for offline queues and cached reference data; Cache Storage (via Serwist) for assets, tiles, and GET responses. `localStorage` only for trivial UI prefs.
- **Maps:** **MapLibre GL JS** (vector tiles from `config.mapTileSource`); `maplibre-gl` draw plugin for the Admin route/stop editors; a lightweight canvas layer for many moving vehicle markers.
- **Forms & validation:** react-hook-form + **zod** (schemas aligned with OpenAPI request bodies).
- **i18n:** `next-intl` or `i18next` — bundled message catalogues, language from profile/device, optional remote override when `featureFlags.remoteStrings`.
- **Charts (Admin):** Recharts or ECharts.
- **Device APIs:** Geolocation (`watchPosition`), **Screen Wake Lock API**, Page Visibility API, Network Information API, `BarcodeDetector` (QR scan) with a `@zxing/browser` fallback, Web Share, Notifications + Push.
- **Testing:** Vitest + React Testing Library (unit/integration), Playwright (E2E, all areas), axe-core (a11y), Lighthouse CI (PWA/perf budgets).
- **Tooling:** ESLint + Prettier, `openapi-typescript` for generated types, Storybook for the design system, Turbopack/Next build, Docker image for self-hosting alongside the backend.

---

## 3. CRITICAL PWA CONSTRAINTS — read before designing the Driver area

A browser PWA **cannot** do reliable background geolocation the way a native app can. Design around this:

1. **Foreground-only GPS.** `navigator.geolocation.watchPosition()` runs only while the page is visible. When the tab is backgrounded, the screen locks, or the OS suspends the tab, updates stop.
2. **Wake Lock is mandatory during a trip.** Acquire `navigator.wakeLock.request('screen')` on trip start; re-acquire on `visibilitychange`. Show a persistent "Tracking active — keep this screen on" bar. Recommend drivers dash-mount the phone and keep the PWA open.
3. **Detect and communicate gaps.** On `visibilitychange → hidden` or wake-lock loss during an active trip: show a prominent "Tracking paused" state, stop pretending to track, and on return flush the local queue and send a gap marker. Optionally auto-`PATCH /trips/:id {action:"pause"}` after a threshold and auto-resume on return.
4. **Background Sync is best-effort.** Use the Background Sync API to flush the offline GPS/ticket queue when connectivity returns even if the tab is closed, but treat it as a bonus — the primary flush path is on app focus/online.
5. **iOS specifics.** Web Push works only for an **installed** PWA on iOS 16.4+. Prompt the driver/conductor to "Add to Home Screen". No background audio, limited storage, aggressive tab eviction — keep the operations area lean.
6. **Storage is evictable.** IndexedDB/Cache can be cleared under storage pressure. Request `navigator.storage.persist()`. Never treat the local queue as durable beyond a shift; sync early and often.
7. **Token storage.** No secure keystore in a browser. Keep the **access token in memory** (Zustand, non-persisted); the **refresh token is an httpOnly Secure cookie** set by the backend. On load, call `POST /auth/refresh` (cookie) to bootstrap the session.

These constraints make the small-city MVP viable (mounted phone, screen on) but must be documented for the operations team, and a dedicated cheap Android device per bus is the recommended deployment.

---

## 4. Backend contract the frontend consumes

### Conventions

- **Auth:** access token in memory → `Authorization: Bearer`; refresh via httpOnly cookie (`POST /api/v1/auth/refresh`, `credentials: "include"`). Socket.IO handshake passes the access token in `auth`.
- **Error envelope:** `{ error: { code, message, details?, traceId } }` — render `message`, log `code` + `traceId` to Sentry.
- **Idempotency-Key** header (client-generated UUID) on: trip start, checklist submit, ticket create, `tickets/bulk`, `passenger-count/bulk`, payment create, `tracking/location/bulk`.
- **Time:** use `serverTime` from `GET /config` (and `GET /time`) for all scheduling math; device clock only for local ordering of queued items.
- **Config:** call `GET /api/v1/config` on every load; store thresholds, `gpsSendIntervalSeconds`, `geofenceRadiusMeters`, `delayThresholds`, `mapTileSource`, `supportedLanguages`, `vapidPublicKey`, `minSupportedAppVersion`, `featureFlags`, `serverTime`. Enforce `minSupportedAppVersion` with a blocking "reload to update" screen. Never hard-code these.
- Develop against the **mock server** from day one; swap the base URL for the real backend later.
- Generate types with `openapi-typescript`; a CI check fails the build on contract drift.

### REST endpoints by area

| Area | Endpoints |
|---|---|
| Bootstrap | `GET /config`, `GET /time` |
| Auth | `POST /auth/login`, `/auth/otp`, `/auth/refresh`, `/auth/guest`, `/auth/logout`, `/auth/forgot`, `/auth/reset`; `POST/DELETE/GET /auth/devices` (web-push subscription) |
| Me (Ops) | `GET /me/assignments`, `/me/active-trip`, `/me/performance`; `POST /me/attendance/check-in`\|`check-out`; `POST /me/assignments/request` |
| Trips (Ops) | `POST /trips` (start), `PATCH /trips/:id {action:pause\|resume\|end}`, `POST /trips/:id/checklist`, `GET /trips/:id` |
| Trips (Admin) | `GET /trips`, `POST /admin/trips/:id/force-end`, create/assign/cancel/mark-missed |
| Tracking | `POST /tracking/location`, `/tracking/location/bulk`, `POST /tracking/heartbeat`, `POST /tracking/sos`, `GET /tracking/trip/:id`, `GET /tracking/trip/:id/history` |
| Reference sync | `GET /sync/routes\|stops\|fares\|schedules?updatedSince=` (ETag / If-None-Match) |
| Passenger | `GET /journeys`, `GET /routes`, `GET /stops`, `GET /service-alerts`, `GET/POST/DELETE /passengers/me/subscriptions`, favorites, `GET /me/notifications` |
| Ticketing | `POST /fares/calculate`, `POST /tickets`, `POST /tickets/bulk`, `POST /tickets/scan`, `GET /tickets`, passes |
| Payments | `POST /payments`, `POST /payments/qr`, `GET /payments`, refunds |
| Counts / reconciliation | `POST /trips/:id/passenger-count`, `/passenger-count/bulk`, `POST /trips/:id/reconciliation` |
| Uploads | `POST /uploads/presign` → S3 PUT → submit key |
| Admin CRUD | `/admin/{users,drivers,conductors,vehicles,routes,stops,schedules,trips,service-alerts,analytics,reports}` |
| Ops data | `/incidents`, `/complaints`, `/lost-found`, `/maintenance`, `/audit-logs`, `/system-settings`, `/notifications/templates` |

### Socket.IO

**Rooms:** `vehicle:{id}` · `route:{id}` · `trip:{id}` · `fleet:all`.

**Events consumed:** `vehicle:location`, `vehicle:status`, `vehicle:arriving`, `vehicle:arrived`, `vehicle:left`, `vehicle:occupancy`, `vehicle:delay`, `vehicle:offline`, `route:deviation`, `trip:started`, `trip:paused`, `trip:resumed`, `trip:completed`, `trip:cancelled`, `trip:force_end`, `driver:sos`, `sos:acknowledged`, `gps:error`, `payment:confirmed`, `service:alert`, `assignment:changed`, `dispatch:message`.

| Room / event | Passenger area | Operations area | Admin area |
|---|---|---|---|
| `route:{id}` + `vehicle:location`/`arriving`/`delay`/`occupancy` | live map & stop ETA | — | route monitoring |
| `trip:{id}` + `trip:*` | tracked bus | driver/conductor active trip | trip monitor |
| `fleet:all` | — | — | live fleet map |
| `driver:sos`, `route:deviation`, `vehicle:offline`, `gps:error` | — | driver: own `sos:acknowledged`, deviation banner | dispatcher console alerts |
| `assignment:changed`, `dispatch:message`, `trip:force_end` | — | react in the ops UI | dispatcher sends |
| `payment:confirmed` | passenger payment result | conductor confirmation | payments view |
| `service:alert` | banner + Web Push | — | — |

---

## 5. Application structure (single Next.js app)

```
apps/web/
  app/
    (public)/                # marketing/landing, /login, /register, /guest
      layout.tsx
      login/  otp/  forgot/  guest/
    (passenger)/             # role: GUEST | PASSENGER
      layout.tsx             # bottom-nav shell, installable
      map/  search/  planner/  stops/[id]/  routes/[id]/
      favorites/  notifications/  alerts/
      tickets/  tickets/[id]/  passes/  pay/
      complaints/  lost-found/  profile/
    (operations)/            # role: DRIVER | CONDUCTOR
      layout.tsx             # field-mode shell, wake-lock bar, offline bar
      driver/
        home/  checklist/  trip/  trip/summary/  incident/  sos/  performance/
      conductor/
        trip/  issue-ticket/  scan/  count/  reconcile/
      settings/
    (admin)/                 # role: staff roles
      layout.tsx             # sidebar + topbar, RBAC menu
      overview/  fleet/  vehicles/  drivers/  conductors/
      routes/  stops/  schedules/  trips/  dispatch/
      incidents/  maintenance/  complaints/  lost-found/
      fares/  payments/  service-alerts/
      analytics/  reports/  replay/  audit/  settings/  users/
      notifications/templates/
    api/                     # (optional) BFF route handlers: cookie relay, CSP report, health
    manifest.webmanifest
    ~offline/                # offline fallback page
  sw.ts                      # Serwist service worker
  lib/
    api/                     # generated types + typed client + endpoint hooks
    realtime/                # socket client + room hooks + event→cache reducers
    offline/                 # Dexie schema, queues, sync engine
    auth/                    # session store, guards, role routing
    maps/                    # MapLibre wrappers, layers, playback
    i18n/  config/  telemetry/
  components/                # design system + shared UI
  tests/
packages/ (optional)
  shared/                    # if you later split types/design-system out
```

If a monorepo is preferred, keep it to **one deployable app** plus a `shared` package; do not build two apps for one developer.

---

## 6. DETAILED RESPONSIBILITIES

### 6.1 App Foundation & PWA Shell

- **Service worker (Serwist):** precache the app shell; runtime caching — `NetworkFirst` for `GET /config` and reference reads, `StaleWhileRevalidate` for map tiles and static assets, `NetworkOnly` for mutations, an offline fallback route. Handle `push`, `notificationclick`, and `sync` (Background Sync) events. Version + skipWaiting flow with an in-app "new version available — reload" toast.
- **Web App Manifest:** name, short_name, icons (incl. maskable), theme/background color, `display: standalone`, `orientation: portrait` for mobile areas, shortcuts (e.g. "Live map", "My trip").
- **Install prompts:** capture `beforeinstallprompt`; contextual "Add to Home Screen" nudges for Driver/Conductor (required for iOS push and reliable use) and for frequent passengers.
- **Config bootstrap:** load `GET /config` before rendering the authed shell; hydrate the config store; min-version gate.
- **Auth session:** on load, `POST /auth/refresh` (cookie) → access token in memory; schedule silent refresh before expiry; on failure route to `/login`. Role-based redirect to the correct area. Route guards per area; permission-gated UI within Admin (menu + actions from token `permissions`), with backend 403 as the real enforcement.
- **API client:** generated types; fetch wrapper with base URL, bearer, `credentials: "include"`, `Idempotency-Key` injection for mutations, error-envelope parsing to typed errors, `traceId` capture, retry/backoff for idempotent GETs, request de-dupe.
- **Realtime client:** connect after auth; `useRoom(room)` hook subscribes on mount / unsubscribes on unmount; exponential backoff reconnect; on reconnect, refetch the REST snapshot for mounted views then resume live patches; event handlers patch the React Query cache or the `liveVehicles` store.
- **Offline layer:** Dexie DB with tables `gps_queue`, `event_queue`, `ticket_queue`, `count_queue`, `ref_routes`, `ref_stops`, `ref_fares`, `ref_schedules`, `snapshots` (last-known trip/vehicle state). One **sync engine**: drains queues FIFO with backoff, attaches `Idempotency-Key`, applies per-item server results, surfaces conflicts. Triggered on `online`, on app focus, on an interval while foreground, and via Background Sync.
- **Network & storage UX:** global offline banner + pending-sync count; `navigator.storage.persist()` request; quota monitoring with a warning when low.
- **Push notifications:** request permission at a sensible moment (after first meaningful action, never on load); subscribe with `config.vapidPublicKey`; send the `PushSubscription` via `POST /auth/devices`; SW renders notifications; `notificationclick` deep-links into the app; respect quiet hours from preferences.
- **i18n:** message catalogues, language switch, RTL-ready layout primitives, number/date formatting via `Intl` on `serverTime`-corrected values.
- **Theme & field mode:** light/dark; a high-contrast, large-tap "field mode" for the operations area (sunlight-readable, one-handed, big buttons, minimal chrome).
- **Error handling:** route-level error boundaries, typed error toasts, empty/loading/skeleton states everywhere, a global "report a problem" that attaches the last `traceId`.
- **Telemetry:** Sentry (web) with release health + source maps; privacy-safe event tracking (screen views, key actions); **no PII/tokens in logs**.
- **Design system:** tokens (color, type, spacing, radius, elevation), core components (Button, Field, Select, Combobox, Sheet/Drawer, Dialog, Toast, Tabs, DataTable, MapCanvas, StatTile, StatusPill, ListRow, EmptyState), documented in Storybook; a `<DataTable>` with server pagination/filter/sort/column-config/CSV export reused across Admin.

### 6.2 Authentication & Guest

- Splash / permission priming (location, notifications) shown contextually, not upfront.
- Mobile **OTP** login (paste/auto-fill, resend cooldown, lockout messaging); email/password fallback; forgot / reset password.
- **Guest mode:** `POST /auth/guest` → read-only passenger token; guest can search, plan journeys, view live tracking, join read-only rooms; favouriting / complaints / tickets trigger a "create an account" flow.
- **Device registration** on login (`POST /auth/devices` with `userAgent` + later the `PushSubscription`); a "device not authorized" screen for Driver/Conductor second-device rejection, with a "request access" action.
- Role picker for staff holding multiple roles; area redirect after login.
- Profile management; notification preferences incl. quiet hours & digest; language; logout (also unsubscribes push + clears memory token); device list with revoke.

### 6.3 Passenger Area

- **Live Transport Map:** vehicles for the viewport/selected route via `route:` room `vehicle:location`; smooth marker interpolation + heading; status styling (moving / stopped / delayed / offline / maintenance); distinct icons; route polylines; vehicle number; "updated Ns ago"; occupancy pill from `vehicle:occupancy`. Throttle re-renders to animation frames; cap markers with clustering/canvas.
- **Search (From → To)** → `GET /journeys`: routes, transfers, ETA, distance, fare, walking distance to first stop, next available bus.
- **Journey Planner:** ranked options; per-leg walk/ride, transfer points, per-leg + total fare, total duration, live next-departure per leg.
- **Stop details:** name, map, routes serving it, upcoming buses with **ETA + scheduled time + delay**, platform/stand, nearby stops; subscribe to relevant `route:`/`trip:` rooms while open.
- **Route details:** ordered stop list, live buses on route, next buses, schedule, fare, service status.
- **ETA display:** per tracked bus — minutes + distance; values from backend only.
- **Favorites & subscriptions:** favorite stops (Home/Office/…) and routes; `POST /passengers/me/subscriptions` so delay/deviation/cancellation/service-alert pushes arrive.
- **Notifications inbox:** list, read/unread, deep links; preferences.
- **Service alerts:** banner on affected route/stop screens + Web Push; `GET /service-alerts` + `service:alert` event.
- **Complaints:** create (category, text, rating, photo via `POST /uploads/presign` → S3 PUT), track status/history.
- **Lost & Found:** report lost item (description, vehicle/route, date/time, photo); track case.
- **Tickets & passes:** buy ticket (route, boarding + destination stop, category/concession) → fare from `POST /fares/calculate` (display only) → pay → QR ticket (render QR client-side from the returned token); ticket history; passes; show QR for validation. Cache active tickets in IndexedDB so they render offline.
- **Payments:** UPI / card / net banking / wallet via the gateway's web checkout (redirect or embedded); status is webhook-driven — reflect `payment:confirmed`; transaction history; refund status.
- **Offline behaviour:** last-known map snapshot, cached routes/stops/schedules, cached tickets/passes render offline; writes (complaint, lost-found) queue and sync.
- **Installability & SEO:** public landing + `/stops/[id]` and `/routes/[id]` can be lightly server-rendered for shareable links; the rest is CSR.

### 6.4 Driver Area (Operations)

- **Home / assignment card:** `GET /me/assignments?date=today` — vehicle, route (geometry + ordered stops + offsets + scheduled times), shift window, trip list with status; empty state + `POST /me/assignments/request`; live `assignment:changed`.
- **Attendance:** check-in / check-out (`/me/attendance/*`) tied to the shift.
- **Pre-trip checklist:** form → `POST /trips/:id/checklist`; if `config.checklistBlocksTripStart`, a failed item blocks start.
- **Trip state machine (UI):** `IDLE → ON_TRIP → PAUSED(ON_BREAK) → COMPLETED`; `POST /trips` (start) and `PATCH /trips/:id {action}` with `Idempotency-Key`; confirmation guard on end.
- **Active-trip recovery:** on load, `GET /me/active-trip` → restore state and offer resume (the PWA can be reloaded/backgrounded any time).
- **Active-trip map:** own marker snapped to route line, polyline, stop pins; next-stop banner (name + distance + **ETA from backend**); collapsible upcoming stops; status pill; "arriving" from geofence events; **route-deviation warning banner** from `route:deviation`; delay indicator from `vehicle:delay`; recenter/follow.
- **GPS engine (foreground, per §3):**
  - Acquire **Screen Wake Lock** on trip start; re-acquire on `visibilitychange`; persistent "keep screen on" bar.
  - `watchPosition` with `enableHighAccuracy`; sample/emit at `config.gpsSendIntervalSeconds` (adaptive 5–15s by speed/state; reduced while `PAUSED`).
  - Package `{tripId, vehicleId, lat, lng, speed, heading, accuracy, timestamp}`; drop low-accuracy fixes.
  - When foregrounded but stationary, send `POST /tracking/heartbeat` to signal liveness.
  - On `visibilitychange → hidden` / wake-lock loss during a trip: show "Tracking paused", stop the watch, optionally `PATCH ... {action:"pause"}` after a threshold; on return, resume + flush + send a gap marker.
- **Offline queue:** buffer fixes + lifecycle events in IndexedDB; flush oldest-first via `POST /tracking/location/bulk` (`Idempotency-Key`) on reconnect/focus/Background Sync; buffer cap / rolling window; live position jumps to now after flush; manual "sync now".
- **Reference cache:** on login, cache routes/stops/schedules/fares via `GET /sync/*` (ETag / `updatedSince`); cache map tiles for the assigned route corridor.
- **Navigation:** next-stop guidance now; client-side turn-by-turn between stops via the map SDK — Phase 3.
- **SOS:** one tap from any ops screen → `POST /tracking/sos`; "help notified" state; render `sos:acknowledged`; emergency-contacts view.
- **Report incident:** breakdown / accident / road blocked / other + note + optional photo (presigned upload); breakdown offers auto-end trip.
- **Trip summary:** display backend-computed stats (distance, duration, on-time vs scheduled, stops served); driver confirms.
- **Performance self-view:** `GET /me/performance`.
- **Dispatch:** receive `dispatch:message`; handle `trip:force_end`.

### 6.5 Conductor Area (Operations)

- **Join active trip:** attach to the driver's `trip:` room; read-only map + next stop + ETA.
- **Issue ticket:** boarding stop (default = current, from geofence), destination stop, passenger count/type, concession → **fare display** from `POST /fares/calculate` → collect cash (mark paid) or **show payment QR** (`POST /payments/qr`, wait for `payment:confirmed`); ticket list for the current trip.
- **QR scan:** `BarcodeDetector` (fallback `@zxing/browser`) → `POST /tickets/scan`; valid/invalid result; prevent reuse.
- **Passenger count:** +1 / −1 boarding/alighting or absolute at a stop; occupancy pill vs vehicle capacity (🟢/🟡/🔴).
- **Offline sync:** queue tickets and counts in IndexedDB; flush via `POST /tickets/bulk` and `POST /trips/:id/passenger-count/bulk` with per-item `Idempotency-Key`; per-item result handling.
- **End-of-trip reconciliation:** `POST /trips/:id/reconciliation` (tickets issued, cash, digital); show expected vs collected variance; confirm.

### 6.6 Admin Area

- **Shell:** responsive sidebar + topbar, RBAC-driven menu, command palette, breadcrumb; desktop-first, keyboard-friendly; print styles for reports.
- **Overview dashboard:** KPI tiles (total / active / offline vehicles, drivers, routes, stops, passengers today, trips today, open incidents); live mini-map; alert feed (SOS, deviation, offline, delayed); today's on-time chart.
- **Live Fleet Map:** all vehicles on `fleet:all`; filter by route/status/driver/depot; vehicle popover (number, route, speed, heading, current/next stop, last GPS, driver, occupancy); click-through to trip monitor; deviation/offline/SOS highlighting.
- **Vehicle Management:** CRUD (registration, model, type, capacity, fuel, GPS device ID, `wheelchairAccessible`, amenities); driver/conductor/route assignment; status (`ACTIVE`/`INACTIVE`/`MAINTENANCE`/`RETIRED`); vehicle history.
- **Driver Management:** CRUD + profile (employee ID, license, expiry, joining date, status); attendance; shifts; assignments; performance; trip history; complaints; license-expiry warnings.
- **Conductor Management:** CRUD + profile; shift; attendance; assignments; ticket sales & revenue views; performance; reconciliation variance history.
- **Route Management:** CRUD; **map geometry editor** (draw/edit `LINESTRING`); route-stop add/remove/reorder + sequence + `scheduledOffsetMinutes`; live buses + service status.
- **Stop Management:** CRUD (name, lat/lng via map pin, facilities, shelter, accessibility, landmarks); route assignment; per-route sequence; nearby stops.
- **Schedule Management:** CRUD; assign route/vehicle/driver/conductor; operating hours; daily/weekly/weekend/holiday/special; trigger trip-instance materialisation; conflict detection UI.
- **Trip Management & Monitor:** list + filters; statuses incl. `PAUSED`; create/assign/cancel/mark-missed; **live trip monitor** (map + stop progress + ETA + delay from `trip:` room); **force-end**; trip summary + stats.
- **Dispatcher Console:** unified real-time queue — `driver:sos` (acknowledge → `sos:acknowledged`, escalate to incident), `route:deviation`, `vehicle:delay`, `vehicle:offline`, `gps:error`; **manual-assignment requests** approve/reject; **dispatch messaging** to a driver/conductor/route (`dispatch:message`); broadcast prompts.
- **Incident Management:** board (`OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`); types; auto-created from real-time events; assign, note, attach, link vehicle/trip/driver; vehicle-status side effects.
- **Maintenance & Documents:** service schedule & history; repairs, parts, tyre/oil, inspections; vehicle documents (registration, insurance, fitness, PUC) with expiry dashboards and "service due" board.
- **Complaints:** queue with categories; assign/update/escalate/resolve/close; history; attachments; feedback & rating; SLA/aging.
- **Lost & Found:** lost/found registers; matching view; staff assignment; status updates; return confirmation; case closure.
- **Fares & Ticketing Config:** fare CRUD (route-based, distance/stage); categories, discounts, concessions; passes; **fare calculator preview**; ticket search & history; cancellation.
- **Payments & Reconciliation:** transaction list (method, status, amount); failed payments; refunds; reconciliation views (per trip/conductor: tickets vs cash vs digital vs variance); revenue rollups.
- **Service Alerts Composer:** create/edit/publish (title, message, severity, type, targeting routes/stops/geo-area/all, `startsAt`/`endsAt`, status); affected-subscriber preview; publish → fan-out.
- **Analytics:** passengers / vehicles / drivers / routes / revenue dashboards with date/route/vehicle/driver filters; **demand heatmap** overlay on the map.
- **Reports & Export:** report builder across all entities; filters; CSV / PDF export.
- **Trip Replay:** select vehicle + date + trip → `GET /tracking/trip/:id/history` → map playback (play/pause/scrub/speed), stop markers, deviation segments highlighted, delay annotations.
- **Audit Logs:** searchable/filterable (user, action, resource, resourceId, old/new value, timestamp, IP/device); diff viewer.
- **System Settings:** organization, city, operating hours, holidays, fare settings, notification settings, language, ETA/delay thresholds, geofence config, `gpsSendIntervalSeconds`, `offlineVehicleTimeoutSeconds`, `checklistBlocksTripStart`, `mapTileSource`, `minSupportedAppVersion`, feature flags.
- **User & RBAC Management:** user CRUD, activate/deactivate, search/filter; role assignment; role-permission mapping editor; permission preview.
- **Notification Templates:** per-channel (Web Push / SMS / email / in-app) editor with variables; preview; enable/disable per event type.
- **Monitoring Views (Phase 7, optional):** embeds/links for API, DB, Redis, WebSocket, queue, GPS-ingestion health (Grafana).

---

## 7. State & Data Architecture

- **Server state:** React Query; keys per resource; `staleTime` tuned per volatility; invalidate on mutation; `select` to shape.
- **Realtime state:** Socket.IO events patch the React Query cache or a Zustand `liveVehicles` store; screens subscribe/unsubscribe per room; on reconnect refetch snapshot then resume patches.
- **Client state:** Zustand for auth/session (access token **not** persisted), config, active-trip (Driver), offline-queue status, UI prefs, map viewport.
- **Offline (Dexie/IndexedDB):** queue tables carry `idempotencyKey`, `createdAt`, `status`, `lastError`; reference tables carry `version`/`etag`; a single sync engine with FIFO + backoff + per-item reconciliation; `navigator.storage.persist()`.
- **Assets & tiles:** Serwist Cache Storage strategies; pre-cache route-corridor tiles for the operations area.
- **Forms:** react-hook-form + zod schemas aligned with OpenAPI request bodies.
- **Types:** generated from OpenAPI; no hand-written response types; CI fails on drift.

---

## 8. Non-Functional Requirements

Installable PWA (passes Lighthouse PWA checks) · offline-resilient (read everywhere, queued writes in Passenger/Operations) · responsive (mobile-first Passenger/Operations, desktop-first Admin) · accessible (WCAG AA on Admin; large-text / screen-reader / voice call-outs in Operations) · internationalised · themeable (light/dark + field mode) · observable · performant.

Implement: input validation (zod) · route-level error boundaries · loading/empty/error/offline states everywhere · optimistic updates with rollback where safe · list virtualization (long tables, stop lists) · map render throttling (batch `vehicle:location` to rAF; never re-render per event) · code-splitting / lazy routes · service-worker update flow with user prompt · access token only in memory · no PII/tokens in logs or telemetry · feature flags from `config` · `traceId` surfaced in bug reports · CSP + Trusted Types on the Next.js app · Lighthouse CI budgets (TTI, bundle size) enforced in CI.

---

## 9. Testing Strategy

- **Unit:** components, hooks, Zustand stores, the offline sync engine, fare/ETA formatting, zod schemas, event→cache reducers.
- **Integration:** area flows against the **mock server** (auth + refresh cookie, start-trip, offline flush, ticketing, journey planner, Admin CRUD).
- **Contract:** validate responses against generated OpenAPI types; snapshot Socket.IO event payloads; CI drift gate.
- **Realtime:** simulated socket events → assert map/store updates, reconnection resync, room subscribe/unsubscribe.
- **Offline / PWA:** service-worker registration + update flow; airplane-mode simulation — queue growth, FIFO flush, idempotency, partial-failure, stale-position suppression; wake-lock loss handling.
- **E2E (Playwright):** guest search + passenger tracking; driver trip lifecycle incl. pause/resume + tracking-paused; conductor ticket + QR + reconciliation; admin fleet map, route editor, dispatch SOS ack, trip replay, report export; PWA install + offline load.
- **Visual:** Storybook + snapshot for the design system.
- **Performance:** map with N vehicles; long stop lists; large audit tables; cold start; JS-thread FPS during an active trip.
- **Accessibility:** axe-core in CI; manual screen-reader pass on the driver flow.

---

## 10. Expected Output from the AI (before implementation code)

1. **Frontend Architecture** — the single Next.js PWA, rendering strategy per area, data/state layers, realtime layer, offline layer, service-worker design.
2. **Project Structure** — full `app/` route-group tree + `lib/` + `components/` + `sw.ts` + manifest.
3. **Design System** — tokens, core component list, field-mode variants, theming + dark mode, Storybook setup.
4. **Screen Inventory** — every route per area with data sources (REST endpoints + socket rooms), states, and navigation edges.
5. **API Integration Map** — each endpoint → hook/screen, request/response types, error handling, idempotency, cookie/bearer auth.
6. **Realtime Integration Doc** — connection/auth, room subscribe/unsubscribe per screen, every consumed event → cache/store mutation, reconnection & resync.
7. **Offline / PWA Design** — Serwist config + caching strategies, Dexie schema, sync-engine algorithm, conflict/partial-failure rules, wake-lock + visibility handling, install prompts, storage persistence.
8. **State Management Plan** — server vs realtime vs client state, query keys, invalidation rules, store shapes.
9. **Auth & RBAC (client)** — token lifecycle (memory access + cookie refresh), guest scope, device/push registration, area routing, permission-gated UI, min-version gate.
10. **i18n & Accessibility Plan.**
11. **Testing Strategy** (as above) with tooling and coverage targets for critical flows.
12. **Type-generation pipeline** — OpenAPI → types, mock server usage, CI contract-drift gate; Lighthouse CI budgets.
13. **Deployment** — Docker image (`next start`, standalone), env config, CSP, service-worker caching/versioning, running alongside the backend.

---

## 11. Development Roadmap (single developer, aligned with backend phases)

**Phase 1 — Foundation (with backend Phase 1):** Next.js app + route groups + design-system skeleton · Serwist SW + manifest + offline fallback · OpenAPI type generation + mock server wiring · API client (cookie refresh + bearer + idempotency + error envelope) · Socket.IO client wrapper · config bootstrap + min-version gate · auth (OTP, email/password, guest, device/push registration) · area routing + guards · CI (lint/typecheck/test/contract/Lighthouse).

**Phase 2 — Transport Management (with backend Phase 2):**
*Operations:* driver assignment card + attendance, pre-trip checklist, **trip state machine** (start/pause/resume/end) + active-trip recovery, reference-data cache via `/sync/*`, Dexie schema + sync engine skeleton.
*Admin:* Vehicle / Driver / Conductor / Route (map geometry editor) / Stop / Schedule / Trip CRUD with the shared DataTable; overview KPIs.

**Phase 3 — Real-Time Engine (with backend Phase 3):**
*Operations:* GPS engine (watchPosition + wake lock + visibility handling + heartbeat), offline GPS queue + bulk flush + Background Sync, driver active-trip map (next stop, ETA, deviation banner, delay, geofence "arriving"), SOS + `sos:acknowledged`, incident report, trip summary.
*Passenger:* live map + tracking + stop/route ETA.
*Admin:* Live Fleet Map, Trip Monitor, **Dispatcher Console** (SOS ack, deviation/delay/offline queue, manual-assignment approvals, dispatch messaging), force-end.

**Phase 4 — Passenger Operations (with backend Phase 4):**
*Passenger:* route/stop search, **Journey Planner**, favorites + subscriptions, notifications inbox + Web Push + quiet hours, service-alert banners, complaints, Lost & Found.
*Admin:* Complaints, Lost & Found, Service Alerts composer, Notification templates.

**Phase 5 — Ticketing & Payments (with backend Phase 5):**
*Passenger:* ticketing + passes + payments + QR ticket (offline render).
*Conductor:* issue-ticket (fare calc display), QR scan, **payment QR**, passenger count + occupancy, offline ticket/count sync, end-of-trip reconciliation.
*Admin:* Fares & Ticketing config + fare calculator preview, Payments & Reconciliation views.

**Phase 6 — Admin Operations (with backend Phase 6):** Incident board, Maintenance & Documents, Analytics dashboards + demand heatmap, Reports & Export, Trip Replay, Audit Logs, System Settings, User & RBAC management; driver performance self-view.

**Phase 7 — Production:** Playwright E2E across all areas + PWA install/offline tests · performance passes (map load, long lists, cold start, active-trip FPS) · accessibility audit · Lighthouse CI budgets green · Docker deploy alongside backend · CSP/Trusted Types · Sentry release health · service-worker cache-versioning strategy · localization completeness · contract-drift CI gate.

---

## 12. Final Goal

One production-ready **Next.js PWA** where:

```
Backend (REST + Socket.IO, per OpenAPI contract; MongoDB + Redis)
        ↓
lib/api (generated types + typed client)  ·  lib/realtime (socket)  ·  lib/offline (Dexie + sync engine)  ·  Serwist SW
        ↓
One Next.js App Router app, four role-based areas:
 ├─ Public/Passenger (GUEST, PASSENGER): live map, ETA, journey planner,
 │   favorites + subscriptions, notifications, tickets, payments, complaints, lost & found
 ├─ Operations (DRIVER): assignment, checklist, trip state machine (incl. PAUSED),
 │   foreground GPS + wake lock + offline queue, deviation/delay banners, SOS, trip summary
 ├─ Operations (CONDUCTOR): ticketing, QR, payment QR, passenger count, offline sync, reconciliation
 └─ Admin (staff roles): live fleet map, dispatcher console, full CRUD (vehicles/drivers/
     conductors/routes/stops/schedules/trips), incidents, maintenance, complaints,
     lost & found, service alerts, fares, payments & reconciliation, analytics, heatmaps,
     reports, trip replay, audit logs, system settings, RBAC
```

Built by one developer, sequenced by the roadmap above, consuming the backend's **REST endpoints, Socket.IO events, OpenAPI types, and shared conventions** exactly — developing against the mock server so frontend and backend progress in parallel, and designed around the real constraints of a browser PWA (foreground-only GPS, wake lock, evictable storage, Web Push, in-memory tokens).
