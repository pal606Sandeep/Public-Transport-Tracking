# Real-Time Public Transport Tracking System — Frontend Development Prompt (Final)

> **Revision notes for this version**
> - There are **two separate frontends**, each in its **own folder**, built and deployed independently:
>   1. **`apps/pwa`** — the **Progressive Web App**: Passenger (+ Guest) and Operations (Driver, Conductor). Installable, offline-capable, Web Push, mobile-first.
>   2. **`apps/admin`** — the **Admin Dashboard**: pure web app for staff roles. **No service worker, no offline, not installable.** Desktop-first, online-only, data-dense.
> - They share one package: **`packages/shared`** (generated API types, typed REST client, Socket.IO client, design tokens, enums).
> - **Client state = Redux Toolkit** (not Zustand), in both apps. Server cache stays **TanStack Query**.
> - **Testing = Jest** + React Testing Library for unit/integration (not Vitest); Playwright for E2E; MSW for the mock backend.
> - Backend datastore is **MongoDB + Redis** — not the frontend's concern beyond the API contract. The PWA caches locally in **IndexedDB** (Dexie) + Cache Storage; the Admin app does **not** cache offline.
> - Push uses **Web Push (VAPID)** via the PWA's service worker only.

You are a senior frontend architect and TypeScript engineer (React / Next.js / Redux).

We are building the **frontend for a Real-Time Public Transport Tracking System for Small Cities**. The backend is built separately by two backend developers and exposes versioned REST APIs (`/api/v1/*`), a Socket.IO real-time layer, an **OpenAPI 3.1 spec**, and a **mock server** delivered in Phase 1. This prompt covers the frontend only and must consume those contracts exactly.

---

## 1. What we are building — two frontends

| | **App 1 — PWA** (`apps/pwa`) | **App 2 — Admin** (`apps/admin`) |
|---|---|---|
| **Users** | `GUEST`, `PASSENGER`, `DRIVER`, `CONDUCTOR` | `SUPER_ADMIN`, `ADMIN`, `TRANSPORT_MANAGER`, `DISPATCHER`, `MAINTENANCE_MANAGER`, `SUPPORT_STAFF` |
| **Form factor** | Mobile-first, installable to home screen | Desktop-first dashboard |
| **Service worker** | Yes (Serwist) — precache shell, runtime caching, Background Sync, Web Push | **None** |
| **Offline** | Read from cache everywhere; queued writes in Passenger/Operations | **Online-only**; show a connection-lost state, no queue |
| **Real-time** | Socket.IO (passenger tracking, driver/conductor trip) | Socket.IO (live fleet map, dispatcher console, trip monitor) |
| **Auth** | OTP / email+password / **guest**, device + push registration | email+password / OTP, **no guest**, no device binding |
| **Framework** | Next.js App Router | Next.js App Router |
| **Client state** | Redux Toolkit | Redux Toolkit |
| **Server cache** | TanStack Query | TanStack Query |
| **Deploy** | its own Docker image / origin | its own Docker image / origin |

The two apps never import each other. All cross-app code lives in `packages/shared`. Build order: **PWA first**, Admin second (they can overlap once the shared package is stable).

---

## 2. Tech Stack

### Shared (`packages/shared`)
- **Types:** `openapi-typescript` generates types from the backend OpenAPI 3.1 spec. No hand-written response types; CI fails on drift.
- **REST client:** fetch wrapper — base URL, `Authorization: Bearer` from memory, `credentials: "include"` for the refresh cookie, `Idempotency-Key` injection on mutations, error-envelope parsing to typed errors, `traceId` capture, retry/backoff for idempotent GETs, request de-dupe.
- **Realtime client:** `socket.io-client` wrapper — auth handshake, declarative room subscribe/unsubscribe, reconnect with backoff, typed events.
- **Design tokens** (color, type, spacing, radius, elevation) + shared enums (roles, statuses, event names) + i18n key catalogue.

### `apps/pwa`
- **Framework:** Next.js (App Router, React 18/19, TypeScript, `output: "standalone"`). Mostly client components; light SSR only for shareable `/(passenger)/stops/[id]` and `/routes/[id]`.
- **PWA / service worker:** **Serwist** (`@serwist/next`) — precache app shell, runtime strategies per route, `push` / `notificationclick` / `sync` handlers, versioned update flow. Web App Manifest with maskable icons, `display: standalone`, `orientation: portrait`, shortcuts.
- **Client state:** **Redux Toolkit** — slices: `session`, `config`, `activeTrip` (driver), `offlineQueue` (status/counts), `liveVehicles` (realtime), `ui`. `redux` store is **not** persisted for tokens; a small `redux-persist` (IndexedDB) allowlist may hold UI prefs only.
- **Server cache:** TanStack Query (offline-aware; `staleTime` per resource).
- **Local persistence:** **Dexie (IndexedDB)** for offline queues + cached reference data; Cache Storage via Serwist for assets/tiles/GET.
- **Maps:** **MapLibre GL JS** (vector tiles from `config.mapTileSource`); canvas layer for many moving markers.
- **Device APIs:** Geolocation `watchPosition`, **Screen Wake Lock**, Page Visibility, Network Information, `BarcodeDetector` (+ `@zxing/browser` fallback), Web Share, Notifications + Push.
- **Forms:** react-hook-form + **zod** (aligned with OpenAPI request bodies).
- **i18n:** `next-intl` or `i18next` — bundled catalogues, optional remote override when `featureFlags.remoteStrings`.

