"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FullScreenLoader, Alert, EmptyState } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import type { ActiveTrip } from "@/modules/driver/constant/driver.types";
import { useConductorTrip } from "../hooks/useConductor";

export function RequireActiveTrip({
  children,
}: {
  children: (trip: ActiveTrip) => ReactNode;
}) {
  const { data: trip, isLoading, error } = useConductorTrip();

  if (isLoading) return <FullScreenLoader />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );
  if (!trip)
    return (
      <EmptyState
        title="No active trip"
        hint="Join a trip once the driver has started it."
        action={
          <Link href="/conductor" className="text-sm text-primary">
            Back
          </Link>
        }
      />
    );

  return <>{children(trip)}</>;
}
