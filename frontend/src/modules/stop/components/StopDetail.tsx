"use client";

import { FullScreenLoader, Alert, Card } from "@/components/ui";
import { FavouriteToggle } from "@/modules/passenger/components/FavouriteToggle";
import { ServiceAlertBanner } from "@/modules/serviceAlert/components/ServiceAlertBanner";
import { errorMessage } from "@/lib/error/apiError";
import { useStop } from "../hooks/useStops";

export function StopDetail({ id }: { id: string }) {
  const { data: stop, isLoading, error } = useStop(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !stop)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error) || "Stop not found"}</Alert>
      </div>
    );

  const [lng, lat] = stop.location?.coordinates ?? [];
  const facts = [
    stop.shelter ? `Shelter · ${stop.shelter}` : null,
    stop.accessibility ? "Step-free access" : null,
    ...(stop.nearbyLandmarks ?? []).map((l) => `Near ${l}`),
    ...(stop.facilities ?? []),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle
                cx="12"
                cy="10"
                r="2.4"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold tracking-[-0.02em]">
              {stop.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {[stop.code, stop.address].filter(Boolean).join(" · ") ||
                (lat != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "")}
            </p>
            {!stop.isActive && (
              <p className="mt-1 text-[13px] font-medium text-destructive">
                Currently closed
              </p>
            )}
          </div>
          <FavouriteToggle type="stop" targetId={stop._id} />
        </div>
      </Card>

      <ServiceAlertBanner stopId={stop._id} />

      <section>
        <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming buses
        </h3>
        <Card className="p-4">
          <p className="text-[13.5px] text-muted-foreground">
            Live arrivals for this stop show here once buses on its routes are
            reporting.
          </p>
        </Card>
      </section>

      {facts.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            About this stop
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {facts.map((f, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
