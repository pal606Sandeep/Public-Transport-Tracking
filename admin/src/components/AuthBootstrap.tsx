"use client";

import type { ReactNode } from "react";
import { useBootstrap } from "@/modules/auth/hooks/useBootstrap";
import { FullScreenLoader } from "@/components/ui";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { ready } = useBootstrap();
  if (!ready) return <FullScreenLoader label="Starting…" />;
  return <>{children}</>;
}
