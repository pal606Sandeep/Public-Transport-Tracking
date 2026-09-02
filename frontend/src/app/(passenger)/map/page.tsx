"use client";

import { useState } from "react";
import { Sheet, FloatingPanel } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes, useRoute } from "@/modules/route/hooks/useRoutes";
import { useLiveRoute } from "@/modules/tracking/hooks/useLiveVehicles";
import { LiveMap } from "@/components/map/LiveMap";
import { NotificationBell } from "@/modules/notification/components/NotificationBell";

const occDot = (level?: string | null) => {
  switch ((level ?? "").toUpperCase()) {
    case "CROWDED":
    case "HIGH":
      return "bg-destructive";
    case "MODERATE":
    case "MEDIUM":
      return "bg-warning";
    default:
      return "bg-success";
  }
};

export default function MapPage() {
  const routesQ = useRoutes({ limit: 100 });
  const [routeId, setRouteId] = useState("");
  const routeQ = useRoute(routeId);
  const live = useLiveRoute(routeId || null);

  const route = routeQ.data;
  const vehicles = live.vehicles;

  return (
    <div
      className="fixed inset-x-0 top-0 z-0 mx-auto max-w-md overflow-hidden"
      style={{ bottom: "calc(4.25rem + var(--safe-b))" }}
    >
      {/* full-bleed map */}
      <LiveMap
        className="h-full w-full"
        vehicles={vehicles}
        routeGeometry={route?.geometry ?? null}
      />

      {/* floating top bar */}
      <div
        className="absolute inset-x-3 top-0 z-10 flex items-center gap-2"
        style={{ paddingTop: "calc(0.75rem + var(--safe-t))" }}
      >
        <FloatingPanel className="flex flex-1 items-center pr-2">
          <div className="relative flex-1">
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="h-12 w-full appearance-none rounded-[var(--radius-app)] bg-transparent pl-4 pr-9 text-[15px] font-medium text-foreground outline-none"
            >
              <option value="">Choose a route to track…</option>
              {(routesQ.data?.routes ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeNumber} — {r.name ?? "route"}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </FloatingPanel>
        <FloatingPanel className="grid h-12 w-12 place-items-center">
          <NotificationBell />
        </FloatingPanel>
      </div>

      {/* bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <Sheet className="px-4 pt-1">
          {!routeId ? (
            <div className="py-4">
              <p className="text-[15px] font-semibold">Track a bus live</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Choose a route above to see buses moving in real time.
              </p>
            </div>
          ) : (
            <div className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {route?.routeNumber
                      ? `Route ${route.routeNumber}`
                      : "Route"}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {route?.name ?? "Live vehicles"}
                  </p>
                </div>
                <span className="tnum shrink-0 rounded-full bg-muted px-3 py-1 text-[12.5px] font-semibold">
                  {live.isLoading
                    ? "…"
                    : live.error
                      ? "offline"
                      : `${vehicles.length} live`}
                </span>
              </div>

              {live.error ? (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  No live tracking right now — {errorMessage(live.error)}
                </p>
              ) : vehicles.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  No buses reporting on this route yet.
                </p>
              ) : (
                <ul className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
                  {vehicles.map((v) => (
                    <li
                      key={v.vehicleId}
                      className="flex items-center gap-3 rounded-[var(--radius-app-sm)] bg-muted/60 px-3 py-2"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${occDot(
                          v.occupancyLevel
                        )}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                        {v.vehicleId.slice(-6)}
                      </span>
                      <span className="tnum shrink-0 text-[12.5px] text-muted-foreground">
                        {v.speed != null ? `${Math.round(v.speed)} km/h` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Sheet>
      </div>
    </div>
  );
}
