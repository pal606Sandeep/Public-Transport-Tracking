# Transport Admin Dashboard

Pure web admin dashboard for the Real-Time Public Transport Tracking System.
Same stack and module conventions as `../frontend`, but **online-only** (no service
worker, no offline queue, not installable). Runs on port **3001**.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3001

Set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` to point at the backend.

## Structure

- `src/app` — App Router pages, root layout, global styles
- `src/config` — env + socket configuration
- `src/constants` — shared enums (roles, statuses)
- `src/modules/<feature>` — `<feature>.{api,service,routes,hooks,types}.ts`
- `src/sockets` — socket.io client handlers (live fleet, dispatch alerts)
- `src/types` — global ambient types
- `src/utils` — api client, logger, helpers
