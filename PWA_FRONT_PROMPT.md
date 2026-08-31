# PWA Frontend — Development Prompt

> **This is one of two split frontend prompts.** The other is `ADMIN_PROMPT.md`.
> Shared conventions (auth, error envelope, idempotency, config bootstrap, Socket.IO) are repeated in both so each file stands alone.

**Repo folder:** `frontend/` &nbsp;·&nbsp; **App:** the Progressive Web App &nbsp;·&nbsp; **Dev port:** 3000

You are a senior frontend engineer (React / Next.js App Router / Redux Toolkit / TypeScript).

This app is the **installable, offline-capable PWA** for a Real-Time Public Transport Tracking System for Small Cities. It serves **four roles from one codebase**, behind route groups and role-based layouts:

| Area | Roles | Nature |
|---|---|---|
| **Public / Passenger** | `GUEST`, `PASSENGER` | Mobile-first, installable, reads work offline |
| **Operations — Driver** | `DRIVER` | Foreground-active during a trip, background GPS via Wake Lock, offline write queue |
| **Operations — Conductor** | `CONDUCTOR` | Ticketing / counts, offline write queue |

The backend is built separately and exposes versioned REST (`/api/v1/*`), a Socket.IO layer, an **OpenAPI 3.1 spec**, and a **mock server**. Consume those contracts exactly. Develop against the mock from day one.

The **Admin dashboard is a different app** (`admin/` folder, `ADMIN_PROMPT.md`). The two apps never import each other; cross-app code (types, API client, socket client, design tokens) is duplicated per app today, and can later be lifted into a shared package.

---

## 1. Tech Stack

- **Framework:** Next.js (App Router, React 19, TypeScript, `output: "standalone"`). Mostly client components; light SSR only for shareable `/(passenger)/stops/[id]` and `/routes/[id]`.
- **PWA / service worker:** **Serwist** (`@serwist/next`) — precache app shell, runtime cache strategies per route, `push` / `notificationclick` / `sync` handlers, versioned update flow. Web App Manifest: maskable icons, `display: standalone`, `orientation: portrait`, shortcuts.
- **Client state:** **Redux Toolkit** — `configureStore`, feature slices, listener middleware for cross-slice effects. Server data does **not** live in Redux.
- **Server cache:** **TanStack Query** (offline-aware; `staleTime` per resource).
- **Local persistence:** **Dexie (IndexedDB)** for offline queues + cached reference data; Cache Storage (via Serwist) for assets/tiles/GET.
- **Maps:** **MapLibre GL JS** (vector tiles from `config.mapTileSource`); a canvas layer for many moving vehicle markers.
- **Forms:** `react-hook-form` + **zod** (schemas aligned with OpenAPI request bodies).
- **Realtime:** `socket.io-client`, wrapped in a typed client (auth handshake, declarative room subscribe/unsubscribe, reconnect + resync).
- **Device APIs:** Geolocation `watchPosition`, **Screen Wake Lock**, Page Visibility, Network Information, `BarcodeDetector` (+ `@zxing/browser` fallback), Web Share, Notifications + Push.
- **i18n:** `next-intl` or `i18next` — bundled catalogues, optional remote override when `featureFlags.remoteStrings`.
- **Testing:** **Jest + React Testing Library** (unit/integration), **Playwright** (E2E), **MSW** (mock backend), axe-core (a11y), **Lighthouse CI** (PWA + perf budgets).
- **Tooling:** ESLint + Prettier, `openapi-typescript` for generated types, Storybook for the design system.

---

## 2. CRITICAL PWA CONSTRAINTS — read before building the Driver area

A browser PWA **cannot** do reliable background geolocation like a native app. Design around this:

