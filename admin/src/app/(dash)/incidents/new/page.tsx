"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { IncidentForm } from "@/modules/incident/components/IncidentForm";
import { useCreateIncident } from "@/modules/incident/hooks/useIncidents";

export default function NewIncidentPage() {
  const router = useRouter();
  const create = useCreateIncident();

  return (
    <>
      <PageHeader title="Log incident" backHref="/incidents" />
      <IncidentForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (incident) =>
              router.replace(`/incidents/${incident._id}`),
          })
        }
      />
    </>
  );
}
