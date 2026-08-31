# Admin Dashboard Frontend — Development Prompt

> **This is one of two split frontend prompts.** The other is `PWA_PROMPT.md`.
> Shared conventions (auth, error envelope, idempotency, config bootstrap, Socket.IO) are repeated in both so each file stands alone.

**Repo folder:** `admin/` &nbsp;·&nbsp; **App:** the Admin Dashboard (pure web, online-only) &nbsp;·&nbsp; **Dev port:** 3001

You are a senior frontend engineer (React / Next.js App Router / Redux Toolkit / TypeScript).

This app is the **staff-facing web dashboard** for a Real-Time Public Transport Tracking System for Small Cities. It is **not a PWA** — no service worker, no manifest, not installable, **no offline support**. Desktop-first, online-only, data-dense.

**Roles:** `SUPER_ADMIN`, `ADMIN`, `TRANSPORT_MANAGER`, `DISPATCHER`, `MAINTENANCE_MANAGER`, `SUPPORT_STAFF`. Menu items and actions are gated by the token's `permissions`; **the backend 403 is the real enforcement**.

The backend is built separately and exposes versioned REST (`/api/v1/*`), a Socket.IO layer, an **OpenAPI 3.1 spec**, and a **mock server**. Consume those contracts exactly. Develop against the mock from day one.

The **PWA is a different app** (`frontend/` folder, `PWA_PROMPT.md`). The two apps never import each other; cross-app code (types, API client, socket client, design tokens) is duplicated per app today, and can later be lifted into a shared package.

---

## 1. Tech Stack

- **Framework:** Next.js (App Router, React 19, TypeScript, `output: "standalone"`). **No Serwist, no manifest, no offline.** Standard authenticated web app; mostly client components.
- **Client state:** **Redux Toolkit** — `configureStore`, feature slices, listener middleware. Server data does **not** live in Redux.
- **Server cache:** **TanStack Query**.
- **Maps:** **MapLibre GL JS** + a draw plugin for the route/stop geometry editors; a playback layer for trip replay.
- **Charts:** Recharts or ECharts.
- **Data grid:** one shared `<DataTable>` — server pagination / filter / sort / column-config / CSV export — reused across every CRUD module.
- **Forms:** `react-hook-form` + **zod** (schemas aligned with OpenAPI request bodies).
- **Realtime:** `socket.io-client`, wrapped in a typed client (auth handshake, declarative room subscribe/unsubscribe, reconnect + resync).
- **i18n:** `next-intl` or `i18next` — bundled catalogues.
- **Testing:** **Jest + React Testing Library** (unit/integration), **Playwright** (E2E), **MSW** (mock backend), axe-core (a11y).
- **Tooling:** ESLint + Prettier, `openapi-typescript` for generated types, Storybook for the design system.

There is **no `sw.ts`, `manifest.webmanifest`, `~offline/`, Dexie, GPS engine, or Wake Lock** in this app. On connection loss, show a blocking "reconnecting" state — do not queue writes.

---

## 2. Backend contract this app consumes

### Conventions

- **Auth:** access token in memory (Redux `session` slice) → `Authorization: Bearer`; refresh via httpOnly cookie (`POST /api/v1/auth/refresh`, `credentials: "include"`). Socket.IO handshake passes the access token in `auth`. **No guest mode.**
- **Error envelope:** `{ error: { code, message, details?, traceId } }` — render `message`, log `code` + `traceId`.
- **Idempotency-Key** header (client-generated UUID) on mutating admin actions that create/charge/allocate (e.g. force-end, service-alert publish, bulk operations).
- **Time:** use `serverTime` from `GET /config` (and `GET /time`) for scheduling math and "today" boundaries.
- **Config:** call `GET /api/v1/config` on load; store thresholds, `mapTileSource`, `supportedLanguages`, `minSupportedAppVersion`, `featureFlags`, `serverTime`. Enforce `minSupportedAppVersion` with a blocking "reload to update" screen. Never hard-code these.
- **RBAC:** build the menu and gate action buttons from the token's `permissions`; still handle backend 403 on every call.

### REST endpoints used by this app

