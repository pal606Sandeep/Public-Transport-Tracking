"use client";

import { PageHeader, EmptyState, Alert, FullScreenLoader } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { useFavourites } from "@/modules/passenger/hooks/usePassenger";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useStops } from "@/modules/stop/hooks/useStops";
import { RouteListItem } from "@/modules/route/components/RouteListItem";
import { StopListItem } from "@/modules/stop/components/StopListItem";

export default function FavouritesPage() {
  const { isGuest } = useSession();
  const favourites = useFavourites();
  const routesQ = useRoutes({ limit: 200 });
  const stopsQ = useStops({ limit: 500 });

  if (isGuest) {
    return (
      <>
        <PageHeader title="Saved" />
        <EmptyState
          title="Sign in to save routes & stops"
          hint="Favourites sync to your account so they're on every device."
        />
      </>
    );
  }

  const loading =
    favourites.isLoading || routesQ.isLoading || stopsQ.isLoading;
  const error = favourites.error || routesQ.error || stopsQ.error;

  if (loading) {
    return (
      <>
        <PageHeader title="Saved" />
        <FullScreenLoader />
      </>
    );
  }
  if (error) {
    return (
      <>
        <PageHeader title="Saved" />
        <div className="p-4">
          <Alert tone="error">{errorMessage(error)}</Alert>
        </div>
      </>
    );
  }

  const favRouteIds = new Set(favourites.data?.routes ?? []);
  const favStopIds = new Set(favourites.data?.stops ?? []);
  const routes = (routesQ.data?.routes ?? []).filter((r) => favRouteIds.has(r._id));
  const stops = (stopsQ.data?.stops ?? []).filter((s) => favStopIds.has(s._id));

  if (routes.length === 0 && stops.length === 0) {
    return (
      <>
        <PageHeader title="Saved" />
        <EmptyState
          title="Nothing saved yet"
          hint="Tap the star on any route or stop to keep it here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Saved" />
      {routes.length > 0 && (
        <section>
          <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Routes
          </h2>
          <ul className="divide-y border-y">
            {routes.map((r) => (
              <li key={r._id}>
                <RouteListItem route={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {stops.length > 0 && (
        <section>
          <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stops
          </h2>
          <ul className="divide-y border-y">
            {stops.map((s) => (
              <li key={s._id}>
                <StopListItem stop={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
