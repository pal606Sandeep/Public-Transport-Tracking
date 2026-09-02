"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return <FullScreenLoader />;
  return <>{children}</>;
}