| Purpose | Endpoints |
|---|---|
| Bootstrap | `GET /config`, `GET /time` |
| Auth | `POST /auth/login`, `/auth/otp`, `/auth/refresh`, `/auth/logout`, `/auth/forgot`, `/auth/reset`; `GET/DELETE /auth/devices` (session list) |
| Users & RBAC | `/admin/users` CRUD, activate/deactivate; roles + role-permission mapping; permission preview |
| Fleet CRUD | `/admin/vehicles`, `/admin/drivers`, `/admin/conductors` CRUD + assignments + history + performance |
| Network CRUD | `/admin/routes` (+ geometry, route-stops), `/admin/stops`, `/admin/schedules` (+ trip-instance materialisation) |
| Trips | `GET /trips` (list/filter), create/assign/cancel/mark-missed, `POST /admin/trips/:id/force-end`, `GET /trips/:id/summary` |
| Tracking (read) | `GET /tracking/vehicle/:id`, `GET /tracking/route/:id`, `GET /tracking/trip/:id`, `GET /tracking/trip/:id/history` (replay) |
| Dispatch | manual-assignment requests approve/reject; `POST` dispatch message (also `dispatch:message` socket) |
| Incidents | `/incidents` CRUD + workflow transitions + attachments (`POST /uploads/presign`) |
| Maintenance | `/maintenance` records + vehicle documents + expiry |
| Complaints | `/complaints` queue + assign/escalate/resolve/close + attachments + rating |
| Lost & Found | `/lost-found` registers + matching + status |
| Fares & Tickets | `/fares` CRUD + concessions + passes; `POST /fares/calculate` (preview); `GET /tickets` search/history; ticket cancel |
| Payments | `GET /payments`, refunds, reconciliation views (`/trips/:id/reconciliation` reads) |
| Service Alerts | `/admin/service-alerts` CRUD + publish (affected-subscriber preview) |
| Analytics | `/admin/analytics/*` (passengers/vehicles/drivers/routes/revenue), demand heatmap |
| Reports | `/admin/reports/*` builder + CSV/PDF export |
| Audit Logs | `/audit-logs` search/filter (paginated) + diff |
| System Settings | `GET/PUT /system-settings` |
| Notification Templates | `/notifications/templates` per-channel editor + preview + enable/disable |

### Socket.IO

**Rooms:** `fleet:all` (always) · `route:{id}` · `vehicle:{id}` · `trip:{id}` (as screens open).

**Events consumed:**

| Room / event | Use |
|---|---|
| `fleet:all` + `vehicle:location` / `vehicle:status` / `vehicle:occupancy` | Live Fleet Map, overview mini-map |
| `route:{id}` + `vehicle:location` / `vehicle:arriving` / `vehicle:delay` | route monitoring |
| `trip:{id}` + `trip:started` / `trip:paused` / `trip:resumed` / `trip:completed` / `trip:cancelled` | Trip Monitor |
| `driver:sos` | Dispatcher Console — acknowledge → `sos:acknowledged`, escalate to incident |
| `route:deviation` / `vehicle:delay` / `vehicle:offline` / `gps:error` | Dispatcher Console alert queue (`dispatch` slice) |
| `assignment:changed` | reflect manual-assignment approvals |
| `payment:confirmed` | Payments view live update |
| (emit) `dispatch:message`, `sos:acknowledge` | Dispatcher Console actions |

---

## 3. Folder structure (this repo — `admin/`)

```
admin/
  src/
    app/
      (auth)/             # /login, /otp
      (dashboard)/        # sidebar + topbar shell, RBAC menu
        overview/  fleet/  vehicles/  drivers/  conductors/
        routes/  stops/  schedules/  trips/  dispatch/
        incidents/  maintenance/  complaints/  lost-found/
        fares/  tickets/  payments/  service-alerts/
        analytics/  reports/  replay/  audit/  settings/  users/
        notifications/templates/
      layout.tsx  providers.tsx  error.tsx  global-error.tsx  loading.tsx  not-found.tsx  globals.css
    components/           # cross-feature UI: cards/ layout/ ui/  (+ DataTable, MapCanvas here or in lib)
    config/               # env.config.ts, socket.config.ts
    constants/            # roles, vehicleStatus, tripStatus, incidentStatus, event names
    lib/                  # error/ hooks/ mapper/  (shared helpers, DataTable, chart wrappers)
    modules/<feature>/    # per-feature slice, see below
      components/         # feature UI (tables, forms, detail panels, boards, composers)
      constant/          # feature enums, option lists, column defs, filter configs
      hooks/             # data hooks (list, byId, mutations) wrapping services
      services/          # API calls + feature logic (uses utils/apiClient)
    services/            # app-level orchestration services (optional)
    sockets/             # index.ts + handlers/  (fleetLocation, dispatchAlert)
    store/               # Redux Toolkit: index.ts, hooks.ts, slices/
    types/               # global ambient types (ApiResponse, Paginated, …)
    utils/               # apiClient.ts, logger.ts, distance.util.ts, …
```

