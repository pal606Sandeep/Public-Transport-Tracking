"use client";

import { useState } from "react";
import { PageHeader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes, useRoute } from "@/modules/route/hooks/useRoutes";
import { useLiveRoute } from "@/modules/tracking/hooks/useLiveVehicles";
import { LiveMap } from "@/components/map/LiveMap";
import { NotificationBell } from "@/modules/notification/components/NotificationBell";

export default function MapPage() {
  const routesQ = useRoutes({ limit: 100 });
  const [routeId, setRouteId] = useState("");
  const routeQ = useRoute(routeId);
  const live = useLiveRoute(routeId || null);

  return (
    <>
      <PageHeader title="Live map" action={<NotificationBell />} />

      <div className="border-b p-3">
        <select
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          className="h-11 w-full rounded-[var(--radius-app)] border bg-card px-3 text-sm"
        >
          <option value="">Choose a route…</option>
          {(routesQ.data?.routes ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeNumber} — {r.name ?? "route"}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1">
        {!routeId ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Pick a route to see buses live.
          </div>
        ) : (
          <>
            <LiveMap
              className="absolute inset-0"
              vehicles={live.vehicles}
              routeGeometry={routeQ.data?.geometry ?? null}
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs shadow">
              {live.isLoading
                ? "loading…"
                : live.error
                  ? "tracking unavailable"
                  : `${live.vehicles.length} bus${
                      live.vehicles.length === 1 ? "" : "es"
                    } live`}
            </div>
          </>
        )}
      </div>

      {live.error && (
        <div className="p-3">
          <Alert tone="info">
            No live tracking right now — {errorMessage(live.error)}
          </Alert>
        </div>
      )}
    </>
  );
}
