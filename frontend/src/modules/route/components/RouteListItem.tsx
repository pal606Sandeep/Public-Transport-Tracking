import { ListRow, RouteBadge } from "@/components/ui";
import type { Route } from "../constant/route.types";

export function RouteListItem({ route }: { route: Route }) {
  const stopCount = route.orderedStops?.length ?? route.stops?.length ?? 0;
  const parts = [
    `${stopCount} stop${stopCount === 1 ? "" : "s"}`,
    route.distanceKm != null ? `${route.distanceKm} km` : null,
    route.estimatedDurationMin != null
      ? `${route.estimatedDurationMin} min`
      : null,
  ].filter(Boolean);

  return (
    <ListRow
      href={`/routes/${route._id}`}
      leading={<RouteBadge>{route.routeNumber}</RouteBadge>}
      title={route.name || `Route ${route.routeNumber}`}
      subtitle={parts.join(" · ")}
      trailing={
        route.status === "INACTIVE" ? (
          <span className="text-xs text-muted-foreground">Suspended</span>
        ) : undefined
      }
    />
  );
}
