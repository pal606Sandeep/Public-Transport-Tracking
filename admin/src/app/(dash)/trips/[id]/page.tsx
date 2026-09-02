"use client";

import { use } from "react";
import {
  PageHeader,
  FullScreenLoader,
  Alert,
  Badge,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useTrip } from "@/modules/trip/hooks/useTrips";
import { TripActionsPanel } from "@/modules/trip/components/TripActionsPanel";
import { TRIP_STATUS_TONE } from "@/modules/trip/constant/tripStatus";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: trip, isLoading, error } = useTrip(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !trip)
    return (
      <>
        <PageHeader title="Trip" backHref="/trips" />
        <Alert tone="error">{errorMessage(error) || "Trip not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title="Trip"
        description={trip._id}
        backHref="/trips"
        action={
          <Badge tone={TRIP_STATUS_TONE[trip.status]}>{trip.status}</Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader title="Summary" />
          <CardBody>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Scheduled start</dt>
              <dd>{fmt(trip.scheduledStartAt)}</dd>
              <dt className="text-muted-foreground">Scheduled end</dt>
              <dd>{fmt(trip.scheduledEndAt)}</dd>
              <dt className="text-muted-foreground">Started</dt>
              <dd>{fmt(trip.startTime)}</dd>
              <dt className="text-muted-foreground">Ended</dt>
              <dd>{fmt(trip.endTime)}</dd>
              <dt className="text-muted-foreground">Route</dt>
              <dd className="font-mono text-xs">{trip.route}</dd>
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="font-mono text-xs">{trip.schedule ?? "—"}</dd>
              {trip.cancelReason && (
                <>
                  <dt className="text-muted-foreground">Cancel reason</dt>
                  <dd>{trip.cancelReason}</dd>
                </>
              )}
            </dl>
          </CardBody>
        </Card>

        <TripActionsPanel trip={trip} />
      </div>
    </>
  );
}
