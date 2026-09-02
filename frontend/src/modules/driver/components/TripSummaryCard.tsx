"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useEndTripFlow } from "../hooks/useActiveTrip";
import type { TripBrief } from "../constant/driver.types";

const num = (v: unknown) =>
  typeof v === "number" ? v : v == null ? null : Number(v);

export function TripSummaryCard({ trip }: { trip: TripBrief | null }) {
  const router = useRouter();
  const clear = useEndTripFlow();
  const s = (trip?.summary ?? {}) as Record<string, unknown>;

  const rows: [string, string][] = [];
  const dist = num(s.distanceKm ?? s.distanceMeters);
  if (dist != null)
    rows.push([
      "Distance",
      s.distanceKm != null ? `${dist.toFixed(1)} km` : `${(dist / 1000).toFixed(1)} km`,
    ]);
  const dur = num(s.durationMinutes ?? s.durationMin);
  if (dur != null) rows.push(["Duration", `${Math.round(dur)} min`]);
  const stops = num(s.stopsServed);
  if (stops != null) rows.push(["Stops served", String(stops)]);
  const delay = num(s.delayMinutes);
  if (delay != null) rows.push(["Delay vs schedule", `${Math.round(delay)} min`]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Trip completed</h1>
        <p className="text-sm text-muted-foreground">
          {trip?._id ? `Trip ${trip._id.slice(-6)}` : ""}
        </p>
      </div>

      <div className="rounded-[var(--radius-app)] border">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Summary stats will appear once the backend finishes processing the
            trip.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map(([k, v]) => (
              <li
                key={k}
                className="flex justify-between px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        fullWidth
        onClick={() => {
          clear();
          router.replace("/driver");
        }}
      >
        Confirm & back to home
      </Button>
    </div>
  );
}
