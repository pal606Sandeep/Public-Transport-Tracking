"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Card } from "@/components/ui";
import { useSession, useLogout } from "@/modules/auth/hooks/useAuth";
import { PreferencesForm } from "@/modules/passenger/components/PreferencesForm";
import { SavedLocationList } from "@/modules/passenger/components/SavedLocationList";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

function MenuRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="text-muted-foreground"
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

const ic = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, isGuest } = useSession();
  const logout = useLogout();

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace("/login");
  };

  const name = isGuest ? "Guest" : user?.name || user?.email || "You";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-5 p-4">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-[18px] font-bold text-accent-foreground">
            {initials || "•"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold tracking-[-0.01em]">
              {isGuest ? "Browsing as guest" : name}
            </p>
            {!isGuest && user?.email && (
              <p className="truncate text-[13px] text-muted-foreground">
                {user.email}
              </p>
            )}
            {isGuest && (
              <Button
                size="sm"
                pill
                className="mt-2"
                onClick={() => router.push("/register")}
              >
                Create an account
              </Button>
            )}
          </div>
        </Card>

        <Card className="divide-y overflow-hidden">
          {!isGuest && (
            <MenuRow
              href="/notifications"
              label="Notifications"
              icon={ic("M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0")}
            />
          )}
          {!isGuest && (
            <MenuRow
              href="/tickets"
              label="Tickets & passes"
              icon={ic(
                "M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8zM12 7v10"
              )}
            />
          )}
          <MenuRow
            href="/alerts"
            label="Service alerts"
            icon={ic(
              "M12 9v4m0 4h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
            )}
          />
          {!isGuest && (
            <MenuRow
              href="/complaints"
              label="Complaints"
              icon={ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z")}
            />
          )}
          {!isGuest && (
            <MenuRow
              href="/lost-found"
              label="Lost & found"
              icon={ic(
                "M11 4a7 7 0 105.2 11.7L21 21M11 4a7 7 0 017 7"
              )}
            />
          )}
        </Card>

        <LocaleSwitcher />

        {!isGuest && (
          <>
            <PreferencesForm />
            <SavedLocationList />
          </>
        )}

        <Button
          variant="ghost"
          size="lg"
          fullWidth
          className="text-destructive"
          loading={logout.isPending}
          onClick={signOut}
        >
          {isGuest ? "Exit guest session" : "Sign out"}
        </Button>
      </div>
    </>
  );
}
