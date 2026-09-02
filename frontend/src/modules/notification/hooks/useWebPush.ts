"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { errorMessage } from "@/lib/error/apiError";
import { registerPush, removePush } from "../services/notification.service";

const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
};

/**
 * Web-Push subscription lifecycle. Requires a registered service worker
 * (`/sw.js`) and a server-side VAPID public key (`config.vapidPublicKey`).
 */
export const useWebPush = () => {
  const vapidKey = useAppSelector((s) => s.config.value?.vapidPublicKey ?? "");

  const capable =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const supported = capable && Boolean(vapidKey);

  const [permission, setPermission] = useState<NotificationPermission>(
    capable ? Notification.permission : "denied"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!capable) return;
    let alive = true;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription() ?? null)
      .then((sub) => {
        if (alive) setSubscribed(Boolean(sub));
      })
      .catch(() => {
        if (alive) setSubscribed(false);
      });
    return () => {
      alive = false;
    };
  }, [capable]);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Notification permission was not granted.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Malformed push subscription");
      }
      await registerPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [supported, vapidKey]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePush(sub.endpoint).catch(() => undefined);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    capable,
    hasVapidKey: Boolean(vapidKey),
    permission,
    subscribed,
    busy,
    error,
    subscribe,
    unsubscribe,
  };
};
