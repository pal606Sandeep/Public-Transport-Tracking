"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { trackingPausedSet, pendingFixesSet } from "@/store/slices/activeTrip.slice";
import { errorMessage } from "@/lib/error/apiError";
import * as tracking from "../services/tracking.service";
import type { GpsFix } from "../constant/driver.types";

interface EngineParams {
  enabled: boolean;
  vehicleId: string | null;
  tripId: string | null;
  driverId: string | null;
  deviceId?: string;
}

const BUFFER_CAP = 500;
const POOR_ACCURACY_M = 100;

/**
 * Foreground GPS engine for the Driver active-trip screen.
 *
 * Browser reality (see PWA constraints): geolocation only runs while the page
 * is visible. We hold a Screen Wake Lock during a trip, watch position, throttle
 * to config.gpsSendIntervalSeconds, POST each fix, buffer on failure, and flush
 * the backlog via /tracking/location/bulk when connectivity returns. On tab
 * hide / wake-lock loss we mark tracking paused and resume on return.
 */
export const useGpsEngine = ({
  enabled,
  vehicleId,
  tripId,
  driverId,
  deviceId,
}: EngineParams) => {
  const dispatch = useAppDispatch();
  const intervalSec =
    useAppSelector((s) => s.config.value?.gpsSendIntervalSeconds) ?? 7;
  const trackingPaused = useAppSelector((s) => s.activeTrip.trackingPaused);
  const pendingFixes = useAppSelector((s) => s.activeTrip.pendingFixes);

  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);

  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const buffer = useRef<GpsFix[]>([]);
  const lastSentAt = useRef(0);
  const lastMovedAt = useRef(0);
  const flushing = useRef(false);

  const ready = enabled && supported && !!vehicleId && !!tripId && !!driverId;

  const setPending = useCallback(
    (n: number) => dispatch(pendingFixesSet(n)),
    [dispatch]
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (buffer.current.length > 0) {
        const batch = buffer.current.slice(0, 100);
        await tracking.sendLocationBulk(batch);
        buffer.current = buffer.current.slice(batch.length);
        setPending(buffer.current.length);
      }
    } catch {
      /* keep the rest buffered; retry on next online / focus */
    } finally {
      flushing.current = false;
    }
  }, [setPending]);

  const push = useCallback(
    async (fix: GpsFix) => {
      setLastFixAt(fix.timestamp);
      try {
        await tracking.sendLocation(fix);
        if (buffer.current.length > 0) void flush();
      } catch (e) {
        buffer.current = [...buffer.current, fix].slice(-BUFFER_CAP);
        setPending(buffer.current.length);
        setError(errorMessage(e));
      }
    },
    [flush, setPending]
  );

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      if (!vehicleId || !tripId || !driverId) return;
      const now = Date.now();
      if (now - lastSentAt.current < intervalSec * 1000) return;
      lastSentAt.current = now;

      const { latitude, longitude, speed, heading, accuracy } = pos.coords;
      if (accuracy != null && accuracy > POOR_ACCURACY_M) return;

      const moving = (speed ?? 0) > 1;
      if (moving) lastMovedAt.current = now;

      setError(null);
      void push({
        vehicleId,
        tripId,
        driverId,
        latitude,
        longitude,
        speed: Math.max(0, speed ?? 0),
        heading: heading != null && !Number.isNaN(heading) ? heading : 0,
        accuracy: accuracy ?? 0,
        timestamp: now,
        deviceId,
      });

      if (!moving && lastMovedAt.current > 0 && now - lastMovedAt.current > 30_000) {
        void tracking.sendHeartbeat({ vehicleId, tripId, driverId });
      }
    },
    [vehicleId, tripId, driverId, deviceId, intervalSec, push]
  );

  const acquireWakeLock = useCallback(async () => {
    try {
      const wl = (
        navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> };
        }
      ).wakeLock;
      if (wl) wakeLock.current = await wl.request("screen");
    } catch {
      /* wake lock unavailable — driver must keep the screen on manually */
    }
  }, []);

  const startWatch = useCallback(() => {
    if (watchId.current != null || !ready) return;
    void acquireWakeLock();
    lastMovedAt.current = Date.now();
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 }
    );
    setActive(true);
    dispatch(trackingPausedSet(false));
  }, [ready, acquireWakeLock, onPosition, dispatch]);

  const stopWatch = useCallback(
    (paused: boolean) => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
      setActive(false);
      dispatch(trackingPausedSet(paused));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!ready) return;
    if (document.visibilityState === "visible") startWatch();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startWatch();
        void flush();
      } else {
        stopWatch(true);
      }
    };
    const onOnline = () => void flush();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onOnline);
      stopWatch(false);
    };
  }, [ready, startWatch, stopWatch, flush]);

  return {
    supported,
    active,
    trackingPaused,
    pendingFixes,
    lastFixAt,
    error,
    syncNow: flush,
  };
};
