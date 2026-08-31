"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@/components/ui";
import { useSession, useLogout } from "@/modules/auth/hooks/useAuth";
import { PreferencesForm } from "@/modules/passenger/components/PreferencesForm";
import { SavedLocationList } from "@/modules/passenger/components/SavedLocationList";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isGuest } = useSession();
  const logout = useLogout();

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace("/login");
  };

  return (
    <>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-6 p-4">
        <div className="rounded-[var(--radius-app)] border p-4">
          <p className="text-sm font-medium">
            {isGuest ? "Browsing as guest" : user?.name || user?.email}
          </p>
          {!isGuest && user?.email && (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          )}
          {isGuest && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => router.push("/register")}
            >
              Create an account
            </Button>
          )}
        </div>

        {!isGuest && (
          <>
            <PreferencesForm />
            <SavedLocationList />
          </>
        )}

        <Button
          variant="secondary"
          fullWidth
          loading={logout.isPending}
          onClick={signOut}
        >
          {isGuest ? "Exit guest session" : "Sign out"}
        </Button>
      </div>
    </>
  );
}