### `apps/admin`
- **Framework:** Next.js (App Router, React, TypeScript, `output: "standalone"`). **No Serwist, no manifest, no offline.** Standard authenticated web app.
- **Client state:** **Redux Toolkit** — slices: `session`, `config`, `liveFleet` (realtime), `dispatch` (alert queue), `ui`.
- **Server cache:** TanStack Query.
- **Maps:** MapLibre GL JS + `maplibre-gl` draw plugin for the route/stop geometry editors; playback layer for trip replay.
- **Charts:** Recharts or ECharts.
- **Data grid:** a shared `<DataTable>` (server pagination/filter/sort/column-config/CSV export) reused across every CRUD module.
- **Forms:** react-hook-form + zod.
- **i18n:** same library as the PWA, admin catalogue.

### Tooling (both apps)
ESLint + Prettier · `openapi-typescript` · **Jest + React Testing Library** · **Playwright** (E2E) · **MSW** (mock server in tests + local dev) · axe-core (a11y) · Storybook (shared design system) · **Lighthouse CI** (PWA app only — PWA + perf budgets) · Docker image per app · Turborepo or pnpm workspaces for the monorepo.

---

## 3. CRITICAL PWA CONSTRAINTS — read before designing the Driver area (applies to `apps/pwa` only)

A browser PWA **cannot** do reliable background geolocation the way a native app can. Design around this:

1. **Foreground-only GPS.** `navigator.geolocation.watchPosition()` runs only while the page is visible. Backgrounded tab / locked screen / OS suspension → updates stop.
2. **Wake Lock is mandatory during a trip.** `navigator.wakeLock.request('screen')` on trip start; re-acquire on `visibilitychange`. Persistent "Tracking active — keep this screen on" bar. Recommend a dash-mounted phone with the PWA open.
3. **Detect and communicate gaps.** On `visibilitychange → hidden` or wake-lock loss during an active trip: show a prominent "Tracking paused" state, stop pretending to track, flush the local queue on return and send a gap marker. Optionally auto-`PATCH /trips/:id {action:"pause"}` after a threshold, auto-resume on return.
4. **Background Sync is best-effort.** Use it to flush the offline GPS/ticket queue when connectivity returns even with the tab closed, but the primary flush path is on app focus / `online`.
5. **iOS specifics.** Web Push works only for an **installed** PWA on iOS 16.4+. Prompt Driver/Conductor to "Add to Home Screen". Limited storage, aggressive tab eviction — keep the operations bundle lean.
6. **Storage is evictable.** IndexedDB / Cache can be cleared under pressure. Request `navigator.storage.persist()`. Never treat the local queue as durable beyond a shift; sync early and often.
7. **Token storage.** No secure keystore in a browser. Keep the **access token in a non-persisted Redux slice**; the **refresh token is an httpOnly Secure cookie** set by the backend. On load, call `POST /auth/refresh` (cookie) to bootstrap the session.

These constraints make the small-city MVP viable (mounted phone, screen on) but must be documented for the operations team; a dedicated cheap Android device per bus is the recommended deployment.

---

## 4. Backend contract the frontend consumes (both apps)

### Conventions

