"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FullScreenLoader,
  Alert,
  Badge,
  Button,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { ServiceAlertForm } from "@/modules/serviceAlert/components/ServiceAlertForm";
import {
  useServiceAlert,
  useServiceAlertActions,
  useDeleteServiceAlert,
} from "@/modules/serviceAlert/useServiceAlerts";
import { STATUS_TONE } from "@/modules/serviceAlert/serviceAlert.types";

export default function ServiceAlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: alert, isLoading, error } = useServiceAlert(id);
  const actions = useServiceAlertActions(id);
  const del = useDeleteServiceAlert();

  if (isLoading) return <FullScreenLoader />;
  if (error || !alert)
    return (
      <>
        <PageHeader title="Service alert" backHref="/service-alerts" />
        <Alert tone="error">{errorMessage(error) || "Alert not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={alert.title}
        description={`${alert.type} · ${alert.severity}`}
        backHref="/service-alerts"
        action={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[alert.status]}>{alert.status}</Badge>
            {alert.status === "DRAFT" && (
              <Button
                size="sm"
                loading={actions.publish.isPending}
                onClick={() => actions.publish.mutate()}
              >
                Publish
              </Button>
            )}
            {alert.status === "PUBLISHED" && (
              <Button
                size="sm"
                variant="outline"
                loading={actions.cancel.isPending}
                onClick={() => actions.cancel.mutate()}
              >
                Cancel
              </Button>
            )}
          </div>
        }
      />

      {(actions.publish.isError || actions.cancel.isError) && (
        <Alert tone="error" className="mb-4">
          {errorMessage(actions.publish.error ?? actions.cancel.error)}
        </Alert>
      )}

      <ServiceAlertForm
        alert={alert}
        submitting={actions.update.isPending}
        error={actions.update.error}
        submitLabel="Save changes"
        onSubmit={(input) =>
          actions.update.mutate({
            title: input.title,
            message: input.message,
            severity: input.severity,
            type: input.type,
            targeting: input.targeting,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          })
        }
      />

      <div className="mt-8 border-t pt-4">
        <Button
          variant="destructive"
          size="sm"
          loading={del.isPending}
          onClick={async () => {
            await del.mutateAsync(alert._id);
            router.push("/service-alerts");
          }}
        >
          Delete alert
        </Button>
      </div>
    </>
  );
}
