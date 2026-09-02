"use client";

import { useRouter } from "next/navigation";
import { Button, Alert, RouteBadge } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useAssignment } from "../hooks/useDriver";

const STARTABLE = new Set(["SCHEDULED", "ASSIGNED"]);

export function AssignmentCard() {
  const router = useRouter();
  const { data, isLoading, error } = useAssignment();

  if (isLoading) {
    return (
      <div className="h-40 animate-pulse rounded-[var(--radius-app)] bg-muted" />
    );
  }
  if (error) {
    const noProfile = (error as { status?: number }).status === 404;
    return (
      <Alert tone={noProfile ? "info" : "error"}>
        {noProfile
          ? "No driver profile is linked to this account yet. Ask an admin to set you up."
          : errorMessage(error)}
      </Alert>
    );
  }
  if (!data) return null;

  return (
    <section className="rounded-[var(--radius-app)] border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Today · {data.date}
        </h2>
        <span className="text-xs text-muted-foreground">
          {data.shift?.type ?? "shift"}
          {data.shift?.start ? ` ${data.shift.start}–${data.shift.end}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {data.route?.routeNumber && (
          <RouteBadge>{data.route.routeNumber}</RouteBadge>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {data.route?.name || data.route?.routeNumber || "No route assigned"}
          </p>
          <p className="text-xs text-muted-foreground">{data.name}</p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Trips
        </h3>
        {data.scheduledTrips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No trips scheduled for you today.
          </p>
        ) : (
          <ul className="divide-y rounded-[var(--radius-app)] border">
            {data.scheduledTrips.map((t) => (
              <li
                key={t._id}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <div className="min-w-0 text-sm">
                  <div className="font-medium">
                    {t.scheduledStartAt
                      ? new Date(t.scheduledStartAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.vehicle ?? "vehicle TBD"} · {t.status}
                  </div>
                </div>
                {STARTABLE.has(t.status) ? (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/driver/trip?tripId=${t._id}`)}
                  >
                    Open
                  </Button>
                ) : t.status === "ACTIVE" || t.status === "PAUSED" ? (
                  <Button
                    size="sm"
                    onClick={() => router.push("/driver/trip")}
                  >
                    Resume
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{t.status}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/driver/request")}
          >
            Request a manual assignment
          </Button>
        </div>
      </div>
    </section>
  );
}
