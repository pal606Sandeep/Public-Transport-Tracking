import type { ActiveTrip } from "../constant/driver.types";

export function NextStopPanel({ trip }: { trip: ActiveTrip }) {
  const stops = trip.route?.orderedStops ?? [];
  const currentId = trip.currentStop?._id ?? null;
  const currentIdx = currentId
    ? stops.findIndex((s) => s.stopId === currentId)
    : -1;
  const upcoming = currentIdx >= 0 ? stops.slice(currentIdx + 1) : stops;
  const next = upcoming[0];

  return (
    <div className="border-b p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Next stop
      </p>
      <p className="mt-1 text-lg font-semibold">
        {next?.name ?? "End of route"}
      </p>
      {next?.scheduledOffsetMinutes != null && (
        <p className="text-xs text-muted-foreground">
          scheduled +{next.scheduledOffsetMinutes} min from route start
        </p>
      )}

      {upcoming.length > 1 && (
        <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
          {upcoming.slice(1, 5).map((s) => (
            <li key={s.stopId} className="truncate">
              {s.name ?? `Stop ${s.sequence}`}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
