"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useGuest } from "../hooks/useAuth";
import { homePathForRole } from "@/lib/auth/redirect";

export function GuestButton() {
  const router = useRouter();
  const guest = useGuest();

  const start = async () => {
    try {
      const user = await guest.mutateAsync();
      router.replace(homePathForRole(user.role));
    } catch {
      /* surfaced by the page-level error boundary if it throws unexpectedly */
    }
  };

  return (
    <Button
      variant="secondary"
      fullWidth
      loading={guest.isPending}
      onClick={start}
    >
      Continue as guest
    </Button>
  );
}
