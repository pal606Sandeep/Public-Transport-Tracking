"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { homePathForRole } from "@/lib/auth/redirect";
import { FullScreenLoader } from "@/components/ui/Spinner";

/** Root redirector — sends the visitor to their area (or /login). */
export default function Index() {
  const router = useRouter();
  const { status, role } = useSession();

  useEffect(() => {
    if (status === "idle" || status === "loading") return;
    router.replace(
      status === "unauthenticated" ? "/login" : homePathForRole(role)
    );
  }, [status, role, router]);

  return <FullScreenLoader />;
}
