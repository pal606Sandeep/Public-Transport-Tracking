"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Alert } from "@/components/ui";
import { AssignmentCard } from "@/modules/driver/components/AssignmentCard";
import { AttendancePanel } from "@/modules/driver/components/AttendancePanel";
import { useActiveTrip } from "@/modules/driver/hooks/useActiveTrip";

export default function DriverHomePage() {
  const { data: activeTrip } = useActiveTrip();

  return (
    <>
      <AppHeader title="Driver" />
      <main className="flex flex-col gap-4 p-4">
        {activeTrip && (
          <Link href="/driver/trip">
            <Alert tone="info">
              You have a trip in progress ({activeTrip.status.toLowerCase()}). Tap
              to resume →
            </Alert>
          </Link>
        )}

        <AssignmentCard />
        <AttendancePanel />

        <Link
          href="/driver/performance"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          View my performance
        </Link>
      </main>
    </>
  );
}
