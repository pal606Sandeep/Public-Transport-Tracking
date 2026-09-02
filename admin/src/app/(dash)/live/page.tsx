"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  Select,
  Badge,
  Alert,
  Spinner,
  EmptyState,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes, useRoute } from "@/modules/route/hooks/useRoutes";
import { useLiveFleet } from "@/modules/tracking/useLiveFleet";
import { getSocket } from "@/lib/realtime/socket";
import { LiveMap } from "@/components/map/LiveMap";

interface SosAlert {
  id: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  message?: string;
  at: number;
  acknowledged?: boolean;
}

const occTone = (level?: string | null) => {
  switch ((level ?? "").toUpperCase()) {
    case "CROWDED":
    case "HIGH":
      return "danger" as const;
    case "MODERATE":
    case "MEDIUM":
      return "warning" as const;
    default:
      return "info" as const;
  }
};

const ago = (ms: number) => {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

export default function LiveMapPage() {
  const routesQ = useRoutes({ page: 1, limit: 200, status: "ACTIVE" });
  const [routeId, setRouteId] = useState("");
  const [fleetAll, setFleetAll] = useState(false);

  const routeQ = useRoute(routeId);
  const live = useLiveFleet(routeId || null, fleetAll);

  const [socketUp, setSocketUp] = useState(false);
  const [sos, setSos] = useState<SosAlert[]>([]);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onConn = () => setSocketUp(true);
    const onDisc = () => setSocketUp(false);
    const onSos = (raw: Record<string, unknown>) =>
      setSos((prev) => [
        {
          id: String(raw.id ?? raw._id ?? raw.tripId ?? Math.random()),
          vehicleId: raw.vehicleId as string | undefined,
          driverId: raw.driverId as string | undefined,
          tripId: raw.tripId as string | undefined,
          message: raw.message as string | undefined,
          at: Date.now(),
        },
        ...prev,
      ].slice(0, 20));
    const onAck = (raw: Record<string, unknown>) =>
      setSos((prev) =>
        prev.map((s) =>
          s.id === String(raw.id ?? raw.tripId ?? "")
            ? { ...s, acknowledged: true }
            : s
        )
      );

    Promise.resolve().then(() => setSocketUp(socket.connected));
    socket.on("connect", onConn);
    socket.on("disconnect", onDisc);
    socket.on("driver:sos", onSos);
    socket.on("sos:acknowledged", onAck);
    return () => {
      socket.off("connect", onConn);
      socket.off("disconnect", onDisc);
      socket.off("driver:sos", onSos);
      socket.off("sos:acknowledged", onAck);
    };
  }, []);

  const acknowledge = (s: SosAlert) => {
    getSocket().emit("sos:acknowledge", { id: s.id, tripId: s.tripId });
    setSos((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, acknowledged: true } : x))
    );
  };

  const vehicles = live.vehicles;
  const geometry = useMemo(
    () => routeQ.data?.geometry ?? null,
    [routeQ.data?.geometry]
  );

  return (
    <>
      <PageHeader
        title="Live map"
        description="Real-time fleet positions from the tracking engine."
        action={
          <Badge tone={socketUp ? "success" : "neutral"}>
            {socketUp ? "socket connected" : "socket offline"}
          </Badge>
        }
      />

      {!socketUp && (
        <Alert tone="warning" className="mb-4">
          Realtime socket not connected. REST snapshots still load for a chosen
          route; live movement and SOS need <code>backend/src/config/socket.ts</code>{" "}
          to allow the <code>:3001</code> origin.
        </Alert>
      )}

      {sos.filter((s) => !s.acknowledged).length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {sos
            .filter((s) => !s.acknowledged)
            .map((s) => (
              <Alert key={s.id} tone="error">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    <strong>SOS</strong>
                    {s.vehicleId ? ` · vehicle ${s.vehicleId}` : ""}
                    {s.message ? ` — ${s.message}` : ""}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-current px-2 py-1 text-xs"
                    onClick={() => acknowledge(s)}
                  >
                    Acknowledge
                  </button>
                </div>
              </Alert>
            ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={fleetAll ? "__fleet__" : routeId}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__fleet__") {
              setFleetAll(true);
              setRouteId("");
            } else {
              setFleetAll(false);
              setRouteId(v);
            }
          }}
          className="max-w-sm"
        >
          <option value="">Choose a route…</option>
          <option value="__fleet__">Whole fleet (live only)</option>
          {(routesQ.data?.routes ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeNumber}
              {r.name ? ` — ${r.name}` : ""}
            </option>
          ))}
        </Select>
        {live.isLoading && <Spinner />}
        <span className="text-sm text-muted-foreground">
          {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} live
        </span>
      </div>

      {live.error && (
        <Alert tone="error" className="mb-4">
          {errorMessage(live.error)}
        </Alert>
      )}

      {!routeId && !fleetAll ? (
        <EmptyState
          title="Pick a route or the whole fleet"
          hint="A route also draws its geometry and loads a REST snapshot."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="overflow-hidden rounded-[var(--radius-app)] border">
            <LiveMap
              vehicles={vehicles}
              routeGeometry={geometry}
              focusVehicleId={focus}
              className="h-[70vh] w-full"
            />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto rounded-[var(--radius-app)] border p-2">
            {vehicles.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No vehicles reporting.
              </p>
            ) : (
              vehicles.map((v) => (
                <button
                  key={v.vehicleId}
                  type="button"
                  onClick={() => setFocus(v.vehicleId)}
                  className={
                    "rounded-[var(--radius-app)] border p-2.5 text-left text-sm hover:bg-muted " +
                    (focus === v.vehicleId ? "border-primary" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{v.vehicleId}</span>
                    {v.occupancyLevel && (
                      <Badge tone={occTone(v.occupancyLevel)}>
                        {v.occupancyLevel}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.status ?? "—"}
                    {v.speed != null ? ` · ${Math.round(v.speed)} km/h` : ""}
                    {v.delayStatus ? ` · ${v.delayStatus}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ago(v.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
