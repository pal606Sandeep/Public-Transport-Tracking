"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { configLoaded } from "@/store/slices/config.slice";
import {
  sessionLoading,
  sessionEstablished,
  sessionCleared,
} from "@/store/slices/session.slice";
import { fetchClientConfig } from "../services/config.service";
import {
  bootstrapSession,
  ensureGuestToken,
} from "@/modules/auth/services/auth.service";
import type { AuthUser } from "@/types";

/**
 * One-time app bootstrap.
 *
 * The backend guards `GET /config` (and every public read) with `guestOrAuth`,
 * which rejects requests that carry no token at all. So the order is:
 *   1. restore a real session from the refresh cookie, else
 *   2. mint a read-only guest token (kept in the token store, status stays
 *      "unauthenticated" — the visitor hasn't *chosen* guest mode yet)
 *   3. only then load /config
 */
export const useBootstrap = (): {
  ready: boolean;
  configError: string | null;
} => {
  const dispatch = useAppDispatch();
  const ran = useRef(false);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      dispatch(sessionLoading());

      let user: AuthUser | null = null;
      try {
        user = await bootstrapSession();
      } catch {
        user = null;
      }

      if (user) {
        dispatch(sessionEstablished({ user }));
      } else {
        // no real session — get a guest token so public endpoints work,
        // but leave the UI as "unauthenticated" until the user picks a path.
        try {
          await ensureGuestToken();
        } catch {
          /* offline / server down — handled by the configError branch below */
        }
        dispatch(sessionCleared());
      }

      try {
        dispatch(configLoaded(await fetchClientConfig()));
      } catch (e) {
        setConfigError((e as Error).message);
      }

      setReady(true);
    })();
  }, [dispatch]);

  return { ready, configError };
};