1. **Foreground-only GPS.** `navigator.geolocation.watchPosition()` runs only while the page is visible. Backgrounded tab / locked screen / OS suspension → updates stop.
2. **Wake Lock is mandatory during a trip.** `navigator.wakeLock.request('screen')` on trip start; re-acquire on `visibilitychange`. Show a persistent "Tracking active — keep this screen on" bar. Recommend a dash-mounted phone with the PWA open.
3. **Detect and communicate gaps.** On `visibilitychange → hidden` or wake-lock loss during an active trip: show a prominent "Tracking paused" state, stop pretending to track, flush the local queue on return and send a gap marker. Optionally auto-`PATCH /trips/:id {action:"pause"}` after a threshold; auto-resume on return.
4. **Background Sync is best-effort.** Use it to flush the offline GPS/ticket queue when connectivity returns even with the tab closed, but the primary flush path is on app focus / `online`.
5. **iOS specifics.** Web Push works only for an **installed** PWA on iOS 16.4+. Prompt Driver/Conductor to "Add to Home Screen". Limited storage, aggressive tab eviction — keep the operations bundle lean.
6. **Storage is evictable.** IndexedDB / Cache can be cleared under pressure. Request `navigator.storage.persist()`. Never treat the local queue as durable beyond a shift; sync early and often.
7. **Token storage.** No secure keystore in a browser. Access token lives in a **non-persisted Redux slice** (`session`); the **refresh token is an httpOnly Secure cookie** set by the backend. On load, call `POST /auth/refresh` (cookie) to bootstrap the session.

A dedicated cheap Android device per bus, dash-mounted, is the recommended deployment.

---

## 3. Backend contract this app consumes

### Conventions

- **Auth:** access token in memory (Redux `session` slice) → `Authorization: Bearer`; refresh via httpOnly cookie (`POST /api/v1/auth/refresh`, `credentials: "include"`). Socket.IO handshake passes the access token in `auth`.
- **Error envelope:** `{ error: { code, message, details?, traceId } }` — render `message`, log `code` + `traceId`.
- **Idempotency-Key** header (client-generated UUID) on: trip start, checklist submit, ticket create, `tickets/bulk`, `passenger-count/bulk`, payment create, `tracking/location/bulk`.
- **Time:** use `serverTime` from `GET /config` (and `GET /time`) for scheduling math; device clock only for local ordering of queued items.
- **Config:** call `GET /api/v1/config` on every load; store `gpsSendIntervalSeconds`, `geofenceRadiusMeters`, `delayThresholds`, `mapTileSource`, `supportedLanguages`, `vapidPublicKey`, `minSupportedAppVersion`, `featureFlags`, `serverTime`. Enforce `minSupportedAppVersion` with a blocking "reload to update" screen. Never hard-code these.

### REST endpoints used by this app

| Purpose | Endpoints |
|---|---|
| Bootstrap | `GET /config`, `GET /time` |
| Auth | `POST /auth/login`, `/auth/otp`, `/auth/refresh`, `/auth/guest`, `/auth/logout`, `/auth/forgot`, `/auth/reset`; `POST/DELETE/GET /auth/devices` (device + web-push subscription) |
| Me (Driver/Conductor) | `GET /me/assignments?date=`, `/me/active-trip`, `/me/performance`; `POST /me/attendance/check-in`\|`check-out`; `POST /me/assignments/request` |
| Trip lifecycle | `POST /trips` (start), `PATCH /trips/:id {action:pause\|resume\|end}`, `POST /trips/:id/checklist`, `GET /trips/:id` |
| Tracking (send) | `POST /tracking/location`, `POST /tracking/location/bulk`, `POST /tracking/heartbeat`, `POST /tracking/sos`, `GET /tracking/trip/:id` |
| Reference sync | `GET /sync/routes\|stops\|fares\|schedules?updatedSince=` (ETag / If-None-Match) |
| Passenger discovery | `GET /journeys`, `GET /routes`, `GET /routes/:id`, `GET /stops`, `GET /stops/:id`, `GET /service-alerts` |
| Favorites & subs | `GET/POST/DELETE /passengers/me/subscriptions`, favorites CRUD |
| Notifications | `GET /me/notifications`, preferences |
| Ticketing | `POST /fares/calculate`, `POST /tickets`, `POST /tickets/bulk`, `POST /tickets/scan`, `GET /tickets`, passes |
| Payments | `POST /payments`, `POST /payments/qr`, `GET /payments`, refunds |
| Counts / reconciliation | `POST /trips/:id/passenger-count`, `POST /trips/:id/passenger-count/bulk`, `POST /trips/:id/reconciliation` |
| Complaints / Lost & Found | `POST/GET /complaints`, `POST/GET /lost-found` |
| Uploads | `POST /uploads/presign` → S3 PUT → submit key |

### Socket.IO

**Rooms:** `vehicle:{id}` · `route:{id}` · `trip:{id}`  (this app never joins `fleet:all`).

