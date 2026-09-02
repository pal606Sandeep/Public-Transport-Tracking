"use client";

import { useState } from "react";
import { Button, Alert, EmptyState } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { StopSearchInput } from "./StopSearchInput";
import { JourneyOptionCard } from "./JourneyOptionCard";
import { usePlanJourney } from "../hooks/useJourney";
import {
  endpointToParam,
  type Endpoint,
} from "../constant/journey.types";

export function JourneyPlanner() {
  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);
  const plan = usePlanJourney();

  const captureLocation = (setter: (e: Endpoint) => void) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setter({
          kind: "coords",
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          label: "My location",
        }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const run = () => {
    if (!from || !to) return;
    plan.mutate({
      from: endpointToParam(from),
      to: endpointToParam(to),
      maxTransfers: 1,
    });
  };

  const result = plan.data;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3">
        <StopSearchInput
          label="From"
          value={from}
          onChange={setFrom}
          onUseLocation={() => captureLocation(setFrom)}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            aria-label="Swap"
            className="rounded-full border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4v13M7 4L3 8M7 4l4 4M17 20V7M17 20l4-4M17 20l-4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <StopSearchInput
          label="To"
          value={to}
          onChange={setTo}
          onUseLocation={() => captureLocation(setTo)}
        />
      </div>

      <Button
        fullWidth
        disabled={!from || !to}
        loading={plan.isPending}
        onClick={run}
      >
        Find routes
      </Button>

      {plan.isError && <Alert tone="error">{errorMessage(plan.error)}</Alert>}

      {result && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {result.query.from.name} → {result.query.to.name}
            {result.walkingDistanceToFirstStopMeters > 0 &&
              ` · ${result.walkingDistanceToFirstStopMeters} m walk to first stop`}
          </p>
          {result.options.length === 0 ? (
            <EmptyState
              title="No routes found"
              hint="Try different stops or nearby points."
            />
          ) : (
            result.options.map((o, i) => (
              <JourneyOptionCard key={i} option={o} />
            ))
          )}
        </section>
      )}
    </div>
  );
}
