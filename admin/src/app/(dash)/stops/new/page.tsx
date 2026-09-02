"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { StopForm } from "@/modules/stop/components/StopForm";
import { useCreateStop } from "@/modules/stop/hooks/useStops";

export default function NewStopPage() {
  const router = useRouter();
  const create = useCreateStop();

  return (
    <>
      <PageHeader title="Add stop" backHref="/stops" />
      <StopForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (stop) => router.replace(`/stops/${stop._id}`),
          })
        }
      />
    </>
  );
}
