"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/error/apiError";
import { sendSos } from "../services/tracking.service";

export function SosButton({
  vehicleId,
  tripId,
  driverId,
}: {
  vehicleId: string;
  tripId: string;
  driverId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [err, setErr] = useState<string | null>(null);

  const fire = async () => {
    setState("sending");
    setErr(null);
    const send = (lat: number, lng: number) =>
      sendSos({ vehicleId, tripId, driverId, latitude: lat, longitude: lng })
        .then(() => setState("sent"))
        .catch((e) => {
          setErr(errorMessage(e));
          setState("error");
        });

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => void send(p.coords.latitude, p.coords.longitude),
        () => void send(0, 0),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      void send(0, 0);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState("idle");
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-20 h-14 w-14 rounded-full bg-destructive text-sm font-bold text-destructive-foreground shadow-lg"
        aria-label="Emergency SOS"
      >
        SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-app)] bg-card p-4">
            {state === "sent" ? (
              <>
                <p className="text-sm font-semibold text-[var(--success)]">
                  Help notified
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dispatch has your location, vehicle and trip. Stay safe.
                </p>
                <button
                  className="mt-4 w-full rounded-full bg-muted py-2 text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Send emergency SOS?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Alerts dispatch immediately with your live location.
                </p>
                {err && (
                  <p className="mt-2 text-xs text-destructive">{err}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    className="flex-1 rounded-full bg-muted py-2.5 text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
                    disabled={state === "sending"}
                    onClick={fire}
                  >
                    {state === "sending" ? "Sending…" : "Send SOS"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
