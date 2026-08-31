"use client";

import { FullScreenLoader, Alert } from "@/components/ui";
import { FavouriteToggle } from "@/modules/passenger/components/FavouriteToggle";
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
    stop.shelter ? `Shelter: ${stop.shelter}` : null,
    stop.accessibility ? "Step-free access" : null,
    ...(stop.nearbyLandmarks ?? []).map((l) => `Near ${l}`),
    ...(stop.facilities ?? []),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{stop.name}</h2>
          <p className="text-xs text-muted-foreground">
            {[stop.code, stop.address].filter(Boolean).join(" · ")}
          </p>
        </div>
        <FavouriteToggle type="stop" targetId={stop._id} />
      </div>

      <div className="space-y-4 p-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming buses
          </h3>
          <p className="text-sm text-muted-foreground">
            Live arrivals appear here once tracking is wired (Module 6).
          </p>
        </section>

        {facts.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              About this stop
            </h3>
            <ul className="space-y-1 text-sm">
              {facts.map((f, i) => (
                <li key={i} className="text-foreground">
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {lat != null && lng != null && (
          <p className="text-xs text-muted-foreground">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
