import { RouteBadge } from "@/components/ui";
import type { JourneyOption } from "../constant/journey.types";

const fmtM = (m?: number) =>
  m == null ? null : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

export function JourneyOptionCard({ option }: { option: JourneyOption }) {
  return (
    <div className="rounded-[var(--radius-app)] border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">
            {option.totalDurationMinutes} min
          </span>
          <span className="text-muted-foreground">
            · {option.transfers === 0 ? "direct" : `${option.transfers} transfer`}
          </span>
        </div>
        <span className="text-sm font-semibold">₹{option.totalFare}</span>
      </div>

      <ol className="mt-2 space-y-1.5">
        {option.legs.map((leg, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {leg.mode === "ride" ? (
              <RouteBadge>{leg.routeNumber ?? "?"}</RouteBadge>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-app)] bg-muted text-xs text-muted-foreground">
                walk
              </span>
            )}
            <div className="min-w-0 flex-1">
              {leg.mode === "ride" ? (
                <>
                  <span className="truncate">
                    {leg.fromStopName ?? "board"} → {leg.toStopName ?? "alight"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {leg.durationMinutes} min · ₹{leg.fare}
                    {leg.liveEtaSeconds != null
                      ? ` · next in ${Math.round(leg.liveEtaSeconds / 60)} min`
                      : leg.nextDeparture
                        ? ` · ${new Date(leg.nextDeparture).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Walk {fmtM(leg.distanceMeters) ?? `${leg.durationMinutes} min`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
