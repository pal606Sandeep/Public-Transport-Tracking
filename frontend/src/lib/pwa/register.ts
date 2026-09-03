/**
 * Service-worker registration. Called once from <PwaManager> on the client.
 * Kept out of React so it can also be imported by tests / scripts.
 */

let registered: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registered) return registered;

  registered = (async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      // Next dev serves /sw.js fine, but an SW caching HMR chunks is a nuisance.
      process.env.NODE_ENV !== "production"
    ) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      // Pick up a new worker version without a hard reload.
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (
            next.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            next.postMessage("SKIP_WAITING");
          }
        });
      });
      return reg;
    } catch {
      return null;
    }
  })();

  return registered;
}