**Events consumed:**

| Room / event | Passenger area | Operations area |
|---|---|---|
| `route:{id}` + `vehicle:location` / `vehicle:arriving` / `vehicle:arrived` / `vehicle:left` / `vehicle:delay` / `vehicle:occupancy` | live map + stop ETA | — |
| `trip:{id}` + `trip:started` / `trip:paused` / `trip:resumed` / `trip:completed` / `trip:cancelled` | tracked bus | driver & conductor active trip |
| `route:deviation` | — | deviation warning banner (driver) |
| `vehicle:delay` | passenger delay pill | driver delay indicator |
| `sos:acknowledged` | — | driver "help acknowledged" state |
| `gps:error` | — | driver GPS-error toast |
| `assignment:changed` | — | refresh assignment card |
| `dispatch:message` | — | dispatcher message toast |
| `trip:force_end` | — | force-end handling |
| `payment:confirmed` | passenger payment result | conductor payment confirmation |
| `service:alert` | banner + Web Push | — |

---

## 4. Folder structure (this repo — `frontend/`)

```
frontend/
  src/
    app/
      (public)/            # /login, /otp, /forgot, /guest, landing
      (passenger)/         # GUEST | PASSENGER  — bottom-nav shell
        map/ search/ planner/ stops/[id]/ routes/[id]/
        favorites/ notifications/ alerts/
        tickets/ tickets/[id]/ passes/ pay/
        complaints/ lost-found/ profile/
      (operations)/        # DRIVER | CONDUCTOR — field-mode shell (wake-lock bar, offline bar)
        driver/  home/ checklist/ trip/ trip/summary/ incident/ sos/ performance/
        conductor/  trip/ issue-ticket/ scan/ count/ reconcile/
        settings/
      layout.tsx  provider.tsx  error.tsx  global-error.tsx  loading.tsx  not-found.tsx  globals.css
      manifest.webmanifest
      ~offline/            # offline fallback page
    sw.ts                  # Serwist service worker
    components/            # cross-feature UI: cards/ layout/ ui/
    config/               # env.config.ts, socket.config.ts
    constants/            # roles, statuses, event names
    lib/                  # error/ hooks/ mapper/  (shared helpers)
    modules/<feature>/    # per-feature slice, see below
      components/         # feature UI (screens, forms, tables, panels)
      constant/          # feature enums, option lists, column defs
      hooks/             # data hooks (list, byId, mutations) wrapping services
      services/          # API calls + feature logic (uses utils/apiClient)
    services/            # app-level orchestration services (optional)
    sockets/             # index.ts + handlers/  (socket.io-client wiring)
    store/               # Redux Toolkit: index.ts, hooks.ts, slices/
    types/               # global ambient types (ApiResponse, Paginated, …)
    utils/               # apiClient.ts, logger.ts, distance.util.ts, …
```

**Per-module convention:** every `modules/<feature>/` has `components/ constant/ hooks/ services/`. Keep API calls in `services/`, React state in `hooks/`, presentation in `components/`, static data in `constant/`.

### Modules for this app

| Module | Present? | Purpose |
|---|---|---|
| `auth` | ✅ | OTP / email-password / guest login, device + push registration, profile, logout |
| `user` | ✅ | Profile, notification preferences, language |
| `route` | ✅ | Route list / details, reference cache |
| `stop` | ✅ | Stop list / details, nearby stops |
| `schedule` | ✅ | Scheduled times for route/stop screens |
| `vehicle` | ✅ | Vehicle info for assignment display |
| `trip` | ✅ | Driver trip state machine, active-trip recovery, summary |
| `tracking` | ✅ | GPS engine, live map data, heartbeat, SOS |
| `notification` | ✅ | Inbox, read/unread, deep links |
| `driver` | ✅ | Assignment card, attendance, checklist, performance self-view |
| **`conductor`** | ➕ create | Join active trip, issue ticket, QR scan, passenger count, reconciliation |
| **`journey`** | ➕ create | From→To search, Journey Planner (`GET /journeys`) |
| **`favorite`** | ➕ create | Favorite stops/routes + subscriptions (`/passengers/me/subscriptions`) |
| **`ticket`** | ➕ create | Buy ticket, QR ticket render, passes, history |
| **`payment`** | ➕ create | Gateway checkout, `payment:confirmed`, transaction history, refunds |
| **`complaint`** | ➕ create | Create complaint (photo via presign), track status |
| **`lostFound`** | ➕ create | Report lost item, track case |
| **`serviceAlert`** | ➕ create | Read alerts, banners on affected route/stop screens |