**Per-module convention:** every `modules/<feature>/` has `components/ constant/ hooks/ services/`. Keep API calls in `services/`, React state in `hooks/`, presentation in `components/`, static data in `constant/`.

### Modules for this app

| Module | Present? | Purpose |
|---|---|---|
| `auth` | ✅ | Email/password + OTP login, session/device list, forced logout (no guest) |
| `user` | ✅ | User CRUD, activate/deactivate, role assignment, role-permission mapping, permission preview |
| `vehicle` | ✅ | Vehicle CRUD, assignments, status, history |
| `driver` | ✅ | Driver CRUD, profile, attendance, shifts, assignments, performance, license-expiry warnings |
| `conductor` | ✅ | Conductor CRUD, shift, attendance, assignments, ticket-sales/revenue views, reconciliation variance |
| `route` | ✅ | Route CRUD + **map geometry editor** (GeoJSON `LineString`), route-stops reorder + `scheduledOffsetMinutes` |
| `stop` | ✅ | Stop CRUD (map pin), facilities, route assignment, per-route sequence, nearby stops |
| `schedule` | ✅ | Schedule CRUD, assign route/vehicle/driver/conductor, recurrence, trip-instance materialisation, conflict detection |
| `trip` | ✅ | Trip list/filter, create/assign/cancel/mark-missed, live Trip Monitor, force-end, summary + stats |
| `tracking` | ✅ | Live vehicle reads, route/trip live data, **Trip Replay** history playback |
| `dispatch` | ✅ | Dispatcher Console — SOS/deviation/delay/offline queue, manual-assignment approvals, dispatch messaging, broadcasts |
| `incident` | ✅ | Incident board (`OPEN→ACKNOWLEDGED→IN_PROGRESS→RESOLVED→CLOSED`), types, auto-created from events, links, attachments |
| `maintenance` | ✅ | Service schedule & history, repairs/parts, vehicle documents (reg/insurance/fitness/PUC) + expiry dashboards, "service due" |
| `complaint` | ✅ | Queue by category, assign/escalate/resolve/close, history, attachments, rating, SLA/aging |
| `lostFound` | ✅ | Lost/found registers, matching view, staff assignment, status, return confirmation |
| `fare` | ✅ | Fare CRUD (route/distance/stage), categories, discounts, concessions, passes, **fare calculator preview** |
| `ticket` | ✅ | Ticket search & history, cancellation |
| `payment` | ✅ | Transaction list, failed payments, refunds, reconciliation views (tickets vs cash vs digital vs variance), revenue rollups |
| `serviceAlert` | ✅ | Composer: create/edit/publish, targeting routes/stops/geo-area/all, affected-subscriber preview, publish → fan-out |
| `analytics` | ✅ | Passengers / vehicles / drivers / routes / revenue dashboards with filters; **demand heatmap** overlay |
| `report` | ✅ | Report builder across entities, filters, CSV / PDF export |
| `auditLog` | ✅ | Searchable/filterable log (user, action, resource, old/new value, IP/device), diff viewer |
| `systemSettings` | ✅ | Org/city, operating hours, holidays, fare/notification settings, language, ETA/delay thresholds, geofence, GPS interval, offline timeout, checklist gate, map source, min version, feature flags |
| `notification` | ✅ | Notification templates per channel (Web Push / SMS / email / in-app), variables, preview, enable/disable per event |
| `dashboard` | ✅ | Overview: KPI tiles, live mini-map, alert feed, today's on-time chart |

*(All module folders already exist as `components/ constant/ hooks/ services/` placeholders.)*

### Redux store slices (`src/store/slices/`)

`session` (access token, user, role, permissions — not persisted) · `config` (bootstrap values) · `liveFleet` (realtime vehicle positions/status/occupancy for the fleet map) · `dispatch` (SOS / deviation / offline alert queue + acknowledgements) · `ui` (theme, sidebar collapse, language, table density — `redux-persist` allowlist).

