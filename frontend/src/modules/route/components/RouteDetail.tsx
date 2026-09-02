"use client";

import Link from "next/link";
import { FullScreenLoader, Alert, RouteBadge } from "@/components/ui";
import { FavouriteToggle } from "@/modules/passenger/components/FavouriteToggle";
import { ServiceAlertBanner } from "@/modules/serviceAlert/components/ServiceAlertBanner";
import { errorMessage } from "@/lib/error/apiError";
import { useRoute } from "../hooks/useRoutes";

export function RouteDetail({ id }: { id: string }) {
  const { data: route, isLoading, error } = useRoute(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !route)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error) || "Route not found"}</Alert>
      </div>
    );

  const stops = [...(route.orderedStops ?? [])].sort(
    (a, b) => a.sequence - b.sequence
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 border-b p-4">
        <RouteBadge>{route.routeNumber}</RouteBadge>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {route.name || `Route ${route.routeNumber}`}
          </h2>
          <p className="text-xs text-muted-foreground">
            {[
              route.direction,
              route.distanceKm != null ? `${route.distanceKm} km` : null,
              route.estimatedDurationMin != null
                ? `~${route.estimatedDurationMin} min`
                : null,
              route.status === "INACTIVE" ? "Service suspended" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <FavouriteToggle type="route" targetId={route._id} />
      </div>

      <ServiceAlertBanner routeId={route._id} className="p-4 pb-0" />

      <div className="px-4 pt-4">
        <Link
          href={`/tickets/buy?route=${route._id}`}
          className="flex h-11 w-full items-center justify-center rounded-[var(--radius-app)] bg-primary text-sm font-medium text-primary-foreground"
        >
          Buy a ticket for this route
        </Link>
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stops
        </h3>
        {stops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stops configured.</p>
        ) : (
          <ol className="relative ml-2 border-l">
            {stops.map((s, i) => {
              const label =
                s.stop?.name ?? `Stop ${i + 1}`;
              const href = s.stop?._id ? `/stops/${s.stop._id}` : `/stops/${s.stopId}`;
              return (
                <li key={`${s.stopId}-${s.sequence}`} className="mb-3 ml-4">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <Link href={href} className="text-sm hover:underline">
                    {label}
                  </Link>
                  {s.scheduledOffsetMinutes > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      +{s.scheduledOffsetMinutes} min
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
