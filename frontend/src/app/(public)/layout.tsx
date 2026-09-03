"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { homePathForRole } from "@/lib/auth/redirect";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, role } = useSession();

  useEffect(() => {
    // Only bounce a real signed-in user. Guests may still visit /login or
    // /register to upgrade their session.
    if (status === "authenticated") {
      router.replace(homePathForRole(role));
    }
  }, [status, role, router]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12"
    >
      {children}
    </main>
  );
}
