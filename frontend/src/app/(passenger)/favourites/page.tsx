"use client";

import {
  PageHeader,
  EmptyState,
  Alert,
  Card,
  SkeletonList,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { useFavourites } from "@/modules/passenger/hooks/usePassenger";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useStops } from "@/modules/stop/hooks/useStops";
import { RouteListItem } from "@/modules/route/components/RouteListItem";
import { StopListItem } from "@/modules/stop/components/StopListItem";

const StarIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 17.3l-5.5 3 1-6.1L3 9.9l6.1-.9L12 3.5l2.9 5.5 6.1.9-4.5 4.3 1 6.1z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

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
          icon={StarIcon}
          title="Sign in to save routes & stops"
          hint="Favourites sync to your account so they're on every device."
        />
      </>
    );
  }

  const loading = favourites.isLoading || routesQ.isLoading || stopsQ.isLoading;
  const error = favourites.error || routesQ.error || stopsQ.error;

  if (loading) {
    return (
      <>
        <PageHeader title="Saved" />
        <SkeletonList rows={5} />
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
  const routes = (routesQ.data?.routes ?? []).filter((r) =>
    favRouteIds.has(r._id)
  );
  const stops = (stopsQ.data?.stops ?? []).filter((s) => favStopIds.has(s._id));

  if (routes.length === 0 && stops.length === 0) {
    return (
      <>
        <PageHeader title="Saved" />
        <EmptyState
          icon={StarIcon}
          title="Nothing saved yet"
          hint="Tap the star on any route or stop to keep it here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Saved" />
      <div className="flex flex-col gap-5 p-4">
        {routes.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Routes
            </h2>
            <Card className="divide-y overflow-hidden">
              {routes.map((r) => (
                <RouteListItem key={r._id} route={r} />
              ))}
            </Card>
          </section>
        )}
        {stops.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stops
            </h2>
            <Card className="divide-y overflow-hidden">
              {stops.map((s) => (
                <StopListItem key={s._id} stop={s} />
              ))}
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
