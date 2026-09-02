"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui";

export default function AdminIndex() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return <FullScreenLoader />;
}
