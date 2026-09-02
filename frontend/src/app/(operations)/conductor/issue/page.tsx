"use client";

import { PageHeader } from "@/components/ui";
import { RequireActiveTrip } from "@/modules/conductor/components/RequireActiveTrip";
import { IssueTicketForm } from "@/modules/conductor/components/IssueTicketForm";

export default function ConductorIssuePage() {
  return (
    <>
      <PageHeader title="Issue ticket" back />
      <RequireActiveTrip>
        {(trip) => <IssueTicketForm trip={trip} />}
      </RequireActiveTrip>
    </>
  );
}
