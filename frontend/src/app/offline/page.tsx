import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — Transit" };

/**
 * Served by the service worker when a navigation is attempted with no network
 * and no cached copy of the target page. Deliberately static and dependency-free
 * so it works from the precache.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-3 px-8 text-center">
      <div
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-full bg-muted text-2xl"
      >
        ⚡
      </div>
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        This screen hasn&apos;t been saved for offline use yet. Your last-viewed
        routes and stops still work, and anything you submit is queued and sent
        automatically when you reconnect.
      </p>
      <a
        href="/map"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Go to the map
      </a>
    </main>
  );
}
