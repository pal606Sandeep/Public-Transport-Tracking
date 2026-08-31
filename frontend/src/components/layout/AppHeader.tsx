"use client";

import { useRouter } from "next/navigation";
import { useSession, useLogout } from "@/modules/auth/hooks/useAuth";
import { Button } from "@/components/ui";

export function AppHeader({ title }: { title: string }) {
  const router = useRouter();
  const { user, isGuest } = useSession();
  const logout = useLogout();

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace("/login");
  };

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <span className="text-xs text-muted-foreground">
          {isGuest ? "Guest" : user?.name || user?.email}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={signOut}
        loading={logout.isPending}
      >
        {isGuest ? "Exit" : "Sign out"}
      </Button>
    </header>
  );
}