### Redux store slices (`src/store/slices/`)

`session` (access token, user, role — not persisted) · `config` (bootstrap values) · `activeTrip` (driver trip state machine) · `offlineQueue` (pending counts/status mirror) · `liveVehicles` (realtime positions/ETA/occupancy) · `ui` (theme, field mode, language — `redux-persist` allowlist).

---

## 5. Detailed responsibilities

### 5.1 App Foundation & Shell

- **Service worker (Serwist):** precache shell; `NetworkFirst` for `GET /config` + reference reads, `StaleWhileRevalidate` for tiles/assets, `NetworkOnly` for mutations, offline fallback route; `push` / `notificationclick` / `sync` handlers; versioned update with an in-app "new version — reload" toast.
- **Manifest & install:** maskable icons, `display: standalone`, shortcuts ("Live map", "My trip"); capture `beforeinstallprompt`; contextual "Add to Home Screen" nudges for Driver/Conductor (required for iOS push) and frequent passengers.
- **Config bootstrap:** load `GET /config` before the authed shell; hydrate the `config` slice; min-version gate.
- **Auth session:** on load `POST /auth/refresh` (cookie) → access token into the `session` slice; silent refresh before expiry; route to `/login` on failure; role-based redirect (`passenger` vs `operations`); per-area route guards.
- **Realtime:** connect after auth; `useRoom(room)` subscribes on mount / unsubscribes on unmount; on reconnect refetch REST snapshot for mounted views then resume patches; events patch the TanStack Query cache or dispatch to `liveVehicles`.
- **Offline layer:** Dexie stores `gps_queue`, `event_queue`, `ticket_queue`, `count_queue`, `ref_routes`, `ref_stops`, `ref_fares`, `ref_schedules`, `snapshots`. One **sync engine**: FIFO drain with backoff, attaches `Idempotency-Key`, applies per-item server results, surfaces conflicts; triggered on `online`, focus, an interval while foreground, and Background Sync. `offlineQueue` slice mirrors counts/status for the UI.
- **Network & storage UX:** global offline banner + pending-sync count; `navigator.storage.persist()`; low-quota warning.
- **Push:** request permission after a meaningful action (never on load); subscribe with `config.vapidPublicKey`; send `PushSubscription` via `POST /auth/devices`; SW renders notifications; `notificationclick` deep-links; respect quiet hours.
- **i18n / theme:** catalogues + language switch; light/dark; high-contrast large-tap **field mode** for Operations.
- **Errors / telemetry:** route-level error boundaries, typed error toasts, skeleton/empty/offline states, "report a problem" attaching the last `traceId`; Sentry; no PII/tokens in logs.

### 5.2 Authentication & Guest (`modules/auth`)

- Contextual permission priming (location, notifications).
- **OTP** login (paste/auto-fill, resend cooldown, lockout messaging); email/password fallback; forgot / reset.
- **Guest mode:** `POST /auth/guest` → read-only passenger token; guest can search, plan journeys, view live tracking, join read-only rooms; favouriting / complaints / tickets trigger a "create an account" flow.
- **Device registration** on login (`POST /auth/devices` with `userAgent`, later the `PushSubscription`); "device not authorized" screen for Driver/Conductor second-device rejection with a "request access" action.
- Role picker for staff holding multiple roles; area redirect.
- Profile; notification preferences (quiet hours, digest); language; logout (unsubscribes push, clears `session`); device list with revoke.

### 5.3 Passenger Area

