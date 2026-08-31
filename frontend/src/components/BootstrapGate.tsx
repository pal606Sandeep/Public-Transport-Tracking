"use client";

import type { ReactNode } from "react";
import { useBootstrap } from "@/modules/config/hooks/useBootstrap";
import { useAppSelector } from "@/store/hooks";
import { APP_VERSION } from "@/config/env.config";
import { isVersionBelow } from "@/lib/auth/redirect";
import { FullScreenLoader } from "@/components/ui/Spinner";

/**
 * App-wide gate: runs the one-time bootstrap (config + session restore), shows a
 * loader until it settles, and blocks the app if the client is below the
 * backend's minimum supported version.
 */
export function BootstrapGate({ children }: { children: ReactNode }) {
  const { ready, configError } = useBootstrap();
  const config = useAppSelector((s) => s.config.value);

  if (!ready) return <FullScreenLoader />;

  if (
    config?.minSupportedAppVersion &&
    isVersionBelow(APP_VERSION, config.minSupportedAppVersion)
  ) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold">Update required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This version of the app is no longer supported. Reload the page to get
          the latest.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload
        </button>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold">Can&apos;t reach the server</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{configError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
