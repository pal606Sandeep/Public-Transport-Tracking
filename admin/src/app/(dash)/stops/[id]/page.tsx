"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FullScreenLoader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { StopForm } from "@/modules/stop/components/StopForm";
import { useStop, useUpdateStop } from "@/modules/stop/hooks/useStops";

export default function EditStopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: stop, isLoading, error } = useStop(id);
  const update = useUpdateStop(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !stop)
    return (
      <>
        <PageHeader title="Stop" backHref="/stops" />
        <Alert tone="error">{errorMessage(error) || "Stop not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={stop.name}
        description="Edit stop"
        backHref="/stops"
      />
      <StopForm
        stop={stop}
        submitting={update.isPending}
        error={update.error}
        onSubmit={(input) =>
          update.mutate(input, {
            onSuccess: () => router.push("/stops"),
          })
        }
      />
    </>
  );
}
