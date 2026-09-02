"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ConductorForm } from "@/modules/conductor/components/ConductorForm";
import { useCreateConductor } from "@/modules/conductor/hooks/useConductors";

export default function NewConductorPage() {
  const router = useRouter();
  const create = useCreateConductor();

  return (
    <>
      <PageHeader
        title="Add conductor"
        description="Link a registered CONDUCTOR user, then set assignment on the next screen."
        backHref="/conductors"
      />
      <ConductorForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (conductor) =>
              router.replace(`/conductors/${conductor._id}`),
          })
        }
      />
    </>
  );
}
