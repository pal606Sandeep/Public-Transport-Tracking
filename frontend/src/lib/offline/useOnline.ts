"use client";

import { useEffect, useState } from "react";

/**
 * `navigator.onLine` as reactive state. Starts optimistic (`true`) so the first
 * server render and hydration agree; corrects on mount and on every transition.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