- **Live Transport Map** (`modules/tracking` + `route`): vehicles for viewport/selected route via `route:` room `vehicle:location`; smooth interpolation + heading; status styling (moving / stopped / delayed / offline / maintenance); route polylines; vehicle number; "updated Ns ago"; occupancy pill from `vehicle:occupancy`; rAF-throttled renders; marker clustering/canvas.
- **Search (From → To)** (`modules/journey`) → `GET /journeys`: routes, transfers, ETA, distance, fare, walking distance to first stop, next bus.
- **Journey Planner** (`modules/journey`): ranked options; per-leg walk/ride, transfer points, per-leg + total fare, total duration, live next-departure per leg.
- **Stop details** (`modules/stop`): name, map, routes serving it, upcoming buses with **ETA + scheduled time + delay**, platform/stand, nearby stops; subscribe to relevant rooms while open.
- **Route details** (`modules/route`): ordered stop list, live buses, next buses, schedule, fare, service status.
- **ETA display:** minutes + distance per tracked bus; backend values only.
- **Favorites & subscriptions** (`modules/favorite`): favorite stops/routes; `POST /passengers/me/subscriptions` for delay/deviation/cancellation/service-alert pushes.
- **Notifications inbox** (`modules/notification`): list, read/unread, deep links; preferences.
- **Service alerts** (`modules/serviceAlert`): banner on affected route/stop screens + Web Push; `GET /service-alerts` + `service:alert`.
- **Complaints** (`modules/complaint`): create (category, text, rating, photo via `POST /uploads/presign` → S3 PUT); track status/history.
- **Lost & Found** (`modules/lostFound`): report lost item (description, vehicle/route, date/time, photo); track case.
- **Tickets & passes** (`modules/ticket` + `payment`): buy ticket (route, boarding + destination stop, category/concession) → fare from `POST /fares/calculate` (display only) → pay → QR ticket rendered client-side; history; passes; show QR for validation; cache active tickets/passes in IndexedDB for offline render.
- **Payments** (`modules/payment`): UPI / card / net banking / wallet via the gateway's web checkout; webhook-driven status → reflect `payment:confirmed`; transaction history; refund status.
- **Offline behaviour:** last-known map snapshot, cached routes/stops/schedules, cached tickets/passes; complaint / lost-found writes queue and sync.

### 5.4 Driver Area (`modules/driver`, `trip`, `tracking`)

- **Home / assignment card:** `GET /me/assignments?date=today` — vehicle, route (geometry + ordered stops + offsets + scheduled times), shift window, trip list; empty state + `POST /me/assignments/request`; live `assignment:changed`.
- **Attendance:** check-in / check-out tied to the shift.
- **Pre-trip checklist:** form → `POST /trips/:id/checklist`; `config.checklistBlocksTripStart` gates start.
- **Trip state machine (UI):** `IDLE → ON_TRIP → PAUSED(ON_BREAK) → COMPLETED`; `POST /trips` (start) and `PATCH /trips/:id {action}` with `Idempotency-Key`; end confirmation guard; state in the `activeTrip` slice.
- **Active-trip recovery:** on load `GET /me/active-trip` → restore + offer resume.
- **Active-trip map:** own marker snapped to route line, polyline, stop pins; next-stop banner (name + distance + **backend ETA**); collapsible upcoming stops; status pill; geofence "arriving"; **route-deviation warning banner** (`route:deviation`); delay indicator (`vehicle:delay`); recenter/follow.
- **GPS engine (foreground, per §2):** Wake Lock on start + re-acquire on `visibilitychange`; `watchPosition` `enableHighAccuracy`; emit at `config.gpsSendIntervalSeconds` (adaptive 5–15s; reduced while `PAUSED`); package `{tripId, vehicleId, lat, lng, speed, heading, accuracy, timestamp}`; drop low-accuracy fixes; `POST /tracking/heartbeat` while foregrounded but stationary; on hidden / wake-lock loss show "Tracking paused", stop the watch, optionally auto-pause, resume + flush + gap marker on return.
- **Offline queue:** buffer fixes + lifecycle events in Dexie; flush oldest-first via `POST /tracking/location/bulk` (`Idempotency-Key`) on reconnect/focus/Background Sync; buffer cap; live position jumps to now after flush; manual "sync now".
- **Reference cache:** on login cache routes/stops/schedules/fares via `GET /sync/*` (ETag); cache tiles for the assigned route corridor.
- **Navigation:** next-stop guidance now; client-side turn-by-turn between stops via the map SDK — Phase 3.
- **SOS:** one tap from any ops screen → `POST /tracking/sos`; "help notified" state; render `sos:acknowledged`; emergency-contacts view.
- **Report incident:** breakdown / accident / road blocked / other + note + optional photo; breakdown offers auto-end.
- **Trip summary:** display backend stats (distance, duration, on-time vs scheduled, stops served); driver confirms.
- **Performance self-view:** `GET /me/performance`.
- **Dispatch:** receive `dispatch:message`; handle `trip:force_end`.

