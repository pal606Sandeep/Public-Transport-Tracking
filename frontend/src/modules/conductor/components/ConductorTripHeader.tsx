import { RouteBadge } from "@/components/ui";
import type { ActiveTrip } from "@/modules/driver/constant/driver.types";

export function ConductorTripHeader({ trip }: { trip: ActiveTrip }) {
  const stops = trip.route?.orderedStops ?? [];
  const currentIdx = trip.currentStop?._id
    ? stops.findIndex((s) => s.stopId === trip.currentStop?._id)
    : -1;
  const next = (currentIdx >= 0 ? stops.slice(currentIdx + 1) : stops)[0];

  return (
    <section className="rounded-[var(--radius-app)] border p-4">
      <div className="flex items-center gap-3">
        {trip.route?.routeNumber && (
          <RouteBadge>{trip.route.routeNumber}</RouteBadge>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {trip.route?.name || trip.route?.routeNumber || "Active trip"}
          </p>
          <p className="text-xs text-muted-foreground">
            {trip.status.toLowerCase()} ·{" "}
            {next ? `next: ${next.name ?? "—"}` : "end of route"}
          </p>
        </div>
      </div>
    </section>
  );
}
