"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  sessionEstablished,
  sessionCleared,
  sessionLoading,
} from "@/store/slices/session.slice";
import { bootstrapSession } from "../services/auth.service";

/** Runs once on load: rehydrate the session from the refresh cookie. */
export function useBootstrap(): { ready: boolean } {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    dispatch(sessionLoading());
    bootstrapSession()
      .then((user) => {
        if (user) dispatch(sessionEstablished({ user }));
        else dispatch(sessionCleared());
      })
      .catch(() => dispatch(sessionCleared()))
      .finally(() => setReady(true));
  }, [dispatch]);

  return { ready };
}
