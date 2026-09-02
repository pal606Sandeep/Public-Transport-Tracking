"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useConductorTrip } from "@/modules/conductor/hooks/useConductor";
import { ConductorTripHeader } from "@/modules/conductor/components/ConductorTripHeader";
import { OccupancyCounter } from "@/modules/conductor/components/OccupancyCounter";
import { TicketList } from "@/modules/conductor/components/TicketList";

export default function ConductorHomePage() {
  const { data: trip, isLoading, error } = useConductorTrip();

  return (
    <>
      <AppHeader title="Conductor" />
      <main className="flex flex-col gap-4 p-4">
        {isLoading ? (
          <FullScreenLoader />
        ) : error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : !trip ? (
          <EmptyState
            title="No active trip"
            hint="Once the driver starts the trip you can issue tickets and record occupancy."
          />
        ) : (
          <>
            <ConductorTripHeader trip={trip} />

            {trip.vehicle && (
              <OccupancyCounter vehicleId={trip.vehicle} tripId={trip._id} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/conductor/issue"
                className="rounded-[var(--radius-app)] bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
              >
                Issue ticket
              </Link>
              <Link
                href="/conductor/scan"
                className="rounded-[var(--radius-app)] bg-muted px-4 py-3 text-center text-sm font-medium"
              >
                Scan / validate
              </Link>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tickets this session
                </h2>
                <Link
                  href="/conductor/reconcile"
                  className="text-xs text-primary"
                >
                  Reconcile →
                </Link>
              </div>
              <TicketList />
            </section>
          </>
        )}
      </main>
    </>
  );
}