---

## 4. Detailed responsibilities (by screen / module)

### 4.1 Shell & Foundation

- **Shell:** responsive sidebar + topbar, **RBAC-driven menu** (items/actions from token `permissions`), command palette, breadcrumb; desktop-first, keyboard-friendly; print styles for reports. On connection loss show a blocking "reconnecting" state — **no offline queue**.
- **Config bootstrap:** `GET /config` on load; hydrate `config` slice; min-version gate.
- **Auth session:** on load `POST /auth/refresh` (cookie) → access token into `session`; silent refresh before expiry; route to `/login` on failure; per-route guards + permission gating.
- **Realtime:** join `fleet:all` + selected `route:` / `vehicle:` / `trip:` rooms; live badges/toasts for SOS / deviation / offline; `dispatch` slice holds the alert queue; on reconnect refetch REST snapshots for mounted views.
- **Data grid:** shared `<DataTable>` (server pagination/filter/sort/column-config/CSV export) reused by every CRUD module.
- **Errors / telemetry:** route-level error boundaries, typed error toasts, empty/loading/(dis)connected states; Sentry; no PII/tokens in logs.

### 4.2 Overview & Live Fleet (`modules/dashboard`, `tracking`)

- **Overview dashboard:** KPI tiles (total / active / offline vehicles, drivers, routes, stops, passengers today, trips today, open incidents); live mini-map; alert feed; today's on-time chart.
- **Live Fleet Map:** all vehicles on `fleet:all`; filter by route/status/driver/depot; vehicle popover (number, route, speed, heading, current/next stop, last GPS, driver, occupancy); click-through to Trip Monitor; deviation/offline/SOS highlighting.

### 4.3 Fleet management (`modules/vehicle`, `driver`, `conductor`)

- **Vehicle Management:** CRUD (registration, model, type, capacity, fuel, GPS device ID, `wheelchairAccessible`, amenities); assignments; status (`ACTIVE`/`INACTIVE`/`MAINTENANCE`/`RETIRED`); history.
- **Driver Management:** CRUD + profile (employee ID, license, expiry, joining date, status); attendance; shifts; assignments; performance; trip history; complaints; license-expiry warnings.
- **Conductor Management:** CRUD + profile; shift; attendance; assignments; ticket sales & revenue views; performance; reconciliation variance history.

### 4.4 Network management (`modules/route`, `stop`, `schedule`)

- **Route Management:** CRUD; **map geometry editor** (draw/edit GeoJSON `LineString`); route-stop add/remove/reorder + sequence + `scheduledOffsetMinutes`; live buses + service status.
- **Stop Management:** CRUD (name, location via map pin, facilities, shelter, accessibility, landmarks); route assignment; per-route sequence; nearby stops.
- **Schedule Management:** CRUD; assign route/vehicle/driver/conductor; operating hours; daily/weekly/weekend/holiday/special; trigger trip-instance materialisation; conflict-detection UI.

### 4.5 Trips & Dispatch (`modules/trip`, `dispatch`, `tracking`)

- **Trip Management & Monitor:** list + filters; statuses incl. `PAUSED`; create/assign/cancel/mark-missed; **live trip monitor** (map + stop progress + ETA + delay from `trip:` room); **force-end**; trip summary + stats.
- **Dispatcher Console:** unified real-time queue — `driver:sos` (acknowledge → `sos:acknowledged`, escalate to incident), `route:deviation`, `vehicle:delay`, `vehicle:offline`, `gps:error`; **manual-assignment requests** approve/reject; **dispatch messaging** to a driver/conductor/route (`dispatch:message`); broadcast prompts.
- **Trip Replay:** select vehicle + date + trip → `GET /tracking/trip/:id/history` → map playback (play/pause/scrub/speed), stop markers, deviation segments highlighted, delay annotations.

### 4.6 Operations records (`modules/incident`, `maintenance`, `complaint`, `lostFound`)

- **Incident Management:** board (`OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`); types; auto-created from real-time events; assign, note, attach (presigned upload), link vehicle/trip/driver; vehicle-status side effects.
- **Maintenance & Documents:** service schedule & history; repairs, parts, tyre/oil, inspections; vehicle documents (registration, insurance, fitness, PUC) with expiry dashboards; "service due" board.
- **Complaints:** queue with categories; assign/update/escalate/resolve/close; history; attachments; feedback & rating; SLA/aging.
- **Lost & Found:** lost/found registers; matching view; staff assignment; status updates; return confirmation; case closure.