### 5.5 Conductor Area (`modules/conductor`, `ticket`, `payment`)

- **Join active trip:** attach to the driver's `trip:` room; read-only map + next stop + ETA.
- **Issue ticket:** boarding stop (default = current), destination stop, passenger count/type, concession → **fare display** from `POST /fares/calculate` → collect cash (mark paid) or **show payment QR** (`POST /payments/qr`, await `payment:confirmed`); ticket list for the trip.
- **QR scan:** `BarcodeDetector` (fallback `@zxing/browser`) → `POST /tickets/scan`; valid/invalid; prevent reuse.
- **Passenger count:** +1 / −1 or absolute at a stop; occupancy pill vs capacity (🟢/🟡/🔴).
- **Offline sync:** queue tickets + counts in Dexie; flush via `POST /tickets/bulk` and `POST /trips/:id/passenger-count/bulk` (per-item `Idempotency-Key`); per-item result handling.
- **End-of-trip reconciliation:** `POST /trips/:id/reconciliation` (tickets issued, cash, digital); show expected vs collected variance; confirm.

---

## 6. State & Data Architecture

- **Server state:** TanStack Query — keys per resource; `staleTime` per volatility; invalidate on mutation; `select` to shape.
- **Client state:** Redux Toolkit — the slices in §4; `createAsyncThunk` only for genuinely client-owned async (bootstrap sequencing); listener middleware for cross-slice effects (trip end → stop GPS engine).
- **Realtime:** Socket.IO events either patch the TanStack Query cache (entity updates) or dispatch to `liveVehicles` (high-frequency positional data).
- **Offline (Dexie):** queue tables carry `idempotencyKey`, `createdAt`, `status`, `lastError`; reference tables carry `version`/`etag`; single sync engine (FIFO + backoff + per-item reconciliation); `navigator.storage.persist()`. `offlineQueue` slice mirrors status for the UI only.
- **Assets & tiles:** Serwist Cache Storage strategies; pre-cache route-corridor tiles for Operations.
- **Redux persistence:** `redux-persist` allowlist = `ui` prefs only; never tokens, never server data.
- **Forms:** react-hook-form + zod aligned with OpenAPI request bodies.
- **Types:** generated from OpenAPI (`openapi-typescript`); no hand-written response types; CI drift gate.

---

## 7. Non-Functional Requirements

Installable (passes Lighthouse PWA checks) · offline-resilient (read everywhere, queued writes in Passenger/Operations) · mobile-first · accessible (large text, screen-reader labels, voice call-outs in Operations) · i18n · light/dark + field mode · Sentry with release health · Lighthouse CI budgets (TTI, bundle size) in CI · CSP + Trusted Types · access token only in memory · no PII/tokens in logs · service-worker update flow with user prompt · rAF-batched map renders · input validation (zod) · route-level error boundaries · loading/empty/error/offline states everywhere · optimistic updates with rollback where safe · feature flags from `config` · `traceId` surfaced in bug reports.

---

## 8. Testing Strategy

- **Unit (Jest + RTL):** components, hooks, **Redux slices + selectors + listener middleware**, the offline sync engine, GPS/wake-lock engine (mocked APIs), fare/ETA formatting, zod schemas, event→cache/slice reducers.
- **Integration (Jest + RTL + MSW):** area flows against the mock server — auth + refresh cookie, start-trip, offline flush, ticketing, journey planner.
- **Contract:** validate responses against generated OpenAPI types; snapshot Socket.IO event payloads; CI drift gate.
- **Realtime:** simulated socket events → assert query cache / slice updates, reconnection resync, room subscribe/unsubscribe.
- **Offline / PWA:** SW registration + update flow; airplane-mode simulation — queue growth, FIFO flush, idempotency, partial-failure, stale-position suppression; wake-lock loss handling.
- **E2E (Playwright):** guest search + passenger tracking; driver trip lifecycle incl. pause/resume + tracking-paused; conductor ticket + QR + reconciliation; PWA install + offline load.
- **Visual:** Storybook + snapshot for the design system.
- **Performance:** map with N vehicles; long stop lists; cold start; JS-thread FPS during an active trip.
- **Accessibility:** axe-core in CI; manual screen-reader pass on the driver flow.

