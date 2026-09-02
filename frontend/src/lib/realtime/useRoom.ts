"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { getSocket, subscribe, unsubscribe, type SubscribeTarget } from "./socket";
import { RT_EVENTS, applyRtEvent, type RtEvent } from "./events";

/**
 * Subscribe to a realtime room for the lifetime of the component. Events for the
 * subscribed vehicle/route/trip are folded into the `liveVehicles` slice.
 * Re-subscribes automatically on socket reconnect.
 */
export function useRoom(
  target: SubscribeTarget | null,
  opts: { enabled?: boolean } = {}
): void {
  const dispatch = useAppDispatch();
  const enabled = opts.enabled ?? true;
  const key = target ? JSON.stringify(target) : "";

  useEffect(() => {
    if (!enabled || !key) return;
    const t = JSON.parse(key) as SubscribeTarget;
    const socket = getSocket();

    const handlers = RT_EVENTS.map((event) => {
      const fn = (raw: unknown) => applyRtEvent(dispatch, event as RtEvent, raw);
      socket.on(event, fn);
      return [event, fn] as const;
    });

    const onConnect = () => void subscribe(t);
    socket.on("connect", onConnect);
    void subscribe(t);

    return () => {
      socket.off("connect", onConnect);
      for (const [event, fn] of handlers) socket.off(event, fn);
      void unsubscribe(t);
    };
  }, [dispatch, key, enabled]);
}
