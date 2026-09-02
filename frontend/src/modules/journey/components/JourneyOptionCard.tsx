import { RouteBadge, Card } from "@/components/ui";
import type { JourneyOption } from "../constant/journey.types";

const fmtM = (m?: number) =>
  m == null
    ? null
    : m >= 1000
      ? `${(m / 1000).toFixed(1)} km`
      : `${Math.round(m)} m`;

export function JourneyOptionCard({ option }: { option: JourneyOption }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="tnum text-[20px] font-bold tracking-[-0.02em]">
            {option.totalDurationMinutes}
            <span className="ml-1 text-[13px] font-medium text-muted-foreground">
              min
            </span>
          </span>
          <span className="text-[12.5px] font-medium text-muted-foreground">
            {option.transfers === 0
              ? "Direct"
              : `${option.transfers} transfer${option.transfers > 1 ? "s" : ""}`}
          </span>
        </div>
        <span className="tnum text-[16px] font-bold">₹{option.totalFare}</span>
      </div>

      <ol className="mt-3 space-y-2.5">
        {option.legs.map((leg, i) => (
          <li key={i} className="flex items-start gap-3">
            {leg.mode === "ride" ? (
              <RouteBadge>{leg.routeNumber ?? "?"}</RouteBadge>
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-app-sm)] bg-muted text-muted-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M13 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM9 21l2-5 2 1v4M9 21H7m2 0h2m1-9l-2-1-1-4-3 2M14 11l1 3 3 1"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              {leg.mode === "ride" ? (
                <>
                  <span className="block truncate text-[14px] font-medium">
                    {leg.fromStopName ?? "Board"} → {leg.toStopName ?? "Alight"}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    {leg.durationMinutes} min · ₹{leg.fare}
                    {leg.liveEtaSeconds != null ? (
                      <span className="font-semibold text-success">
                        {" "}
                        · next in {Math.round(leg.liveEtaSeconds / 60)} min
                      </span>
                    ) : leg.nextDeparture ? (
                      <>
                        {" "}
                        ·{" "}
                        {new Date(leg.nextDeparture).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    ) : (
                      ""
                    )}
                  </span>
                </>
              ) : (
                <span className="text-[12.5px] text-muted-foreground">
                  Walk{" "}
                  {fmtM(leg.distanceMeters) ?? `${leg.durationMinutes} min`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