### 4.7 Revenue (`modules/fare`, `ticket`, `payment`)

- **Fares & Ticketing Config:** fare CRUD (route-based, distance/stage); categories, discounts, concessions; passes; **fare calculator preview** (`POST /fares/calculate`).
- **Tickets:** ticket search & history; cancellation.
- **Payments & Reconciliation:** transaction list (method, status, amount); failed payments; refunds; reconciliation views (per trip/conductor: tickets vs cash vs digital vs variance); revenue rollups.

### 4.8 Comms & insight (`modules/serviceAlert`, `analytics`, `report`, `notification`)

- **Service Alerts Composer:** create/edit/publish (title, message, severity, type, targeting routes/stops/geo-area/all, `startsAt`/`endsAt`, status); affected-subscriber preview; publish → fan-out.
- **Analytics:** passengers / vehicles / drivers / routes / revenue dashboards with date/route/vehicle/driver filters; **demand heatmap** overlay on the map.
- **Reports & Export:** report builder across all entities; filters; CSV / PDF export.
- **Notification Templates:** per-channel (Web Push / SMS / email / in-app) editor with variables; preview; enable/disable per event type.

### 4.9 Administration (`modules/user`, `auditLog`, `systemSettings`)

- **User & RBAC Management:** user CRUD, activate/deactivate, search/filter; role assignment; role-permission mapping editor; permission preview.
- **Audit Logs:** searchable/filterable (user, action, resource, resourceId, old/new value, timestamp, IP/device); diff viewer.
- **System Settings:** organization, city, operating hours, holidays, fare settings, notification settings, language, ETA/delay thresholds, geofence config, `gpsSendIntervalSeconds`, `offlineVehicleTimeoutSeconds`, `checklistBlocksTripStart`, `mapTileSource`, `minSupportedAppVersion`, feature flags.
- **Monitoring Views (Phase 7, optional):** embeds/links for API, DB, Redis, WebSocket, queue, GPS-ingestion health (Grafana).

---

## 5. State & Data Architecture

- **Server state:** TanStack Query — keys per resource; `staleTime` per volatility; invalidate on mutation; `select` to shape. All list screens go through the `<DataTable>` + a query hook.
- **Client state:** Redux Toolkit — slices in §3; listener middleware for cross-slice effects (e.g. SOS acknowledged → remove from `dispatch` queue + open incident form).
- **Realtime:** Socket.IO events patch the TanStack Query cache (entity updates) or dispatch to `liveFleet` / `dispatch` (high-frequency positional data, alert queue).
- **No Dexie, no Serwist, no persisted server data.** `redux-persist` allowlist = `ui` prefs only. On offline/disconnect, show a blocking reconnect state.
- **Forms:** react-hook-form + zod aligned with OpenAPI request bodies.
- **Types:** generated from OpenAPI (`openapi-typescript`); no hand-written response types; CI drift gate.

---

## 6. Non-Functional Requirements

Desktop-first, responsive down to tablet · **WCAG 2.1 AA** · keyboard-navigable, focus management · i18n · light/dark · Sentry · CSP + Trusted Types · access token only in memory · no PII/tokens in logs · list virtualization for large tables · code-splitting / lazy routes · print styles for reports · **no PWA/offline requirements** · input validation (zod) · route-level error boundaries · loading/empty/error/(dis)connected states everywhere · optimistic updates with rollback where safe · feature flags from `config` · `traceId` surfaced in bug reports · contract-drift CI gate.

---

## 7. Testing Strategy

- **Unit (Jest + RTL):** components, hooks, **Redux slices + selectors + listener middleware**, column/filter configs, zod schemas, event→cache/slice reducers, chart data transforms.
- **Integration (Jest + RTL + MSW):** CRUD flows against the mock server, dispatcher console (SOS ack + escalate), route geometry editor, service-alert publish, report export, RBAC menu gating.
- **Contract:** validate responses against generated OpenAPI types; snapshot Socket.IO event payloads; CI drift gate.
- **Realtime:** simulated socket events → assert query cache / `liveFleet` / `dispatch` updates, reconnection resync, room subscribe/unsubscribe.
- **E2E (Playwright):** login + RBAC redirect; fleet map; route geometry editor; dispatch SOS acknowledge → incident; trip replay; report export; a full CRUD lifecycle on one entity.
- **Visual:** Storybook + snapshot for the design system + `<DataTable>` states.
- **Performance:** large audit/trip tables (virtualization), fleet map with N vehicles, cold start.
- **Accessibility:** axe-core in CI; manual screen-reader pass on the CRUD forms and the dispatcher console.

