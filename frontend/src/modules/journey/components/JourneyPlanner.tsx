"use client";

import { useState } from "react";
import { Button, Alert, EmptyState, Card } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { StopSearchInput } from "./StopSearchInput";
import { JourneyOptionCard } from "./JourneyOptionCard";
import { usePlanJourney } from "../hooks/useJourney";
import { endpointToParam, type Endpoint } from "../constant/journey.types";

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
      <Card className="relative overflow-visible">
        <div className="divide-y">
          <StopSearchInput
            label="Pickup stop"
            marker={
              <span className="h-2.5 w-2.5 rounded-full border-[3px] border-foreground" />
            }
            value={from}
            onChange={setFrom}
            onUseLocation={() => captureLocation(setFrom)}
          />
          <StopSearchInput
            label="Destination stop"
            marker={
              <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
            }
            value={to}
            onChange={setTo}
            onUseLocation={() => captureLocation(setTo)}
          />
        </div>
        <button
          type="button"
          onClick={swap}
          aria-label="Swap pickup and destination"
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-elevated text-muted-foreground shadow-[var(--shadow-sm)] transition-transform active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 4v13M7 4L3 8M7 4l4 4M17 20V7M17 20l4-4M17 20l-4-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Card>

      <Button
        size="xl"
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
          <p className="px-1 text-[12.5px] text-muted-foreground">
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