- **Auth:** access token in memory (Redux `session` slice) → `Authorization: Bearer`; refresh via httpOnly cookie (`POST /api/v1/auth/refresh`, `credentials: "include"`). Socket.IO handshake passes the access token in `auth`.
- **Error envelope:** `{ error: { code, message, details?, traceId } }` — render `message`, log `code` + `traceId` to Sentry.
- **Idempotency-Key** header (client-generated UUID) on: trip start, checklist submit, ticket create, `tickets/bulk`, `passenger-count/bulk`, payment create, `tracking/location/bulk`.
- **Time:** use `serverTime` from `GET /config` (and `GET /time`) for scheduling math; device clock only for local ordering of queued items.
- **Config:** call `GET /api/v1/config` on every load; store `gpsSendIntervalSeconds`, `geofenceRadiusMeters`, `delayThresholds`, `mapTileSource`, `supportedLanguages`, `vapidPublicKey`, `minSupportedAppVersion`, `featureFlags`, `serverTime`. Enforce `minSupportedAppVersion` with a blocking "reload to update" screen. Never hard-code these.
- Develop against the **mock server (MSW / the backend's mock)** from day one; swap the base URL for the real backend later.

### REST endpoints by consumer

| Area | Endpoints | PWA | Admin |
|---|---|---|---|
| Bootstrap | `GET /config`, `GET /time` | ✅ | ✅ |
| Auth | `POST /auth/login`, `/auth/otp`, `/auth/refresh`, `/auth/guest`, `/auth/logout`, `/auth/forgot`, `/auth/reset`; `POST/DELETE/GET /auth/devices` | ✅ (guest + devices) | ✅ (no guest/devices) |
| Me (Ops) | `GET /me/assignments`, `/me/active-trip`, `/me/performance`; `POST /me/attendance/check-in`\|`check-out`; `POST /me/assignments/request` | ✅ | — |
| Trips (Ops) | `POST /trips` (start), `PATCH /trips/:id {action:pause\|resume\|end}`, `POST /trips/:id/checklist`, `GET /trips/:id` | ✅ | — |
| Trips (Admin) | `GET /trips`, `POST /admin/trips/:id/force-end`, create/assign/cancel/mark-missed | — | ✅ |
| Tracking | `POST /tracking/location`, `/tracking/location/bulk`, `POST /tracking/heartbeat`, `POST /tracking/sos`, `GET /tracking/trip/:id`, `GET /tracking/trip/:id/history` | ✅ (send + SOS) | ✅ (read + replay) |
| Reference sync | `GET /sync/routes\|stops\|fares\|schedules?updatedSince=` (ETag) | ✅ | optional |
| Passenger | `GET /journeys`, `GET /routes`, `GET /stops`, `GET /service-alerts`, `GET/POST/DELETE /passengers/me/subscriptions`, favorites, `GET /me/notifications` | ✅ | — |
| Ticketing | `POST /fares/calculate`, `POST /tickets`, `POST /tickets/bulk`, `POST /tickets/scan`, `GET /tickets`, passes | ✅ | ✅ (config + views) |
| Payments | `POST /payments`, `POST /payments/qr`, `GET /payments`, refunds | ✅ | ✅ (views) |
| Counts / reconciliation | `POST /trips/:id/passenger-count`, `/passenger-count/bulk`, `POST /trips/:id/reconciliation` | ✅ (conductor) | ✅ (views) |
| Uploads | `POST /uploads/presign` → S3 PUT → submit key | ✅ | ✅ |
| Admin CRUD | `/admin/{users,drivers,conductors,vehicles,routes,stops,schedules,trips,service-alerts,analytics,reports}` | — | ✅ |
| Ops data | `/incidents`, `/complaints`, `/lost-found`, `/maintenance`, `/audit-logs`, `/system-settings`, `/notifications/templates` | complaints + lost-found (passenger) | ✅ full |

### Socket.IO

**Rooms:** `vehicle:{id}` · `route:{id}` · `trip:{id}` · `fleet:all`.

**Events consumed:** `vehicle:location`, `vehicle:status`, `vehicle:arriving`, `vehicle:arrived`, `vehicle:left`, `vehicle:occupancy`, `vehicle:delay`, `vehicle:offline`, `route:deviation`, `trip:started`, `trip:paused`, `trip:resumed`, `trip:completed`, `trip:cancelled`, `trip:force_end`, `driver:sos`, `sos:acknowledged`, `gps:error`, `payment:confirmed`, `service:alert`, `assignment:changed`, `dispatch:message`.

| Room / event | PWA — Passenger | PWA — Operations | Admin |
|---|---|---|---|
| `route:{id}` + `vehicle:location`/`arriving`/`delay`/`occupancy` | live map & stop ETA | — | route monitoring |
| `trip:{id}` + `trip:*` | tracked bus | driver/conductor active trip | trip monitor |
| `fleet:all` | — | — | live fleet map |
| `driver:sos`, `route:deviation`, `vehicle:offline`, `gps:error` | — | driver: own `sos:acknowledged`, deviation banner | dispatcher console alerts |
| `assignment:changed`, `dispatch:message`, `trip:force_end` | — | react in the ops UI | dispatcher sends |
| `payment:confirmed` | passenger payment result | conductor confirmation | payments view |
| `service:alert` | banner + Web Push | — | — |

---

## 5. Repository structure (monorepo, two apps, one shared package)

```
transport-frontend/
  package.json                 # pnpm workspaces / Turborepo
  packages/
    shared/
      src/
        api/                   # openapi types + typed REST client + endpoint hooks
        realtime/              # socket client + typed events + room helpers
        design/               # tokens, primitives, Storybook stories
        enums/  i18n-keys/  utils/
  apps/
    pwa/                       # ── FRONTEND 1: the PWA ──
      app/
        (public)/              # /login, /otp, /forgot, /guest, landing
        (passenger)/           # GUEST | PASSENGER
          map/ search/ planner/ stops/[id]/ routes/[id]/
          favorites/ notifications/ alerts/
          tickets/ tickets/[id]/ passes/ pay/
          complaints/ lost-found/ profile/
        (operations)/          # DRIVER | CONDUCTOR
          driver/ home/ checklist/ trip/ trip/summary/ incident/ sos/ performance/
          conductor/ trip/ issue-ticket/ scan/ count/ reconcile/
          settings/
        manifest.webmanifest
        ~offline/              # offline fallback page
      sw.ts                    # Serwist service worker
      src/
        store/                 # Redux Toolkit store + slices (session, config, activeTrip, offlineQueue, liveVehicles, ui)
        query/                 # TanStack Query client + hooks
        realtime/              # room hooks + event→(query cache | liveVehicles slice) reducers
        offline/               # Dexie schema, queues, sync engine
        gps/                   # watchPosition + wake lock + visibility engine
        auth/  maps/  i18n/  telemetry/
        components/
      tests/                   # Jest + RTL, Playwright specs
    admin/                     # ── FRONTEND 2: the Admin dashboard (pure web, no SW) ──
      app/
        (auth)/                # /login, /otp
        (dashboard)/
          overview/ fleet/ vehicles/ drivers/ conductors/
          routes/ stops/ schedules/ trips/ dispatch/
          incidents/ maintenance/ complaints/ lost-found/
          fares/ payments/ service-alerts/
          analytics/ reports/ replay/ audit/ settings/ users/
          notifications/templates/
      src/
        store/                 # Redux Toolkit store + slices (session, config, liveFleet, dispatch, ui)
        query/  realtime/  auth/  maps/  charts/  datatable/  i18n/  telemetry/
        components/
      tests/
```

`apps/admin` has **no** `sw.ts`, `manifest.webmanifest`, `~offline/`, `offline/`, `gps/`, or Dexie — it is online-only.

---

## 6. DETAILED RESPONSIBILITIES

### 6.1 Shared package (`packages/shared`)

- OpenAPI → TS types pipeline + a script both apps run; contract-drift CI gate.
- Typed REST client (see §4 conventions). Endpoint hook factories usable by both apps' TanStack Query layers.
- Typed Socket.IO client: `connect(token)`, `joinRoom` / `leaveRoom`, typed `on(event, handler)`, reconnect + resync callback.
- Design tokens + headless primitives (Button, Field, Select, Combobox, Dialog, Sheet, Toast, Tabs, StatusPill, EmptyState) with Storybook. App-specific composition (mobile bottom-nav vs desktop sidebar, `<DataTable>`, `<MapCanvas>`) lives in each app.
- Shared enums and the i18n key catalogue.

### 6.2 PWA — App Foundation & Shell

- **Service worker (Serwist):** precache shell; `NetworkFirst` for `GET /config` + reference reads, `StaleWhileRevalidate` for tiles/assets, `NetworkOnly` for mutations, offline fallback route; `push` / `notificationclick` / `sync` handlers; versioned update with an in-app "new version — reload" toast.
- **Manifest & install:** maskable icons, `display: standalone`, shortcuts ("Live map", "My trip"); capture `beforeinstallprompt`; contextual "Add to Home Screen" nudges for Driver/Conductor (required for iOS push) and frequent passengers.
- **Config bootstrap:** load `GET /config` before the authed shell; hydrate the `config` slice; min-version gate.
- **Auth session:** on load `POST /auth/refresh` (cookie) → access token into the `session` slice; silent refresh before expiry; route to `/login` on failure; role-based redirect (`passenger` vs `operations`); per-area route guards.
- **Redux store:** RTK `configureStore`; slices `session`, `config`, `activeTrip`, `offlineQueue`, `liveVehicles`, `ui`; RTK listener middleware for cross-slice effects (e.g. trip end → stop GPS engine); `redux-persist` allowlist limited to `ui` prefs.
- **Realtime:** connect after auth; `useRoom(room)` subscribes on mount / unsubscribes on unmount; on reconnect refetch REST snapshot for mounted views then resume patches; events patch the TanStack Query cache or dispatch to the `liveVehicles` slice.
- **Offline layer:** Dexie stores `gps_queue`, `event_queue`, `ticket_queue`, `count_queue`, `ref_routes`, `ref_stops`, `ref_fares`, `ref_schedules`, `snapshots`. One **sync engine**: FIFO drain with backoff, attaches `Idempotency-Key`, applies per-item server results, surfaces conflicts; triggered on `online`, focus, an interval while foreground, and Background Sync. `offlineQueue` slice mirrors counts/status for the UI.
- **Network & storage UX:** global offline banner + pending-sync count; `navigator.storage.persist()`; low-quota warning.
- **Push:** request permission after a meaningful action (never on load); subscribe with `config.vapidPublicKey`; send `PushSubscription` via `POST /auth/devices`; SW renders notifications; `notificationclick` deep-links; respect quiet hours.
- **i18n / theme:** catalogues + language switch; light/dark; high-contrast large-tap **field mode** for Operations.
- **Errors / telemetry:** route-level error boundaries, typed error toasts, skeleton/empty/offline states, "report a problem" attaching the last `traceId`; Sentry with release health; no PII/tokens in logs.

### 6.3 PWA — Authentication & Guest

- Contextual permission priming (location, notifications).
- **OTP** login (paste/auto-fill, resend cooldown, lockout messaging); email/password fallback; forgot / reset.
- **Guest mode:** `POST /auth/guest` → read-only passenger token; guest can search, plan journeys, view live tracking, join read-only rooms; favouriting / complaints / tickets trigger a "create an account" flow.
- **Device registration** on login (`POST /auth/devices` with `userAgent`, later the `PushSubscription`); "device not authorized" screen for Driver/Conductor second-device rejection with a "request access" action.
- Role picker for staff holding multiple roles; area redirect.
- Profile; notification preferences (quiet hours, digest); language; logout (unsubscribes push, clears the `session` slice); device list with revoke.

### 6.4 PWA — Passenger Area

- **Live Transport Map:** vehicles for viewport/selected route via `route:` room `vehicle:location`; smooth interpolation + heading; status styling (moving / stopped / delayed / offline / maintenance); route polylines; vehicle number; "updated Ns ago"; occupancy pill from `vehicle:occupancy`; rAF-throttled renders; marker clustering/canvas.
- **Search (From → To)** → `GET /journeys`: routes, transfers, ETA, distance, fare, walking distance to first stop, next bus.
- **Journey Planner:** ranked options; per-leg walk/ride, transfer points, per-leg + total fare, total duration, live next-departure per leg.
- **Stop details:** name, map, routes serving it, upcoming buses with **ETA + scheduled time + delay**, platform/stand, nearby stops; subscribe to relevant rooms while open.
- **Route details:** ordered stop list, live buses, next buses, schedule, fare, service status.
- **ETA display:** minutes + distance per tracked bus; backend values only.
- **Favorites & subscriptions:** favorite stops/routes; `POST /passengers/me/subscriptions` for delay/deviation/cancellation/service-alert pushes.
- **Notifications inbox:** list, read/unread, deep links; preferences.
- **Service alerts:** banner on affected route/stop screens + Web Push; `GET /service-alerts` + `service:alert`.
- **Complaints:** create (category, text, rating, photo via `POST /uploads/presign` → S3 PUT); track status/history.
- **Lost & Found:** report lost item (description, vehicle/route, date/time, photo); track case.
- **Tickets & passes:** buy ticket (route, boarding + destination stop, category/concession) → fare from `POST /fares/calculate` (display only) → pay → QR ticket rendered client-side; history; passes; show QR for validation; cache active tickets/passes in IndexedDB for offline render.
- **Payments:** UPI / card / net banking / wallet via the gateway's web checkout; webhook-driven status → reflect `payment:confirmed`; transaction history; refund status.
- **Offline behaviour:** last-known map snapshot, cached routes/stops/schedules, cached tickets/passes; complaint / lost-found writes queue and sync.

### 6.5 PWA — Driver Area (Operations)

- **Home / assignment card:** `GET /me/assignments?date=today` — vehicle, route (geometry + ordered stops + offsets + scheduled times), shift window, trip list; empty state + `POST /me/assignments/request`; live `assignment:changed`.
- **Attendance:** check-in / check-out tied to the shift.
- **Pre-trip checklist:** form → `POST /trips/:id/checklist`; `config.checklistBlocksTripStart` gates start.
- **Trip state machine (UI):** `IDLE → ON_TRIP → PAUSED(ON_BREAK) → COMPLETED`; `POST /trips` (start) and `PATCH /trips/:id {action}` with `Idempotency-Key`; end confirmation guard; state held in the `activeTrip` slice.
- **Active-trip recovery:** on load `GET /me/active-trip` → restore + offer resume.
- **Active-trip map:** own marker snapped to route line, polyline, stop pins; next-stop banner (name + distance + **backend ETA**); collapsible upcoming stops; status pill; geofence "arriving"; **route-deviation warning banner** (`route:deviation`); delay indicator (`vehicle:delay`); recenter/follow.
- **GPS engine (foreground, per §3):** Wake Lock on start + re-acquire on `visibilitychange`; `watchPosition` `enableHighAccuracy`; emit at `config.gpsSendIntervalSeconds` (adaptive 5–15s; reduced while `PAUSED`); package `{tripId, vehicleId, lat, lng, speed, heading, accuracy, timestamp}`; drop low-accuracy fixes; `POST /tracking/heartbeat` while foregrounded but stationary; on hidden / wake-lock loss show "Tracking paused", stop the watch, optionally auto-pause, resume + flush + gap marker on return.
- **Offline queue:** buffer fixes + lifecycle events in Dexie; flush oldest-first via `POST /tracking/location/bulk` (`Idempotency-Key`) on reconnect/focus/Background Sync; buffer cap; live position jumps to now after flush; manual "sync now".
- **Reference cache:** on login cache routes/stops/schedules/fares via `GET /sync/*` (ETag); cache tiles for the assigned route corridor.
- **Navigation:** next-stop guidance now; client-side turn-by-turn between stops via the map SDK — Phase 3.
- **SOS:** one tap from any ops screen → `POST /tracking/sos`; "help notified" state; render `sos:acknowledged`; emergency-contacts view.
- **Report incident:** breakdown / accident / road blocked / other + note + optional photo; breakdown offers auto-end.
- **Trip summary:** display backend stats (distance, duration, on-time vs scheduled, stops served); driver confirms.
- **Performance self-view:** `GET /me/performance`.
- **Dispatch:** receive `dispatch:message`; handle `trip:force_end`.

### 6.6 PWA — Conductor Area (Operations)

- **Join active trip:** attach to the driver's `trip:` room; read-only map + next stop + ETA.
- **Issue ticket:** boarding stop (default = current), destination stop, passenger count/type, concession → **fare display** from `POST /fares/calculate` → collect cash (mark paid) or **show payment QR** (`POST /payments/qr`, await `payment:confirmed`); ticket list for the trip.
- **QR scan:** `BarcodeDetector` (fallback `@zxing/browser`) → `POST /tickets/scan`; valid/invalid; prevent reuse.
- **Passenger count:** +1 / −1 or absolute at a stop; occupancy pill vs capacity (🟢/🟡/🔴).
- **Offline sync:** queue tickets + counts in Dexie; flush via `POST /tickets/bulk` and `POST /trips/:id/passenger-count/bulk` (per-item `Idempotency-Key`); per-item result handling.
- **End-of-trip reconciliation:** `POST /trips/:id/reconciliation` (tickets issued, cash, digital); show expected vs collected variance; confirm.

### 6.7 Admin Dashboard (`apps/admin`) — pure web, online-only

- **Shell:** responsive sidebar + topbar, **RBAC-driven menu** (items/actions from token `permissions`; backend 403 is the real enforcement), command palette, breadcrumb; desktop-first, keyboard-friendly; print styles for reports. **No service worker, no install, no offline queue** — on connection loss show a blocking "reconnecting" state.
- **Auth:** email/password + OTP; cookie refresh + in-memory access token in the `session` slice; session/device list; forced logout. No guest.
- **Realtime:** join `fleet:all` + selected `route:` / `vehicle:` / `trip:` rooms; live badges/toasts for SOS / deviation / offline; `dispatch` slice holds the alert queue.
- **Overview dashboard:** KPI tiles (total / active / offline vehicles, drivers, routes, stops, passengers today, trips today, open incidents); live mini-map; alert feed; today's on-time chart.
- **Live Fleet Map:** all vehicles on `fleet:all`; filter by route/status/driver/depot; vehicle popover (number, route, speed, heading, current/next stop, last GPS, driver, occupancy); click-through to trip monitor; deviation/offline/SOS highlighting.
- **Vehicle Management:** CRUD (registration, model, type, capacity, fuel, GPS device ID, `wheelchairAccessible`, amenities); assignments; status (`ACTIVE`/`INACTIVE`/`MAINTENANCE`/`RETIRED`); history.
- **Driver Management:** CRUD + profile (employee ID, license, expiry, joining date, status); attendance; shifts; assignments; performance; trip history; complaints; license-expiry warnings.
- **Conductor Management:** CRUD + profile; shift; attendance; assignments; ticket sales & revenue views; performance; reconciliation variance history.
- **Route Management:** CRUD; **map geometry editor** (draw/edit GeoJSON `LineString`); route-stop add/remove/reorder + sequence + `scheduledOffsetMinutes`; live buses + service status.
- **Stop Management:** CRUD (name, location via map pin, facilities, shelter, accessibility, landmarks); route assignment; per-route sequence; nearby stops.
- **Schedule Management:** CRUD; assign route/vehicle/driver/conductor; operating hours; daily/weekly/weekend/holiday/special; trigger trip-instance materialisation; conflict-detection UI.
- **Trip Management & Monitor:** list + filters; statuses incl. `PAUSED`; create/assign/cancel/mark-missed; **live trip monitor** (map + stop progress + ETA + delay from `trip:` room); **force-end**; trip summary + stats.
- **Dispatcher Console:** unified real-time queue — `driver:sos` (acknowledge → `sos:acknowledged`, escalate to incident), `route:deviation`, `vehicle:delay`, `vehicle:offline`, `gps:error`; **manual-assignment requests** approve/reject; **dispatch messaging** to a driver/conductor/route (`dispatch:message`); broadcast prompts.
- **Incident Management:** board (`OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`); types; auto-created from real-time events; assign, note, attach (presigned upload), link vehicle/trip/driver; vehicle-status side effects.
- **Maintenance & Documents:** service schedule & history; repairs, parts, tyre/oil, inspections; vehicle documents (registration, insurance, fitness, PUC) with expiry dashboards; "service due" board.
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

### Both apps
- **Server state:** TanStack Query — keys per resource; `staleTime` per volatility; invalidate on mutation; `select` to shape.
- **Client state:** **Redux Toolkit** — `configureStore`, feature slices, `createAsyncThunk` only for genuinely client-owned async (e.g. bootstrap sequencing); listener middleware for cross-slice effects. Server data does **not** go in Redux — it stays in TanStack Query.
- **Realtime:** Socket.IO events either patch the TanStack Query cache (entity updates) or dispatch to a realtime slice (`liveVehicles` in PWA, `liveFleet` / `dispatch` in Admin) for high-frequency positional data.
- **Forms:** react-hook-form + zod aligned with OpenAPI request bodies.
- **Types:** generated from OpenAPI in `packages/shared`; CI drift gate.

### PWA only
- **Offline (Dexie/IndexedDB):** queue tables carry `idempotencyKey`, `createdAt`, `status`, `lastError`; reference tables carry `version`/`etag`; single sync engine (FIFO + backoff + per-item reconciliation); `navigator.storage.persist()`. The `offlineQueue` slice mirrors status for the UI only.
- **Assets & tiles:** Serwist Cache Storage strategies; pre-cache route-corridor tiles for Operations.
- **Redux persistence:** `redux-persist` allowlist = `ui` prefs only; never tokens, never server data.

### Admin only
- **No Dexie, no Serwist, no persisted store.** Everything is fetched live; a reconnect/offline state replaces any caching.

---

## 8. Non-Functional Requirements

### PWA (`apps/pwa`)
Installable (passes Lighthouse PWA checks) · offline-resilient (read everywhere, queued writes in Passenger/Operations) · mobile-first · accessible (large text, screen-reader labels, voice call-outs in Operations) · i18n · light/dark + field mode · Sentry · Lighthouse CI budgets (TTI, bundle size) in CI · CSP + Trusted Types · access token only in memory · no PII/tokens in logs · service-worker update flow with user prompt · rAF-batched map renders.

### Admin (`apps/admin`)
Desktop-first, responsive down to tablet · **WCAG 2.1 AA** · keyboard-navigable, focus management · i18n · light/dark · Sentry · CSP + Trusted Types · access token only in memory · no PII/tokens in logs · list virtualization for large tables · code-splitting / lazy routes · print styles for reports · **no PWA/offline requirements**.

### Both
Input validation (zod) · route-level error boundaries · loading/empty/error/(dis)connected states everywhere · optimistic updates with rollback where safe · feature flags from `config` · `traceId` surfaced in bug reports · contract-drift CI gate.

---

## 9. Testing Strategy

- **Unit (Jest + React Testing Library):** components, hooks, **Redux slices + selectors + listener middleware**, the PWA offline sync engine, GPS/wake-lock engine (mocked APIs), fare/ETA formatting, zod schemas, event→cache/slice reducers.
- **Integration (Jest + RTL + MSW):** area flows against the mock server — auth + refresh cookie, start-trip, offline flush, ticketing, journey planner (PWA); CRUD, dispatcher console, route editor (Admin).
- **Contract:** validate responses against generated OpenAPI types; snapshot Socket.IO event payloads; CI drift gate.
- **Realtime:** simulated socket events → assert query cache / slice updates, reconnection resync, room subscribe/unsubscribe.
- **Offline / PWA (PWA only):** SW registration + update flow; airplane-mode simulation — queue growth, FIFO flush, idempotency, partial-failure, stale-position suppression; wake-lock loss handling.
- **E2E (Playwright):**
  - PWA: guest search + passenger tracking; driver trip lifecycle incl. pause/resume + tracking-paused; conductor ticket + QR + reconciliation; PWA install + offline load.
  - Admin: fleet map, route geometry editor, dispatch SOS ack, trip replay, report export, RBAC menu gating.
- **Visual:** Storybook + snapshot for the shared design system.
- **Performance:** map with N vehicles; long stop lists (PWA); large audit tables (Admin); cold start; JS-thread FPS during an active trip.
- **Accessibility:** axe-core in CI for both apps; manual screen-reader pass on the driver flow and the Admin CRUD forms.

---

## 10. Expected Output from the AI (before implementation code)

1. **Monorepo Architecture** — the two apps + shared package, dependency boundaries, build/deploy per app, rendering strategy per app.
2. **Shared Package Design** — OpenAPI type pipeline, REST client, Socket.IO client, design tokens, what stays shared vs app-specific.
3. **PWA Architecture** — route groups, Serwist SW design, Redux store + slices, TanStack Query layer, offline layer, GPS engine, realtime layer.
4. **Admin Architecture** — route structure, Redux store + slices, realtime layer, `<DataTable>` contract, chart layer, RBAC menu model.
5. **Screen Inventory** — every route in each app with data sources (REST endpoints + socket rooms), states, navigation edges.
6. **API Integration Map** — each endpoint → hook/screen (per app), request/response types, error handling, idempotency, cookie/bearer auth.
7. **Realtime Integration Doc** — connection/auth, room subscribe/unsubscribe per screen, every consumed event → query cache or Redux slice mutation, reconnection & resync (per app).
8. **PWA Offline / SW Design** — Serwist config + caching strategies, Dexie schema, sync-engine algorithm, conflict/partial-failure rules, wake-lock + visibility handling, install prompts, storage persistence.
9. **State Management Plan (Redux Toolkit)** — store config, slice list + shapes + reducers/selectors, listener middleware effects, what stays in TanStack Query vs Redux, persistence allowlist (PWA).
10. **Auth & RBAC (client)** — token lifecycle (memory access + cookie refresh) for both apps, guest scope (PWA), device/push registration (PWA), area/role routing, permission-gated UI, min-version gate.
11. **i18n & Accessibility Plan** (per app).
12. **Testing Strategy** — Jest + RTL + MSW + Playwright layout, coverage targets for critical flows, Lighthouse CI budgets (PWA).
13. **Deployment** — one Docker image per app (`next start`, standalone), env config, CSP, PWA service-worker caching/versioning, running both alongside the backend.

---

## 11. Development Roadmap (build the PWA first, then the Admin; aligned with backend phases)

**Phase 1 — Foundation (with backend Phase 1):** monorepo (pnpm/Turborepo) + `packages/shared` skeleton · OpenAPI type generation + MSW mock wiring · shared REST + Socket.IO clients · shared design tokens + Storybook · **PWA**: Next.js app + route groups + Serwist SW + manifest + offline fallback + Redux store skeleton + config bootstrap + min-version gate + auth (OTP, email/password, guest, device/push registration) + area routing/guards · **Admin**: Next.js app scaffold + Redux store skeleton + auth (email/password, OTP) + shell + RBAC menu · CI (lint/typecheck/**Jest**/contract/Lighthouse-PWA).

**Phase 2 — Transport Management (with backend Phase 2):**
*PWA Operations:* driver assignment card + attendance, pre-trip checklist, **trip state machine** + active-trip recovery, reference-data cache via `/sync/*`, Dexie schema + sync-engine skeleton.
*Admin:* Vehicle / Driver / Conductor / Route (map geometry editor) / Stop / Schedule / Trip CRUD with `<DataTable>`; overview KPIs.

**Phase 3 — Real-Time Engine (with backend Phase 3):**
*PWA Operations:* GPS engine (watchPosition + wake lock + visibility + heartbeat), offline GPS queue + bulk flush + Background Sync, driver active-trip map (next stop, ETA, deviation banner, delay, geofence "arriving"), SOS + `sos:acknowledged`, incident report, trip summary.
*PWA Passenger:* live map + tracking + stop/route ETA.
*Admin:* Live Fleet Map, Trip Monitor, **Dispatcher Console**, force-end.

**Phase 4 — Passenger Operations (with backend Phase 4):**
*PWA Passenger:* route/stop search, **Journey Planner**, favorites + subscriptions, notifications inbox + Web Push + quiet hours, service-alert banners, complaints, Lost & Found.
*Admin:* Complaints, Lost & Found, Service Alerts composer, Notification templates.

**Phase 5 — Ticketing & Payments (with backend Phase 5):**
*PWA Passenger:* ticketing + passes + payments + QR ticket (offline render).
*PWA Conductor:* issue-ticket (fare calc display), QR scan, **payment QR**, passenger count + occupancy, offline ticket/count sync, reconciliation.
*Admin:* Fares & Ticketing config + fare calculator preview, Payments & Reconciliation views.

**Phase 6 — Admin Operations (with backend Phase 6):** Incident board, Maintenance & Documents, Analytics dashboards + demand heatmap, Reports & Export, Trip Replay, Audit Logs, System Settings, User & RBAC management; driver performance self-view (PWA).

**Phase 7 — Production:** Playwright E2E for both apps (+ PWA install/offline tests) · performance passes · accessibility audits (PWA + Admin) · Lighthouse CI budgets green (PWA) · one Docker image per app deployed alongside the backend · CSP/Trusted Types · Sentry release health · SW cache-versioning · localization completeness · contract-drift CI gate.

---

## 12. Final Goal

Two production-ready frontends sharing one package:

```
Backend (REST + Socket.IO, per OpenAPI contract; MongoDB + Redis)
        ↓
packages/shared  (generated types · REST client · Socket.IO client · design tokens)
        ↓                                             ↓
apps/pwa  (Progressive Web App)                 apps/admin  (pure web dashboard)
 ├─ Passenger/Guest: live map, ETA, journey       ├─ Live fleet map, dispatcher console
 │   planner, favorites + subscriptions,          ├─ Vehicle/Driver/Conductor/Route/Stop/
 │   notifications, tickets, payments,            │   Schedule/Trip management
 │   complaints, lost & found                     ├─ Incidents, Maintenance, Complaints,
 ├─ Driver: assignment, checklist, trip state     │   Lost & Found, Service Alerts
 │   machine (incl. PAUSED), foreground GPS +     ├─ Fares, Payments & Reconciliation
 │   wake lock + offline queue, deviation/        ├─ Analytics, Heatmaps, Reports, Trip Replay
 │   delay banners, SOS, trip summary             └─ Audit Logs, System Settings, RBAC
 └─ Conductor: ticketing, QR, payment QR,
     passenger count, offline sync, reconciliation
   • Serwist SW · Dexie offline queue · Web Push     • No SW · online-only · desktop-first
   • Redux Toolkit + TanStack Query                  • Redux Toolkit + TanStack Query
```

Each app is its own folder and its own deployable, consuming the backend's **REST endpoints, Socket.IO events, OpenAPI types, and shared conventions** exactly — developed against the mock server so frontend and backend progress in parallel. The PWA is designed around real browser constraints (foreground-only GPS, wake lock, evictable storage, Web Push, in-memory tokens); the Admin app is a straightforward online-only dashboard.
