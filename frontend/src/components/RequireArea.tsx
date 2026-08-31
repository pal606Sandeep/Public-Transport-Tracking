"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { roleArea, type AppArea } from "@/constants/roles";
import { homePathForRole } from "@/lib/auth/redirect";
import { FullScreenLoader } from "@/components/ui/Spinner";

/**
 * Client route guard for an area layout. Redirects to /login when signed out,
 * or to the caller's own home when they don't belong to `area`.
 */
export function RequireArea({
  area,
  children,
}: {
  area: AppArea;
  children: ReactNode;
}) {
  const router = useRouter();
  const { status, role } = useSession();
  const settled = status !== "idle" && status !== "loading";
  const allowed = settled && roleArea(role) === area;

  useEffect(() => {
    if (!settled) return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (roleArea(role) !== area) {
      router.replace(homePathForRole(role));
    }
  }, [settled, status, role, area, router]);

  if (!allowed) return <FullScreenLoader />;
  return <>{children}</>;
}
