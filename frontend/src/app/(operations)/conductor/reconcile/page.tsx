"use client";

import { PageHeader } from "@/components/ui";
import { RequireActiveTrip } from "@/modules/conductor/components/RequireActiveTrip";
import { ReconciliationForm } from "@/modules/conductor/components/ReconciliationForm";

export default function ConductorReconcilePage() {
  return (
    <>
      <PageHeader title="End-of-trip reconciliation" back />
      <RequireActiveTrip>
        {(trip) => <ReconciliationForm tripId={trip._id} />}
      </RequireActiveTrip>
    </>
  );
}
