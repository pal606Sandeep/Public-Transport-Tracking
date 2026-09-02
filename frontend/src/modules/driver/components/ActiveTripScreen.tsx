"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FullScreenLoader, Alert, Button } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useActiveTrip,
  useTripPhase,
  useStartTrip,
} from "../hooks/useActiveTrip";
import { useGpsEngine } from "../hooks/useGpsEngine";
import { ChecklistForm } from "./ChecklistForm";
import { NextStopPanel } from "./NextStopPanel";
import { TripControls } from "./TripControls";
import { TrackingStatusBar } from "./TrackingStatusBar";
import { SosButton } from "./SosButton";
import { TripSummaryCard } from "./TripSummaryCard";
import { LiveMap } from "@/components/map/LiveMap";
import { useLiveTrip } from "@/modules/tracking/hooks/useLiveVehicles";

export function ActiveTripScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const wantedTripId = params.get("tripId");

  const { data: trip, isLoading, error } = useActiveTrip();
  const phase = useTripPhase();
  const start = useStartTrip();
  const [checklistDone, setChecklistDone] = useState(false);

  const gps = useGpsEngine({
    enabled: Boolean(trip) && (trip?.status === "ACTIVE"),
    vehicleId: trip?.vehicle ?? null,
    tripId: trip?._id ?? null,
    driverId: trip?.driver ?? null,
  });

  const liveTrip = useLiveTrip(trip?._id ?? null, trip?.vehicle ?? null);

  const lastTripBrief = useMemo(
    () =>
      trip
        ? {
            _id: trip._id,
            status: trip.status,
            route:
              typeof trip.route === "string"
                ? trip.route
                : trip.route?._id ?? "",
            vehicle: trip.vehicle,
            driver: trip.driver,
            conductor: trip.conductor,
            summary: null,
          }
        : null,
    [trip]
  );

  if (isLoading) return <FullScreenLoader />;

  // ── trip ended → summary ────────────────────────────────────────────
  if (phase.phase === "summary") {
    return <TripSummaryCard trip={lastTripBrief} />;
  }

  // ── no active trip: pre-trip flow for the selected trip ─────────────
  if (!trip) {
    if (!wantedTripId) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active trip. Pick one from your assignment.
          </p>
          <Button variant="secondary" onClick={() => router.replace("/driver")}>
            Back to home
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col">
        {error && (
          <div className="p-4">
            <Alert tone="error">{errorMessage(error)}</Alert>
          </div>
        )}
        {!checklistDone ? (
          <ChecklistForm
            tripId={wantedTripId}
            onDone={() => setChecklistDone(true)}
          />
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {start.isError && (
              <Alert tone="error">{errorMessage(start.error)}</Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Checklist saved. Ready to start.
            </p>
            <Button
              fullWidth
              loading={start.isPending}
              onClick={() => start.mutate(wantedTripId)}
            >
              Start trip
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── active / paused trip ──────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col">
      <TrackingStatusBar
        supported={gps.supported}
        active={gps.active}
        trackingPaused={gps.trackingPaused}
        pendingFixes={gps.pendingFixes}
        lastFixAt={gps.lastFixAt}
        error={gps.error}
        onSyncNow={() => void gps.syncNow()}
      />

      {trip.status === "PAUSED" && (
        <div className="bg-muted px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          On break — tracking reduced
        </div>
      )}

      <NextStopPanel trip={trip} />

      <div className="relative min-h-[220px] flex-1">
        <LiveMap
          className="absolute inset-0"
          vehicles={liveTrip.vehicle ? [liveTrip.vehicle] : []}
          routeGeometry={trip.route?.geometry ?? null}
          focusVehicleId={trip.vehicle}
        />
      </div>

      <TripControls tripId={trip._id} status={trip.status} />

      {trip.vehicle && trip.driver && (
        <SosButton
          vehicleId={trip.vehicle}
          tripId={trip._id}
          driverId={trip.driver}
        />
      )}
    </div>
  );
}
