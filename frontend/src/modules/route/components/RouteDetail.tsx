"use client";

import Link from "next/link";
import {
  FullScreenLoader,
  Alert,
  RouteBadge,
  Card,
  Button,
} from "@/components/ui";
import { FavouriteToggle } from "@/modules/passenger/components/FavouriteToggle";
import { ServiceAlertBanner } from "@/modules/serviceAlert/components/ServiceAlertBanner";
import { errorMessage } from "@/lib/error/apiError";
import { useRoute } from "../hooks/useRoutes";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

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

  const chips = [
    route.direction,
    route.distanceKm != null ? `${route.distanceKm} km` : null,
    route.estimatedDurationMin != null
      ? `~${route.estimatedDurationMin} min`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <RouteBadge>{route.routeNumber}</RouteBadge>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold tracking-[-0.02em]">
              {route.name || `Route ${route.routeNumber}`}
            </h2>
            {route.status === "INACTIVE" && (
              <p className="mt-0.5 text-[13px] font-medium text-destructive">
                Service suspended
              </p>
            )}
          </div>
          <FavouriteToggle type="route" targetId={route._id} />
        </div>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        )}
      </Card>

      <ServiceAlertBanner routeId={route._id} />

      <Link href={`/tickets/buy?route=${route._id}`}>
        <Button variant="accent" size="xl" fullWidth>
          Buy a ticket for this route
        </Button>
      </Link>

      <div>
        <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {stops.length} stop{stops.length === 1 ? "" : "s"}
        </h3>
        {stops.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No stops configured.
          </p>
        ) : (
          <Card className="overflow-hidden">
            <ol className="relative py-1">
              {stops.map((s, i) => {
                const label = s.stop?.name ?? `Stop ${i + 1}`;
                const href = s.stop?._id
                  ? `/stops/${s.stop._id}`
                  : `/stops/${s.stopId}`;
                const last = i === stops.length - 1;
                return (
                  <li key={`${s.stopId}-${s.sequence}`}>
                    <Link
                      href={href}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-muted"
                    >
                      <span className="relative flex w-3 shrink-0 justify-center self-stretch">
                        {!last && (
                          <span className="absolute top-1/2 bottom-0 w-0.5 bg-border" />
                        )}
                        {i !== 0 && (
                          <span className="absolute top-0 bottom-1/2 w-0.5 bg-border" />
                        )}
                        <span className="relative z-10 mt-[13px] h-2.5 w-2.5 rounded-full border-2 border-background bg-accent" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                        {label}
                      </span>
                      {s.scheduledOffsetMinutes > 0 && (
                        <span className="tnum shrink-0 text-[12.5px] text-muted-foreground">
                          +{s.scheduledOffsetMinutes}m
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