---

## 8. Expected Output (before implementation code)

1. **App Architecture** — route structure, Redux store + slices, TanStack Query layer, realtime layer, `<DataTable>` contract, chart layer, RBAC menu model.
2. **Module Inventory** — every module with its `services/hooks/constant/components` contents, endpoints and socket rooms it touches, and its screens.
3. **Screen Inventory** — every route with data sources (REST + socket rooms), states, navigation edges, required permissions.
4. **API Integration Map** — each endpoint → hook/screen, request/response types, error handling, idempotency, cookie/bearer auth.
5. **Realtime Integration Doc** — connection/auth, room subscribe/unsubscribe per screen, every consumed event → query cache or Redux slice mutation, reconnection & resync.
6. **State Management Plan (Redux Toolkit)** — store config, slice shapes + reducers/selectors, listener middleware effects, TanStack-Query-vs-Redux split, persistence allowlist.
7. **RBAC model (client)** — permission catalogue, menu gating, action gating, 403 handling, permission-preview screen.
8. **`<DataTable>` spec** — props, server query contract (page/filter/sort), column-config, CSV export.
9. **i18n & Accessibility Plan.**
10. **Testing Plan** — Jest + RTL + MSW + Playwright layout, coverage targets.
11. **Deployment** — Docker image (`next start`, standalone), env config, CSP, running alongside the backend and the PWA.

---

## 9. Development Roadmap (aligned with backend phases)

**Phase 1 — Foundation:** Next.js app scaffold · Redux store skeleton · OpenAPI type generation + MSW mock wiring · REST + Socket.IO client wrappers · design tokens + Storybook · shell + RBAC menu · auth (email/password, OTP) + route guards · config bootstrap + min-version gate · `<DataTable>` skeleton · CI (lint/typecheck/**Jest**/contract).

**Phase 2 — Transport Management:** Vehicle / Driver / Conductor / Route (map geometry editor) / Stop / Schedule / Trip CRUD with `<DataTable>`; Overview KPIs.

**Phase 3 — Real-Time Engine:** Live Fleet Map, Trip Monitor, **Dispatcher Console** (SOS ack / deviation / delay / offline queue, manual-assignment approvals, dispatch messaging), force-end.

**Phase 4 — Ops records:** Complaints, Lost & Found, Service Alerts composer, Notification templates.

**Phase 5 — Revenue:** Fares & Ticketing config + fare calculator preview, Tickets search/history, Payments & Reconciliation views.

**Phase 6 — Admin Operations:** Incident board, Maintenance & Documents, Analytics dashboards + demand heatmap, Reports & Export, Trip Replay, Audit Logs, System Settings, User & RBAC management.

**Phase 7 — Production:** Playwright E2E · performance passes (virtualized tables, fleet map) · accessibility audit · Docker deploy alongside backend + PWA · CSP/Trusted Types · Sentry release health · contract-drift CI gate · (optional) Monitoring embeds.

---

## 10. Final Goal

```
Backend (REST + Socket.IO, per OpenAPI contract; MongoDB + Redis)
        ↓
admin/ (this app — pure web dashboard, online-only)
 ├─ Overview + Live Fleet Map + Dispatcher Console
 ├─ Vehicle / Driver / Conductor / Route / Stop / Schedule / Trip management
 ├─ Incidents · Maintenance · Complaints · Lost & Found · Service Alerts
 ├─ Fares · Tickets · Payments & Reconciliation
 ├─ Analytics · Heatmaps · Reports · Trip Replay
 └─ Audit Logs · System Settings · User & RBAC
   • No service worker · online-only · desktop-first · Redux Toolkit + TanStack Query
```

Consume the backend's REST endpoints, Socket.IO events, OpenAPI types, and shared conventions exactly. Develop against the mock server. This is a straightforward online-only dashboard — no PWA, no offline, no GPS.