---

## 9. Expected Output (before implementation code)

1. **App Architecture** — route groups, Serwist SW design, Redux store + slices, TanStack Query layer, offline layer, GPS engine, realtime layer.
2. **Module Inventory** — every module with its `services/hooks/constant/components` contents, the endpoints and socket rooms it touches, and its screens.
3. **Screen Inventory** — every route with data sources (REST + socket rooms), states, navigation edges.
4. **API Integration Map** — each endpoint → hook/screen, request/response types, error handling, idempotency, cookie/bearer auth.
5. **Realtime Integration Doc** — connection/auth, room subscribe/unsubscribe per screen, every consumed event → query cache or Redux slice mutation, reconnection & resync.
6. **Offline / SW Design** — Serwist config + caching strategies, Dexie schema, sync-engine algorithm, conflict/partial-failure rules, wake-lock + visibility handling, install prompts, storage persistence.
7. **State Management Plan (Redux Toolkit)** — store config, slice shapes + reducers/selectors, listener middleware effects, TanStack-Query-vs-Redux split, persistence allowlist.
8. **Auth & RBAC (client)** — token lifecycle (memory access + cookie refresh), guest scope, device/push registration, area/role routing, permission-gated UI, min-version gate.
9. **i18n & Accessibility Plan.**
10. **Testing Plan** — Jest + RTL + MSW + Playwright layout, coverage targets, Lighthouse CI budgets.
11. **Deployment** — Docker image (`next start`, standalone), env config, CSP, SW caching/versioning.

---

## 10. Development Roadmap (aligned with backend phases)

**Phase 1 — Foundation:** Next.js app + route groups + Serwist SW + manifest + offline fallback · Redux store skeleton · OpenAPI type generation + MSW mock wiring · REST + Socket.IO client wrappers · design tokens + Storybook · config bootstrap + min-version gate · auth (OTP, email/password, guest, device/push registration) + area routing/guards · CI (lint/typecheck/**Jest**/contract/Lighthouse).

**Phase 2 — Transport Management:** driver assignment card + attendance, pre-trip checklist, **trip state machine** + active-trip recovery, reference-data cache via `/sync/*`, Dexie schema + sync-engine skeleton.

**Phase 3 — Real-Time Engine:** GPS engine (watchPosition + wake lock + visibility + heartbeat), offline GPS queue + bulk flush + Background Sync, driver active-trip map (next stop, ETA, deviation banner, delay, geofence "arriving"), SOS + `sos:acknowledged`, incident report, trip summary; **Passenger:** live map + tracking + stop/route ETA.

**Phase 4 — Passenger Operations:** route/stop search, **Journey Planner**, favorites + subscriptions, notifications inbox + Web Push + quiet hours, service-alert banners, complaints, Lost & Found.

**Phase 5 — Ticketing & Payments:** **Passenger:** ticketing + passes + payments + QR ticket (offline render). **Conductor:** issue-ticket (fare calc display), QR scan, payment QR, passenger count + occupancy, offline ticket/count sync, reconciliation.

**Phase 6 — polish:** driver performance self-view, accessibility passes, i18n completeness.

**Phase 7 — Production:** Playwright E2E + PWA install/offline tests · performance passes · Lighthouse CI budgets green · Docker deploy alongside backend · CSP/Trusted Types · Sentry release health · SW cache-versioning · contract-drift CI gate.

---

## 11. Final Goal

```
Backend (REST + Socket.IO, per OpenAPI contract; MongoDB + Redis)
        ↓
frontend/ (this app — the PWA)
 ├─ Passenger/Guest: live map, ETA, journey planner, favorites + subscriptions,
 │   notifications, tickets, payments, complaints, lost & found
 ├─ Driver: assignment, checklist, trip state machine (incl. PAUSED),
 │   foreground GPS + wake lock + offline queue, deviation/delay banners, SOS, trip summary
 └─ Conductor: ticketing, QR, payment QR, passenger count, offline sync, reconciliation
   • Serwist SW · Dexie offline queue · Web Push · Redux Toolkit + TanStack Query
```

Consume the backend's REST endpoints, Socket.IO events, OpenAPI types, and shared conventions exactly. Develop against the mock server. Design around real browser constraints: foreground-only GPS, Wake Lock, evictable storage, Web Push, in-memory tokens.
