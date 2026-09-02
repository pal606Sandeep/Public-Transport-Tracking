"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sidebarToggled } from "@/store/slices/ui.slice";
import { useLogout } from "@/modules/auth/hooks/useAuth";
import { ROLE_LABEL } from "@/constants/roles";
import { Button } from "@/components/ui";

export function Topbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);
  const logout = useLogout();

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-surface px-4">
      <button
        type="button"
        onClick={() => dispatch(sidebarToggled())}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
        aria-label="Toggle sidebar"
      >
        <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium">{user?.name || user?.email}</p>
          <p className="text-xs text-muted-foreground">
            {user ? ROLE_LABEL[user.role] ?? user.role : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={logout.isPending}
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
